import { FaWhatsapp } from "react-icons/fa6";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

type WhatsAppFloatProps = {
  /** Mensagem já escrita na conversa. */
  message?: string;
  label?: string;
  className?: string;
};

/**
 * Botão fixo de WhatsApp. Ícone verde sobre fundo escuro (8,8:1): o branco
 * sobre o verde do WhatsApp daria só 2:1 e reprovaria. No celular fica só o
 * ícone; a partir de `sm` aparece o texto. O anel pulsante só roda se o
 * visitante não pediu para reduzir movimento.
 */
export function WhatsAppFloat({
  message = site.whatsapp.defaultMessage,
  label = "Falar no WhatsApp",
  className,
}: WhatsAppFloatProps) {
  return (
    <a
      href={buildWhatsAppUrl(message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (abre em nova aba)`}
      className={cn(
        "fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6",
        "flex h-14 items-center gap-2.5 rounded-full bg-ink px-4 text-cream shadow-lift sm:px-5",
        "transition-[background-color,translate] motion-safe:duration-200 hover:bg-ink/90 motion-safe:hover:-translate-y-0.5",
        className,
      )}
    >
      <span className="relative grid size-8 place-items-center">
        <span aria-hidden="true" className="whatsapp-ring" />
        <FaWhatsapp
          aria-hidden="true"
          className="relative text-[2rem] text-[#25d366]"
        />
      </span>
      <span className="hidden text-sm font-bold sm:inline">{label}</span>
    </a>
  );
}
