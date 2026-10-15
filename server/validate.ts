// Validação de entrada. Tudo o que vem do navegador é desconfiado até passar
// por aqui. Sem dependências: as regras são poucas e ficam à vista.

import { catalog as defaultCatalog, type Catalog } from "../content/estatua";
import { priceItem } from "../lib/loja/estimativa";
import type { ItemConfig } from "../lib/loja/tipos";
import { HttpError } from "./http";

const bad = (message: string) => new HttpError(400, "invalid_input", message);

export const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/** Texto curto, sem caracteres de controle, com espaços aparados. */
export function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim();
  if (!text) return undefined;
  return text.slice(0, max);
}

export function requireRecord(value: unknown, what = "corpo"): Record<string, unknown> {
  if (!isRecord(value)) throw bad(`O ${what} deve ser um objeto.`);
  return value;
}

const SESSION_ID = /^[A-Za-z0-9_-]{16,64}$/;

export function parseSessionId(value: unknown): string {
  if (typeof value !== "string" || !SESSION_ID.test(value)) {
    throw bad("Sessão inválida. Recarregue a página.");
  }
  return value;
}

export function parseItemConfig(raw: unknown, catalog: Catalog = defaultCatalog): ItemConfig {
  const o = requireRecord(raw, "item");
  const config: ItemConfig = {
    sizeId: String(o.sizeId ?? ""),
    poseId: String(o.poseId ?? ""),
    colorId: String(o.colorId ?? ""),
    petName: cleanText(o.petName, 30),
  };
  const result = priceItem(config, catalog);
  if (!result.ok) throw bad(result.error);
  return config;
}

/** Telefone: só dígitos, 10 a 13 (DDD + número, com ou sem 55). */
export function parsePhone(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) throw bad("Informe o WhatsApp com DDD, ou deixe em branco.");
  return digits;
}

export type Customer = { name: string; phone?: string; city?: string; notes?: string };

export function parseCustomer(raw: unknown): Customer {
  const o = requireRecord(raw, "cliente");
  const name = cleanText(o.name, 80);
  if (!name || name.length < 2) throw bad("Informe o seu nome.");
  return {
    name,
    phone: parsePhone(o.phone),
    city: cleanText(o.city, 60),
    notes: cleanText(o.notes, 500),
  };
}

export type ImageKind = { ext: "jpg" | "png" | "webp"; contentType: string };

/** Identifica a imagem pelos primeiros bytes (não confia no que o navegador diz). */
export function sniffImage(bytes: Uint8Array): ImageKind | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length > 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ext: "png", contentType: "image/png" };
  }
  if (
    bytes.length > 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return { ext: "webp", contentType: "image/webp" };
  }
  return null;
}
