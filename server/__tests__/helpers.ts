// Ajudantes dos testes: um servidor completo em memória, com relógio
// controlável e provedores simulados sem espera.

import { createContext, type Ctx } from "../context";
import { resetRateLimits } from "../ratelimit";
import { handle } from "../router";

export const PASSWORD = "senha-de-teste-123";

export type TestEnv = Record<string, string | undefined>;

export function makeCtx(env: TestEnv = {}) {
  resetRateLimits();
  const clock = { ms: Date.parse("2026-10-13T12:00:00Z") };
  const ctx = createContext(
    {
      NODE_ENV: "test",
      STORE: "memory",
      MOCK_DELAY_MS: "0",
      ADMIN_PASSWORD: PASSWORD,
      ADMIN_SESSION_SECRET: "segredo-de-teste-com-bastante-entropia",
      ...env,
    },
    { now: () => new Date(clock.ms) },
  );
  return { ctx, clock };
}

export type CallOptions = {
  json?: unknown;
  body?: BodyInit;
  headers?: Record<string, string>;
  cookie?: string;
  ip?: string;
};

export type CallResult = {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
  headers: Headers;
  raw: Response;
};

export async function call(
  ctx: Ctx,
  method: string,
  path: string,
  opts: CallOptions = {},
): Promise<CallResult> {
  const headers = new Headers(opts.headers);
  headers.set("x-nf-client-connection-ip", opts.ip ?? "203.0.113.7");
  if (opts.cookie) headers.set("cookie", opts.cookie);
  let body = opts.body;
  if (opts.json !== undefined) {
    headers.set("content-type", "application/json");
    body = JSON.stringify(opts.json);
  }
  const res = await handle(new Request(`http://localhost:8888${path}`, { method, headers, body }), ctx);
  const text = await res.clone().text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    /* corpo não é JSON (arquivo) */
  }
  return { status: res.status, body: parsed, headers: res.headers, raw: res };
}

/** Bytes que passam pela checagem de JPEG (os primeiros bytes) e têm tamanho de foto. */
export function fakeJpeg(size = 4096): Uint8Array {
  const bytes = new Uint8Array(size);
  bytes[0] = 0xff;
  bytes[1] = 0xd8;
  bytes[2] = 0xff;
  return bytes;
}

export const SESSION = "sessao-de-teste-abcdef123456";

export const OPTIONS = { sizeId: "media", poseId: "sentado", colorId: "branco", petName: "Thor" };

/** Cria a prévia, envia a foto, inicia e espera ficar pronta. Devolve o id público. */
export async function readyPreview(
  ctx: Ctx,
  opts: { session?: string; options?: Record<string, unknown>; ip?: string } = {},
): Promise<string> {
  const session = opts.session ?? SESSION;
  const created = await call(ctx, "POST", "/api/previews", {
    json: { sessionId: session, options: opts.options ?? OPTIONS },
    ip: opts.ip,
  });
  if (created.status !== 201) throw new Error(`createPreview: ${created.status} ${JSON.stringify(created.body)}`);
  const id = created.body.id as string;
  const up = await call(ctx, "PUT", `/api/previews/${id}/photo`, { body: fakeJpeg() as BodyInit, ip: opts.ip });
  if (up.status !== 200) throw new Error(`uploadPhoto: ${up.status} ${JSON.stringify(up.body)}`);
  const started = await call(ctx, "POST", `/api/previews/${id}/start`, { ip: opts.ip });
  if (started.status !== 200) throw new Error(`start: ${started.status} ${JSON.stringify(started.body)}`);
  const polled = await call(ctx, "GET", `/api/previews/${id}`, { ip: opts.ip });
  if (polled.body.status !== "ready") throw new Error(`não ficou pronta: ${JSON.stringify(polled.body)}`);
  return id;
}

export async function adminCookie(ctx: Ctx): Promise<string> {
  const res = await call(ctx, "POST", "/api/admin/login", { json: { password: PASSWORD } });
  if (res.status !== 200) throw new Error(`login falhou: ${res.status}`);
  return res.headers.get("set-cookie")!.split(";")[0];
}

export const CUSTOMER = { name: "Maria Souza", phone: "(19) 99999-1234", city: "Indaiatuba", notes: "Presente" };
