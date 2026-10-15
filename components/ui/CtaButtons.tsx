import { FaWhatsapp } from "react-icons/fa6";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { Button, type ButtonSize, type ButtonVariant } from "./Button";
import { ArrowRightIcon } from "./icons";

type CtaProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
};

type WhatsAppButtonProps = CtaProps & {
  /** Mensagem já escrita na conversa. */
  message: string;
  children: string;
};

/** Botão que abre o WhatsApp com a mensagem pronta (abre em nova aba). */
export function WhatsAppButton({
  message,
  children,
  variant = "primary",
  size = "lg",
  className,
}: WhatsAppButtonProps) {
  return (
    <Button
      href={buildWhatsAppUrl(message)}
      variant={variant}
      size={size}
      className={className}
      icon={<FaWhatsapp aria-hidden="true" className="text-xl" />}
    >
      {children}
    </Button>
  );
}

/** CTA principal da loja: leva ao configurador. `tamanho` já chega escolhido. */
export function CreateButton({
  variant = "primary",
  size = "lg",
  className,
  children = "Criar minha escultura",
  sizeId,
}: CtaProps & { children?: string; sizeId?: string }) {
  return (
    <Button
      href={sizeId ? `/personalizar?tamanho=${encodeURIComponent(sizeId)}` : "/personalizar"}
      variant={variant}
      size={size}
      className={className}
      icon={<ArrowRightIcon className="text-lg" />}
      iconPosition="end"
    >
      {children}
    </Button>
  );
}
