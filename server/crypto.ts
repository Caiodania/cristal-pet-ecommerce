// Utilitários de criptografia (node:crypto). Nada de segredos em código.

import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
  timingSafeEqual,
} from "node:crypto";

export const uuid = () => randomUUID();

/** Código curto e legível do pedido, ex.: CP-7K3M9Q (sem 0/O/1/I, que se confundem). */
export function newOrderCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += alphabet[randomInt(alphabet.length)];
  return `CP-${code}`;
}

/** Texto aleatório e imprevisível, seguro para URL (base64url). */
export const randomToken = (bytes = 24) => randomBytes(bytes).toString("base64url");

export const sha256Hex = (value: string) => createHash("sha256").update(value).digest("hex");

/** Compara em tempo constante (não vaza, pelo tempo, quantos caracteres batem). */
export function safeEqual(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

const sign = (data: string, secret: string) =>
  createHmac("sha256", secret).update(data).digest("base64url");

/** Token assinado: `payload.assinatura`. O payload é legível, mas não alterável. */
export function signToken(payload: Record<string, unknown>, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

export function verifyToken<T extends Record<string, unknown>>(
  token: string,
  secret: string,
  nowSeconds = Date.now() / 1000,
): T | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!safeEqual(signature, sign(body, secret))) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T & {
      exp?: number;
    };
    if (typeof payload.exp === "number" && payload.exp < nowSeconds) return null;
    return payload;
  } catch {
    return null;
  }
}
