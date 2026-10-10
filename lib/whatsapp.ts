import { site } from "@/content/site";

/** Link do WhatsApp (wa.me); com `message`, abre a conversa já escrita. */
export function buildWhatsAppUrl(message?: string): string {
  const base = `https://wa.me/${site.whatsapp.number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

/**
 * Mensagem de agendamento. Quando o clique vem de um card de serviço ou de uma
 * cidade, a mensagem já leva essa informação.
 */
export function agendarMessage({
  service,
  city,
}: { service?: string; city?: string } = {}): string {
  const what = service ?? "um banho e tosa";
  const where = city ? ` em ${city}` : "";
  return `Olá! Quero agendar ${what}${where} para o meu pet.`;
}
