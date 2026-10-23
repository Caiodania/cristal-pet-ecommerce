import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type ButtonVariant = "primary" | "accent" | "secondary" | "inverse" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";
type Variant = ButtonVariant;
type Size = ButtonSize;

type CommonProps = {
  variant?: Variant;
  size?: Size;
  /** Ícone decorativo; o texto continua sendo o nome acessível. */
  icon?: ReactNode;
  iconPosition?: "start" | "end";
  className?: string;
  children: ReactNode;
};

type AsLink = { href: string } & Omit<
  ComponentProps<"a">,
  "href" | "children" | "className"
>;

type AsButton = { href?: undefined } & Omit<
  ComponentProps<"button">,
  "children" | "className"
>;

export type ButtonProps = CommonProps & (AsLink | AsButton);

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold " +
  "whitespace-nowrap select-none transition-[background-color,color,box-shadow,translate] " +
  "motion-safe:duration-200 motion-safe:active:translate-y-px " +
  "disabled:pointer-events-none disabled:opacity-60";

// Alvos de toque de pelo menos 44 px (WCAG 2.5.8)
const sizes: Record<Size, string> = {
  sm: "min-h-11 px-5 text-sm",
  md: "min-h-12 px-7 text-[0.9375rem]",
  lg: "min-h-14 px-9 text-base",
};

// Pares de cor já medidos: primary (branco sobre magenta) 4,95:1 · accent (ink
// sobre teal) 7,8:1 · inverse (ink sobre branco) 16,5:1. O magenta é a cor de
// ação da marca, como no site institucional. Sobre uma faixa magenta o botão
// principal inverte (magenta sobre branco) para não sumir.
const variants: Record<Variant, string> = {
  primary:
    "btn-sheen bg-magenta text-white shadow-soft hover:brightness-110 hover:shadow-lift " +
    "[[data-surface=magenta]_&]:bg-white [[data-surface=magenta]_&]:text-magenta",
  accent: "btn-sheen bg-teal text-ink hover:brightness-95 hover:shadow-soft",
  secondary:
    "border-2 border-ink text-ink hover:bg-ink hover:text-cream " +
    "[[data-surface=dark]_&]:border-cream [[data-surface=dark]_&]:text-cream " +
    "[[data-surface=dark]_&]:hover:bg-cream [[data-surface=dark]_&]:hover:text-ink " +
    "[[data-surface=magenta]_&]:border-white [[data-surface=magenta]_&]:text-white " +
    "[[data-surface=magenta]_&]:hover:bg-white [[data-surface=magenta]_&]:hover:text-magenta",
  inverse: "bg-white text-ink shadow-soft hover:bg-cream hover:shadow-lift",
  ghost:
    "text-teal-deep underline decoration-2 underline-offset-4 hover:decoration-magenta " +
    "[[data-surface=dark]_&]:text-teal [[data-surface=teal]_&]:text-ink " +
    "[[data-surface=magenta]_&]:text-white",
};

const isHttp = (href: string) => /^https?:\/\//i.test(href);
// Links comuns (sem next/link): externos, mailto/tel e a API (downloads de arquivo).
const isExternal = (href: string) =>
  isHttp(href) || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("/api/");

export function Button({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "start",
  className,
  children,
  ...rest
}: ButtonProps) {
  const classes = cn(base, sizes[size], variants[variant], className);
  const content = (
    <>
      {icon && iconPosition === "start" && icon}
      {children}
      {icon && iconPosition === "end" && icon}
    </>
  );

  if (rest.href !== undefined) {
    const { href, ...anchorProps } = rest;

    if (isExternal(href)) {
      const opensNewTab = isHttp(href);
      return (
        <a
          href={href}
          className={classes}
          {...(opensNewTab
            ? { target: "_blank", rel: "noopener noreferrer" }
            : {})}
          {...anchorProps}
        >
          {content}
          {opensNewTab && <span className="sr-only"> (abre em nova aba)</span>}
        </a>
      );
    }

    return (
      <Link href={href} className={classes} {...anchorProps}>
        {content}
      </Link>
    );
  }

  const { type = "button", ...buttonProps } = rest;
  return (
    <button type={type} className={classes} {...buttonProps}>
      {content}
    </button>
  );
}
