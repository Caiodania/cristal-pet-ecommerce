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

// Ação principal dourada com texto marinho; pink profundo mantém o contraste
// do texto branco. As duas variantes também se destacam nas faixas escuras.
const variants: Record<Variant, string> = {
  primary:
    "btn-sheen bg-gold text-navy shadow-soft ring-1 ring-inset ring-gold-deep/20 hover:brightness-105 hover:shadow-lift",
  accent: "btn-sheen bg-pink-deep text-white hover:brightness-95 hover:shadow-soft",
  secondary:
    "border-2 border-ink text-ink hover:bg-ink hover:text-snow " +
    "[[data-surface=dark]_&]:border-snow [[data-surface=dark]_&]:text-snow " +
    "[[data-surface=dark]_&]:hover:bg-snow [[data-surface=dark]_&]:hover:text-ink " +
    "[[data-surface=navy]_&]:border-white [[data-surface=navy]_&]:text-white " +
    "[[data-surface=navy]_&]:hover:bg-white [[data-surface=navy]_&]:hover:text-navy",
  inverse: "bg-white text-ink shadow-soft hover:bg-pink-mist hover:shadow-lift",
  ghost:
    "text-pink-deep underline decoration-2 underline-offset-4 hover:decoration-pink " +
    "[[data-surface=dark]_&]:text-gold [[data-surface=silver]_&]:text-ink " +
    "[[data-surface=navy]_&]:text-white",
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
