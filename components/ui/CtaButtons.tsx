import { FaWhatsapp } from "react-icons/fa6";
import { site } from "@/content/site";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { Button, type ButtonSize, type ButtonVariant } from "./Button";
import { ArrowRightIcon, CubeIcon } from "./icons";

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

/**
 * CTA da escultura. Com a loja ligada (`site.store.enabled`) leva ao
 * configurador; antes disso abre o WhatsApp com a mensagem de escultura, para
 * o botão nunca apontar para uma página que ainda não existe.
 */
export function SculptureButton({
  variant = "primary",
  size = "lg",
  className,
  children,
}: CtaProps & { children?: string }) {
  if (site.store.enabled) {
    return (
      <Button
        href="/personalizar"
        variant={variant}
        size={size}
        className={className}
        icon={<ArrowRightIcon className="text-lg" />}
        iconPosition="end"
      >
        {children ?? "Criar minha escultura"}
      </Button>
    );
  }

  return (
    <Button
      href={buildWhatsAppUrl(site.whatsapp.messages.escultura)}
      variant={variant}
      size={size}
      className={className}
      icon={<CubeIcon className="text-xl" />}
    >
      {children ?? "Quero minha escultura"}
    </Button>
  );
}
