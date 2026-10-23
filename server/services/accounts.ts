// Contas dos clientes: cadastro, login, sessão, recuperação de senha e cota de
// prévias.
//
// Divisão de trabalho:
//   - o provedor de login (accounts/: Supabase Auth ou memória) sabe QUEM a
//     pessoa é: confere a senha, manda e-mail de confirmação e de recuperação;
//   - aqui a sessão é NOSSA: um token aleatório num cookie HttpOnly, com só o
//     hash dele guardado no banco (tabela customer_sessions). Sair, trocar a
//     senha ou excluir a conta derruba a sessão na hora, e os tokens do
//     Supabase nunca chegam ao navegador;
//   - a cota (quantas prévias a conta pode gerar) é contada no banco, não em
//     cookie nem no navegador.

import type { AccountDto, MyOrderDto, QuotaDto, AdminUserDto } from "../../lib/loja/tipos";
import { AuthError, type AuthUser } from "../accounts";
import type { Ctx } from "../context";
import { randomToken, sha256Hex } from "../crypto";
import { HttpError, parseCookies, serializeCookie } from "../http";
import type { ProfileRecord } from "../store/types";
import { verifyTurnstile } from "../turnstile";

const COOKIE = "cp_user";
const DAY_SECONDS = 24 * 60 * 60;

// ───────── Erros do provedor → respostas da API ─────────

const STATUS: Record<AuthError["code"], number> = {
  invalid_credentials: 401,
  email_not_verified: 403,
  email_taken: 409,
  weak_password: 400,
  invalid_email: 400,
  invalid_token: 400,
  rate_limited: 429,
  signup_disabled: 403,
  provider_error: 502,
};

async function viaAuth<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action();
  } catch (error) {
    if (error instanceof AuthError) throw new HttpError(STATUS[error.code], error.code, error.message);
    throw error;
  }
}

// ───────── DTOs ─────────

export const accountDto = (profile: ProfileRecord): AccountDto => ({
  id: profile.id,
  email: profile.email,
  name: profile.name,
  // só abrimos sessão para e-mail confirmado
  emailVerified: true,
});

/** Quantas prévias a conta já usou e quantas ainda pode gerar. */
export async function quotaOf(ctx: Ctx, profile: ProfileRecord): Promise<QuotaDto> {
  const used = await ctx.store.countUserPreviews(profile.id);
  const limit = ctx.config.previewsPerAccount + profile.bonusPreviews;
  return { limit, used, remaining: Math.max(0, limit - used) };
}

// ───────── Cookie de sessão ─────────

const isHttps = (req: Request) => new URL(req.url).protocol === "https:";

export function userSessionCookie(ctx: Ctx, req: Request, token: string): string {
  return serializeCookie(COOKIE, token, {
    maxAge: ctx.config.userSessionTtlDays * DAY_SECONDS,
    secure: ctx.config.isProd || isHttps(req),
  });
}

export function clearUserCookie(ctx: Ctx, req: Request): string {
  return serializeCookie(COOKIE, "", { maxAge: 0, secure: ctx.config.isProd || isHttps(req) });
}

/** Abre a sessão: garante a conta no banco e devolve o token para o cookie. */
async function openSession(ctx: Ctx, user: AuthUser): Promise<{ token: string; profile: ProfileRecord }> {
  const profile = await ctx.store.upsertProfile({ id: user.id, email: user.email, name: user.name });
  await ctx.store.touchLogin(profile.id);
  const token = randomToken(32);
  const now = ctx.now();
  await ctx.store.createSession({
    tokenHash: sha256Hex(token),
    userId: profile.id,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ctx.config.userSessionTtlDays * DAY_SECONDS * 1000).toISOString(),
  });
  return { token, profile: (await ctx.store.getProfile(profile.id)) ?? profile };
}

// ───────── Quem está logado ─────────

/** A conta da sessão do cookie, ou null (sem cookie, vencido ou apagado). */
export async function currentUser(ctx: Ctx, req: Request): Promise<ProfileRecord | null> {
  const token = parseCookies(req.headers.get("cookie"))[COOKIE];
  if (!token) return null;
  const session = await ctx.store.getSession(sha256Hex(token));
  if (!session || new Date(session.expiresAt) <= ctx.now()) return null;
  return ctx.store.getProfile(session.userId);
}

export async function requireUser(ctx: Ctx, req: Request): Promise<ProfileRecord> {
  const user = await currentUser(ctx, req);
  if (!user) {
    throw new HttpError(401, "login_required", "Faça login ou crie a sua conta para continuar.");
  }
  return user;
}

// ───────── Cadastro, login e saída ─────────

export type SessionResult = { token: string; profile: ProfileRecord; quota: QuotaDto };

async function withQuota(ctx: Ctx, opened: { token: string; profile: ProfileRecord }): Promise<SessionResult> {
  return { ...opened, quota: await quotaOf(ctx, opened.profile) };
}

