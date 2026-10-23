// Roteador da API. Uma função só atende `/api/*` (netlify/functions/api.ts) e
// aqui as rotas são casadas por método + caminho. Cada rota é fina: valida a
// entrada, chama um serviço e devolve JSON. As regras ficam em services/.

import {
  ORDER_STATUSES,
  type AuthResultDto,
  type ConfigDto,
  type OrderStatus,
  type SessionDto,
} from "../lib/loja/tipos";
import { catalog } from "../content/estatua";
import { assertSameOrigin, checkPassword, clearCookie, isAdmin, requireAdmin, sessionCookie } from "./auth";
import { getContext, type Ctx } from "./context";
import { clientIp, errorResponse, HttpError, json, readJson, baseHeaders } from "./http";
import { allow } from "./ratelimit";
import { getModel, startModel } from "./services/model";
import {
  accountDto,
  clearUserCookie,
  confirm,
  currentUser,
  forgotPassword,
  grantPreviews,
  listUsers,
  login,
  logout,
  myOrders,
  quotaOf,
  register,
  requireUser,
  resendConfirmation,
  resetPassword,
  userSessionCookie,
  type SessionResult,
} from "./services/accounts";
import {
  adminStats,
  createOrder,
  getOrderAdmin,
  getOrderForCustomer,
  listOrders,
  updateOrderAdmin,
} from "./services/orders";
import {
  createPreview,
  getPreview,
  regeneratePreview,
  startPreview,
  uploadPhoto,
} from "./services/previews";
import {
  cleanText,
  parseAccountName,
  parseCustomer,
  parseEmail,
  parseItemConfig,
  parsePassword,
  requireRecord,
} from "./validate";

type Match = { ctx: Ctx; req: Request; url: URL; params: Record<string, string>; ip: string };
type Route = {
  method: string;
  pattern: RegExp;
  /** Exige o cookie do dono. */
  admin?: boolean;
  handler: (m: Match) => Promise<Response>;
};

const HOUR = 60 * 60 * 1000;
const QUARTER_HOUR = 15 * 60 * 1000;

function limit(key: string, max: number, windowMs: number, message?: string) {
  if (!allow(key, max, windowMs)) {
    throw new HttpError(429, "rate_limited", message ?? "Muitas tentativas. Aguarde um pouco e tente de novo.");
  }
}

const optionalString = (v: unknown) => (typeof v === "string" ? v : undefined);

/** Resposta de quem acabou de entrar: dados da conta e a cota, com o cookie da sessão. */
function signedIn(ctx: Ctx, req: Request, result: SessionResult, status = 200): Response {
  const body: AuthResultDto = { user: accountDto(result.profile), quota: result.quota, needsVerification: false };
  return json(body, { status, headers: { "Set-Cookie": userSessionCookie(ctx, req, result.token) } });
}

/** O token que o Supabase põe no link do e-mail (letras, números e _-. : o tamanho varia). */
function parseAccessToken(value: unknown): string {
  if (typeof value !== "string" || value.length < 16 || value.length > 4096 || /\s/.test(value)) {
    throw new HttpError(400, "invalid_token", "Este link é inválido ou venceu. Peça um novo.");
  }
  return value;
}

