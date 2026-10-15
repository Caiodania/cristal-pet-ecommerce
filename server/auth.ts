// Login do painel do dono. Sem conta de usuário: uma senha (variável de
// ambiente ADMIN_PASSWORD) troca por um cookie de sessão assinado (HMAC) e
// com validade. O cookie é HttpOnly (o JavaScript do site não lê), SameSite=
// Strict (outros sites não conseguem usá-lo) e Secure em https.
//
// Quando houver mais de uma pessoa usando o painel, troque por Supabase Auth:
// só este arquivo muda (requireAdmin).

import type { Ctx } from "./context";
import { safeEqual, signToken, verifyToken } from "./crypto";
import { HttpError, parseCookies, serializeCookie } from "./http";

const COOKIE = "cp_admin";

const isHttps = (req: Request) => new URL(req.url).protocol === "https:";

export function checkPassword(ctx: Ctx, password: unknown): boolean {
  if (!ctx.config.adminPassword) {
    throw new HttpError(503, "admin_disabled", "O painel não está configurado (defina ADMIN_PASSWORD).");
  }
  return typeof password === "string" && safeEqual(password, ctx.config.adminPassword);
}

export function sessionCookie(ctx: Ctx, req: Request): string {
  const ttl = ctx.config.sessionTtlSeconds;
  const token = signToken(
    { sub: "admin", exp: Math.floor(ctx.now().getTime() / 1000) + ttl },
    ctx.config.sessionSecret,
  );
  return serializeCookie(COOKIE, token, { maxAge: ttl, secure: ctx.config.isProd || isHttps(req) });
}

export function clearCookie(ctx: Ctx, req: Request): string {
  return serializeCookie(COOKIE, "", { maxAge: 0, secure: ctx.config.isProd || isHttps(req) });
}

export function isAdmin(ctx: Ctx, req: Request): boolean {
  const token = parseCookies(req.headers.get("cookie"))[COOKIE];
  if (!token) return false;
  return verifyToken(token, ctx.config.sessionSecret, ctx.now().getTime() / 1000)?.sub === "admin";
}

export function requireAdmin(ctx: Ctx, req: Request): void {
  if (!isAdmin(ctx, req)) throw new HttpError(401, "unauthorized", "Entre no painel para continuar.");
}

/**
 * Pedidos que mudam dados vindos com cookie devem sair do próprio site. O
 * SameSite=Strict já barra o caso comum; isto fecha o resto.
 */
export function assertSameOrigin(ctx: Ctx, req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return; // chamadas sem Origin não vêm de navegador de terceiros
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "forbidden", "Origem inválida.");
  }
  if (originHost !== host && !ctx.config.allowedOrigins.includes(origin)) {
    throw new HttpError(403, "forbidden", "Origem não permitida.");
  }
}
