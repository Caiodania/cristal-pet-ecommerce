import { site } from "@/content/site";

/** Link do WhatsApp (wa.me); com `message`, abre a conversa já escrita. */
export function buildWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${site.whatsapp.number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
