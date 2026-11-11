// Validação de entrada. Tudo o que vem do navegador é desconfiado até passar
// por aqui. Sem dependências: as regras são poucas e ficam à vista.

import { catalog as defaultCatalog, type Catalog } from "../content/estatua";
import { priceItem } from "../lib/loja/estimativa";
import { BR_STATES, type Address, type DeliveryMethod, type ItemConfig } from "../lib/loja/tipos";
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
  if (o.productType !== undefined && o.productType !== "escultura" && o.productType !== "quadro") {
    throw bad("Tipo de produto inválido.");
  }
  const config: ItemConfig = o.productType === "quadro" ? {
    productType: "quadro",
    sizeId: String(o.sizeId ?? ""),
    styleId: String(o.styleId ?? ""),
    frameId: String(o.frameId ?? ""),
    petName: cleanText(o.petName, 30),
  } : {
    ...(o.productType === "escultura" ? { productType: "escultura" as const } : {}),
    sizeId: String(o.sizeId ?? ""),
    poseId: String(o.poseId ?? ""),
    colorId: String(o.colorId ?? ""),
    petName: cleanText(o.petName, 30),
  };
  const result = priceItem(config, catalog);
  if (!result.ok) throw bad(result.error);
  return config;
}

/** WhatsApp: só dígitos, 10 a 13 (DDD + número, com ou sem 55). Obrigatório: é por ele que combinamos a entrega. */
export function parsePhone(value: unknown): string {
  const digits = typeof value === "string" ? value.replace(/\D/g, "") : "";
  if (digits.length < 10 || digits.length > 13) throw bad("Informe o WhatsApp com DDD (ex.: 19 99999-1234).");
  return digits;
}

/** Endereço de entrega, campo a campo (cada erro diz qual campo). */
export function parseAddress(raw: unknown): Address {
  const o = requireRecord(raw, "endereço");
  const cep = typeof o.cep === "string" ? o.cep.replace(/\D/g, "") : "";
  if (cep.length !== 8) throw bad("Informe o CEP com 8 números.");
  const street = cleanText(o.street, 120);
  if (!street || street.length < 3) throw bad("Informe a rua ou avenida.");
  const number = cleanText(o.number, 10);
  if (!number) throw bad('Informe o número (ou "s/n" se não tiver).');
  const neighborhood = cleanText(o.neighborhood, 80);
  if (!neighborhood || neighborhood.length < 2) throw bad("Informe o bairro.");
  const city = cleanText(o.city, 80);
  if (!city || city.length < 2) throw bad("Informe a cidade.");
  const state = typeof o.state === "string" ? o.state.trim().toUpperCase() : "";
  if (!(BR_STATES as readonly string[]).includes(state)) throw bad("Escolha o estado (UF).");
  return { cep, street, number, complement: cleanText(o.complement, 60), neighborhood, city, state };
}

export type Customer = {
  /** Quem recebe. */
  name: string;
  phone: string;
  delivery: DeliveryMethod;
  /** Só na entrega. */
  address?: Address;
  /** Cidade, na retirada (opcional). Na entrega vem do endereço. */
  city?: string;
  notes?: string;
};

export function parseCustomer(raw: unknown): Customer {
  const o = requireRecord(raw, "cliente");
  const name = cleanText(o.name, 80);
  if (!name || name.length < 2) throw bad("Informe o nome de quem vai receber.");
  const phone = parsePhone(o.phone);
  if (o.delivery !== "entrega" && o.delivery !== "retirada") throw bad("Escolha como quer receber o pedido.");
  return {
    name,
    phone,
    delivery: o.delivery,
    address: o.delivery === "entrega" ? parseAddress(o.address) : undefined,
    city: cleanText(o.city, 60),
    notes: cleanText(o.notes, 500),
  };
}

// ───────── Conta ─────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** E-mail em minúsculas e sem espaços nas pontas. */
export function parseEmail(value: unknown): string {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !EMAIL.test(email)) throw bad("Informe um e-mail válido.");
  return email;
}

// As senhas mais usadas no Brasil e no mundo: recusadas mesmo com 8 caracteres.
const COMMON_PASSWORDS = new Set([
  "12345678",
  "123456789",
  "1234567890",
  "senha123",
  "senha1234",
  "password",
  "password1",
  "qwertyui",
  "qwerty123",
  "11111111",
  "abc12345",
  "brasil123",
  "mudar123",
]);

/** Senha: de 8 a 72 caracteres (72 é o limite do bcrypt, usado pelo Supabase), com letra e sem ser das óbvias. */
export function parsePassword(value: unknown): string {
  if (typeof value !== "string" || value.length < 8) throw bad("A senha precisa ter pelo menos 8 caracteres.");
  if (value.length > 72) throw bad("A senha pode ter no máximo 72 caracteres.");
  if (!/\p{L}/u.test(value)) throw bad("Misture letras na senha: só números é fácil de adivinhar.");
  if (COMMON_PASSWORDS.has(value.toLowerCase())) throw bad("Esta senha é muito comum. Escolha outra.");
  return value;
}

export function parseAccountName(value: unknown): string {
  const name = cleanText(value, 60);
  if (!name || name.length < 2) throw bad("Informe o seu nome.");
  return name;
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
