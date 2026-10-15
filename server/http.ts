// Helpers HTTP: respostas JSON, erros, cookies e leitura segura do corpo.

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const baseHeaders = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
} as const;

export function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  for (const [k, v] of Object.entries(baseHeaders)) headers.set(k, v);
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(error: unknown): Response {
  if (error instanceof HttpError) {
    return json({ error: { code: error.code, message: error.message } }, { status: error.status });
  }
  // Erro inesperado: registra no log da função e responde sem detalhes.
  console.error("[api] erro inesperado:", error);
  return json(
    { error: { code: "internal", message: "Algo deu errado. Tente de novo em instantes." } },
    { status: 500 },
  );
}

/** Lê JSON com limite de tamanho. */
export async function readJson(req: Request, maxBytes = 64 * 1024): Promise<unknown> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new HttpError(413, "too_large", "Requisição grande demais.");
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, "too_large", "Requisição grande demais.");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "invalid_json", "JSON inválido.");
  }
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of (header ?? "").split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

export function serializeCookie(
  name: string,
  value: string,
  opts: { maxAge?: number; secure: boolean },
): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Strict"];
  if (opts.secure) parts.push("Secure");
  if (opts.maxAge !== undefined) parts.push(`Max-Age=${opts.maxAge}`);
  return parts.join("; ");
}

/** IP do visitante (Netlify manda no cabeçalho `x-nf-client-connection-ip`). */
export function clientIp(req: Request): string {
  return (
    req.headers.get("x-nf-client-connection-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "0.0.0.0"
  );
}
