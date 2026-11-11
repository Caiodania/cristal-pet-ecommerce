// Mensagens de WhatsApp do pedido. O texto é a "nota de pedido" que chega ao
// dono: precisa trazer o essencial mesmo se o link do site não abrir.

import { site } from "../../content/site";
import { buildWhatsAppUrl } from "../whatsapp";
import { formatCents } from "./estimativa";
import type { ItemConfig } from "./tipos";
import { productDetails, productLabel } from "./produtos";

function describe(item: ItemConfig): string {
  return [productLabel(item), productDetails(item), item.petName ? `"${item.petName}"` : null].filter(Boolean).join(" · ");
}

function lines(items: ItemConfig[]): string[] {
  return items.map((item, i) => `${i + 1}. 1x ${describe(item)}`);
}

/** Pedido já gravado no site: leva o código e o link de acompanhamento. */
export function orderMessage(input: {
  code: string;
  items: ItemConfig[];
  estimateCents: number | null;
  trackUrl: string;
}): string {
  return [
    "Olá! Fiz um pedido personalizado do meu pet pelo site.",
    "",
    `Pedido: ${input.code}`,
    ...lines(input.items),
    "",
    `Valor estimado: ${formatCents(input.estimateCents)}${input.estimateCents === null ? " (a combinar aqui)" : ""}`,
    `Acompanhar: ${input.trackUrl}`,
  ].join("\n");
}

/**
 * Plano B: o servidor não respondeu e o pedido NÃO foi gravado. O cliente
 * ainda consegue fechar pelo WhatsApp e manda a foto por lá.
 */
export function fallbackMessage(items: ItemConfig[]): string {
  return [
    "Olá! Quero fazer um pedido personalizado do meu pet (o site não conseguiu registrar o pedido).",
    "",
    ...lines(items),
    "",
    "Vou enviar a foto do meu pet por aqui.",
  ].join("\n");
}

export const whatsappUrl = (message: string) => buildWhatsAppUrl(message);
export const supportUrl = () => buildWhatsAppUrl(site.whatsapp.messages.duvida);
export const orderSupportUrl = (code: string) =>
  buildWhatsAppUrl(`Olá! Tenho uma dúvida sobre o meu pedido ${code}.`);