const routes: Route[] = [
  // ───────── Público ─────────
  {
    method: "GET",
    pattern: /^\/api\/health$/,
    handler: async () => json({ ok: true }),
  },
  {
    method: "GET",
    pattern: /^\/api\/config$/,
    handler: async ({ ctx }) => {
      const { image, model } = ctx.providers;
      const body: ConfigDto = {
        mode: image.mode === "mock" || model.mode === "mock" ? "demo" : "live",
        imageProvider: { name: image.name, mode: image.mode },
        modelProvider: { name: model.name, mode: model.mode },
        previewsPerAccount: ctx.config.previewsPerAccount,
        turnstileSiteKey: ctx.config.turnstileSiteKey,
        googleLoginUrl:
          ctx.config.authGoogle && ctx.config.supabaseUrl
            ? `${ctx.config.supabaseUrl.replace(/\/$/, "")}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(`${ctx.config.siteUrl}/confirmar`)}`
            : undefined,
        catalogVersion: catalog.version,
      };
      return json(body);
    },
  },
  // ───────── Conta do cliente ─────────
  {
    method: "POST",
    pattern: /^\/api\/auth\/signup$/,
    handler: async ({ ctx, req, ip }) => {
      limit(`signup:${ip}`, 6, HOUR, "Muitos cadastros desta rede. Tente de novo mais tarde.");
      const body = requireRecord(await readJson(req));
      const result = await register(ctx, {
        name: parseAccountName(body.name),
        email: parseEmail(body.email),
        password: parsePassword(body.password),
        ip,
        turnstileToken: optionalString(body.turnstileToken),
      });
      if (result.needsVerification) {
        const pending: AuthResultDto = { user: null, needsVerification: true };
        return json(pending, { status: 202 });
      }
      return signedIn(ctx, req, result, 201);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/login$/,
    handler: async ({ ctx, req, ip }) => {
      const body = requireRecord(await readJson(req));
      const email = parseEmail(body.email);
      limit(`ulogin:${ip}`, 20, QUARTER_HOUR, "Muitas tentativas de login. Aguarde 15 minutos.");
      limit(`ulogin:${email}`, 8, QUARTER_HOUR, "Muitas tentativas de login nesta conta. Aguarde 15 minutos.");
      // senha vazia ou curta cai aqui como "e-mail ou senha incorretos", sem ensinar regra de senha
      const password = typeof body.password === "string" ? body.password : "";
      return signedIn(ctx, req, await login(ctx, { email, password }));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/logout$/,
    handler: async ({ ctx, req }) => {
      await logout(ctx, req);
      return json({ ok: true }, { headers: { "Set-Cookie": clearUserCookie(ctx, req) } });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/auth\/me$/,
    handler: async ({ ctx, req }) => {
      const user = await currentUser(ctx, req);
      const body: SessionDto = user ? { user: accountDto(user), quota: await quotaOf(ctx, user) } : { user: null };
      return json(body);
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/forgot$/,
    handler: async ({ ctx, req, ip }) => {
      const body = requireRecord(await readJson(req));
      const email = parseEmail(body.email);
      limit(`forgot:${ip}`, 6, HOUR, "Muitos pedidos de recuperação. Tente de novo mais tarde.");
      limit(`forgot:${email}`, 3, HOUR, "Já enviamos o e-mail de recuperação. Aguarde um pouco para pedir outro.");
      await forgotPassword(ctx, { email, ip, turnstileToken: optionalString(body.turnstileToken) });
      // a resposta é a mesma exista ou não conta com este e-mail
      return json({ ok: true }, { status: 202 });
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/resend$/,
    handler: async ({ ctx, req, ip }) => {
      const body = requireRecord(await readJson(req));
      const email = parseEmail(body.email);
      limit(`resend:${ip}`, 6, HOUR, "Muitos pedidos de reenvio. Tente de novo mais tarde.");
      limit(`resend:${email}`, 3, HOUR, "Já reenviamos o e-mail. Aguarde um pouco para pedir outro.");
      await resendConfirmation(ctx, { email });
      return json({ ok: true }, { status: 202 });
    },
  },
  {
    // o link do e-mail de confirmação (ou o retorno do Google) cai numa página do site, que manda o token para cá
    method: "POST",
    pattern: /^\/api\/auth\/confirm$/,
    handler: async ({ ctx, req, ip }) => {
      limit(`confirm:${ip}`, 30, HOUR);
      const body = requireRecord(await readJson(req));
      return signedIn(ctx, req, await confirm(ctx, parseAccessToken(body.accessToken)));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/auth\/reset$/,
    handler: async ({ ctx, req, ip }) => {
      limit(`reset:${ip}`, 10, HOUR);
      const body = requireRecord(await readJson(req));
      const result = await resetPassword(ctx, {
        accessToken: parseAccessToken(body.accessToken),
        password: parsePassword(body.password),
      });
      return signedIn(ctx, req, result);
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/me\/orders$/,
    handler: async ({ ctx, req }) => json({ orders: await myOrders(ctx, await requireUser(ctx, req)) }),
  },

  // ───────── Prévias (exigem conta) ─────────
  {
    method: "POST",
    pattern: /^\/api\/previews$/,
    handler: async ({ ctx, req, ip }) => {
      const user = await requireUser(ctx, req);
      limit(`preview:${ip}`, 30, HOUR);
      const body = requireRecord(await readJson(req));
      const dto = await createPreview(ctx, { user, options: parseItemConfig(body.options), ip });
      return json(dto, { status: 201 });
    },
  },
  {
    method: "PUT",
    pattern: /^\/api\/previews\/(?<id>[\w-]+)\/photo$/,
    handler: async ({ ctx, req, params }) => {
      const user = await requireUser(ctx, req);
      const declared = Number(req.headers.get("content-length") ?? 0);
      if (declared > ctx.config.maxPhotoBytes) {
        throw new HttpError(413, "photo_too_large", "A foto é grande demais. Envie uma de até 5 MB.");
      }
      const bytes = new Uint8Array(await req.arrayBuffer());
      return json(await uploadPhoto(ctx, params.id, bytes, user));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/previews\/(?<id>[\w-]+)\/start$/,
    handler: async ({ ctx, req, params, ip }) => {
      const user = await requireUser(ctx, req);
      limit(`start:${ip}`, 40, HOUR);
      return json(await startPreview(ctx, params.id, user));
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/previews\/(?<id>[\w-]+)\/regenerate$/,
    handler: async ({ ctx, req, params, ip }) => {
      const user = await requireUser(ctx, req);
      limit(`preview:${ip}`, 30, HOUR);
      const body = requireRecord(await readJson(req));
      const dto = await regeneratePreview(ctx, params.id, {
        user,
        ip,
        options: body.options === undefined ? undefined : parseItemConfig(body.options),
      });
      return json(dto, { status: 201 });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/previews\/(?<id>[\w-]+)$/,
    handler: async ({ ctx, req, params }) => json(await getPreview(ctx, params.id, await requireUser(ctx, req))),
  },
  {
    method: "POST",
    pattern: /^\/api\/orders$/,
    handler: async ({ ctx, req, ip }) => {
      const user = await requireUser(ctx, req);
      limit(`order:${ip}`, 10, HOUR);
      const body = requireRecord(await readJson(req));
      if (body.consent !== true) {
        throw new HttpError(400, "consent_required", "Aceite a política de privacidade para enviar o pedido.");
      }
      const previewIds = Array.isArray(body.previewIds) ? body.previewIds.map(String) : [];
      const { order, token } = await createOrder(ctx, {
        user,
        previewIds,
        customer: parseCustomer(body.customer),
      });
      return json({ order, token }, { status: 201 });
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/orders\/(?<code>CP-[A-Za-z0-9]{6})$/i,
    handler: async ({ ctx, url, params, ip }) => {
      limit(`lookup:${ip}`, 120, 10 * 60 * 1000);
      const token = url.searchParams.get("t") ?? "";
      return json(await getOrderForCustomer(ctx, params.code, token));
    },
  },
  {
    // Só a versão em memória (desenvolvimento): com Supabase os links já são do Storage.
    method: "GET",
    pattern: /^\/api\/files\/(?<token>[\w.-]+)$/,
    handler: async ({ ctx, params }) => {
      const response = await ctx.files.serve?.(params.token);
      if (!response) throw new HttpError(404, "not_found", "Arquivo não encontrado ou link expirado.");
      return response;
    },
  },

  // ───────── Painel do dono ─────────
  {
    method: "POST",
    pattern: /^\/api\/admin\/login$/,
    handler: async ({ ctx, req, ip }) => {
      limit(`login:${ip}`, 6, 15 * 60 * 1000, "Muitas tentativas de login. Aguarde 15 minutos.");
      const body = requireRecord(await readJson(req));
      if (!checkPassword(ctx, body.password)) {
        throw new HttpError(401, "invalid_credentials", "Senha incorreta.");
      }
      return json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(ctx, req) } });
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/admin\/logout$/,
    handler: async ({ ctx, req }) => json({ ok: true }, { headers: { "Set-Cookie": clearCookie(ctx, req) } }),
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/me$/,
    handler: async ({ ctx, req }) => json({ admin: isAdmin(ctx, req) }),
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/stats$/,
    admin: true,
    handler: async ({ ctx }) => json(await adminStats(ctx)),
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/users$/,
    admin: true,
    handler: async ({ ctx, url }) => {
      const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
      return json(await listUsers(ctx, { q: cleanText(url.searchParams.get("q"), 60), page }));
    },
  },
  {
    // o dono libera prévias extras para uma conta (soma ao limite padrão)
    method: "PATCH",
    pattern: /^\/api\/admin\/users\/(?<id>[\w-]+)$/,
    admin: true,
    handler: async ({ ctx, req, params }) => {
      const body = requireRecord(await readJson(req));
      const bonus = body.bonusPreviews;
      if (typeof bonus !== "number" || !Number.isInteger(bonus) || bonus < 0 || bonus > 100) {
        throw new HttpError(400, "invalid_input", "Informe um número inteiro de prévias extras, de 0 a 100.");
      }
      return json(await grantPreviews(ctx, params.id, bonus));
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/orders$/,
    admin: true,
    handler: async ({ ctx, url }) => {
      const status = url.searchParams.get("status") as OrderStatus | null;
      if (status && !ORDER_STATUSES.includes(status)) throw new HttpError(400, "invalid_input", "Status inválido.");
      const page = Math.max(1, Number.parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
      return json(
        await listOrders(ctx, {
          status: status ?? undefined,
          q: cleanText(url.searchParams.get("q"), 60),
          page,
        }),
      );
    },
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/orders\/(?<id>[\w-]+)$/,
    admin: true,
    handler: async ({ ctx, params }) => json(await getOrderAdmin(ctx, params.id)),
  },
  {
    method: "PATCH",
    pattern: /^\/api\/admin\/orders\/(?<id>[\w-]+)$/,
    admin: true,
    handler: async ({ ctx, req, params }) => {
      const body = requireRecord(await readJson(req));
      const status = body.status as OrderStatus | undefined;
      if (status !== undefined && !ORDER_STATUSES.includes(status)) {
        throw new HttpError(400, "invalid_input", "Status inválido.");
      }
      return json(
        await updateOrderAdmin(ctx, params.id, {
          status,
          adminNotes:
            body.adminNotes === undefined ? undefined : (cleanText(body.adminNotes, 2000) ?? null),
          note: cleanText(body.note, 300),
        }),
      );
    },
  },
  {
    method: "POST",
    pattern: /^\/api\/admin\/orders\/(?<id>[\w-]+)\/items\/(?<itemId>[\w-]+)\/model$/,
    admin: true,
    handler: async ({ ctx, params }) => json(await startModel(ctx, params.id, params.itemId), { status: 202 }),
  },
  {
    method: "GET",
    pattern: /^\/api\/admin\/orders\/(?<id>[\w-]+)\/items\/(?<itemId>[\w-]+)\/model$/,
    admin: true,
    handler: async ({ ctx, params }) => json(await getModel(ctx, params.id, params.itemId)),
  },
];

// ───────── CORS (só desenvolvimento) ─────────

function withCors(ctx: Ctx, req: Request, res: Response): Response {
  const origin = req.headers.get("origin");
  if (!origin || !ctx.config.allowedOrigins.includes(origin)) return res;
  const headers = new Headers(res.headers);
  headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Access-Control-Allow-Credentials", "true");
  headers.set("Access-Control-Expose-Headers", "Content-Disposition");
  headers.set("Vary", "Origin");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

export async function handle(req: Request, ctx: Ctx = getContext()): Promise<Response> {
  try {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      const headers = new Headers(baseHeaders);
      headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,OPTIONS");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      return withCors(ctx, req, new Response(null, { status: 204, headers }));
    }

    // HEAD = GET sem corpo (navegadores e verificadores de link usam)
    const method = req.method === "HEAD" ? "GET" : req.method;

    let pathMatched = false;
    for (const route of routes) {
      const match = route.pattern.exec(url.pathname);
      if (!match) continue;
      pathMatched = true;
      if (route.method !== method) continue;

      if (route.admin) requireAdmin(ctx, req);
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(ctx, req);

      const res = await route.handler({
        ctx,
        req,
        url,
        params: { ...match.groups },
        ip: clientIp(req),
      });
      const answer = req.method === "HEAD" ? new Response(null, { status: res.status, headers: res.headers }) : res;
      return withCors(ctx, req, answer);
    }
    throw pathMatched
      ? new HttpError(405, "method_not_allowed", "Método não permitido.")
      : new HttpError(404, "not_found", "Rota não encontrada.");
  } catch (error) {
    return withCors(ctx, req, errorResponse(error));
  }
}