export async function register(
  ctx: Ctx,
  input: { name: string; email: string; password: string; ip: string; turnstileToken?: string },
): Promise<{ needsVerification: true } | ({ needsVerification: false } & SessionResult)> {
  await verifyTurnstile(ctx, input.turnstileToken, input.ip);
  const { user, needsVerification } = await viaAuth(() =>
    ctx.auth.signUp({
      email: input.email,
      password: input.password,
      name: input.name,
      redirectTo: `${ctx.config.siteUrl}/confirmar`,
    }),
  );
  if (needsVerification || !user) return { needsVerification: true };
  return { needsVerification: false, ...(await withQuota(ctx, await openSession(ctx, user))) };
}

export async function login(ctx: Ctx, input: { email: string; password: string }): Promise<SessionResult> {
  const user = await viaAuth(() => ctx.auth.signIn(input));
  return withQuota(ctx, await openSession(ctx, user));
}

export async function logout(ctx: Ctx, req: Request): Promise<void> {
  const token = parseCookies(req.headers.get("cookie"))[COOKIE];
  if (token) await ctx.store.deleteSession(sha256Hex(token));
}

// ───────── Confirmação de e-mail e recuperação de senha ─────────

/** O link do e-mail de confirmação (ou o retorno do Google) traz um token: vira login. */
export async function confirm(ctx: Ctx, accessToken: string): Promise<SessionResult> {
  const user = await viaAuth(() => ctx.auth.userFromAccessToken(accessToken));
  return withQuota(ctx, await openSession(ctx, user));
}

export async function forgotPassword(ctx: Ctx, input: { email: string; ip: string; turnstileToken?: string }): Promise<void> {
  await verifyTurnstile(ctx, input.turnstileToken, input.ip);
  await viaAuth(() => ctx.auth.recover({ email: input.email, redirectTo: `${ctx.config.siteUrl}/redefinir-senha` }));
}

export async function resendConfirmation(ctx: Ctx, input: { email: string }): Promise<void> {
  await viaAuth(() => ctx.auth.resend({ email: input.email, redirectTo: `${ctx.config.siteUrl}/confirmar` }));
}

/** Define a nova senha com o token do e-mail, derruba as outras sessões e já entra. */
export async function resetPassword(ctx: Ctx, input: { accessToken: string; password: string }): Promise<SessionResult> {
  const user = await viaAuth(() => ctx.auth.updatePassword(input.accessToken, input.password));
  const profile = await ctx.store.upsertProfile({ id: user.id, email: user.email, name: user.name });
  await ctx.store.deleteUserSessions(profile.id); // quem trocou a senha por suspeita não pode ter sessão antiga viva
  return withQuota(ctx, await openSession(ctx, user));
}

// ───────── Pedidos da conta ─────────

export async function myOrders(ctx: Ctx, user: ProfileRecord): Promise<MyOrderDto[]> {
  const orders = await ctx.store.listOrdersByUser(user.id);
  return orders.map((o) => ({
    code: o.code,
    token: o.viewToken,
    status: o.status,
    createdAt: o.createdAt,
    itemCount: o.items.length,
    estimateCents: o.estimateCents,
  }));
}

// ───────── Dono: contas e prévias extras ─────────

export async function listUsers(
  ctx: Ctx,
  filter: { q?: string; page: number },
): Promise<{ users: AdminUserDto[]; total: number; pageSize: number }> {
  const pageSize = 20;
  const { rows, total } = await ctx.store.listProfiles({
    q: filter.q,
    limit: pageSize,
    offset: (filter.page - 1) * pageSize,
  });
  return {
    users: rows.map((p) => ({
      id: p.id,
      email: p.email,
      name: p.name,
      createdAt: p.createdAt,
      lastLoginAt: p.lastLoginAt,
      previewsUsed: p.previewsUsed,
      previewsLimit: ctx.config.previewsPerAccount + p.bonusPreviews,
      bonusPreviews: p.bonusPreviews,
      orderCount: p.orderCount,
    })),
    total,
    pageSize,
  };
}

export async function grantPreviews(ctx: Ctx, userId: string, bonus: number): Promise<AdminUserDto> {
  if (!(await ctx.store.getProfile(userId))) throw new HttpError(404, "not_found", "Conta não encontrada.");
  const profile = await ctx.store.setBonusPreviews(userId, bonus);
  const used = await ctx.store.countUserPreviews(userId);
  const orders = (await ctx.store.listOrdersByUser(userId)).length;
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    createdAt: profile.createdAt,
    lastLoginAt: profile.lastLoginAt,
    previewsUsed: used,
    previewsLimit: ctx.config.previewsPerAccount + profile.bonusPreviews,
    bonusPreviews: profile.bonusPreviews,
    orderCount: orders,
  };
}
