import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ClawMark, WaveDivider } from "./decor";

export type SectionTone = "cream" | "sand" | "mist" | "teal" | "magenta" | "ink";

// Pares de cor já medidos (texto sobre fundo): ink/cream 16,5 · ink/teal 7,8 ·
// branco/magenta 4,95 · cream/ink 16,5.
const tones: Record<SectionTone, string> = {
  cream: "bg-cream text-ink",
  sand: "bg-sand text-ink",
  mist: "bg-teal-mist text-ink",
  teal: "bg-teal text-ink",
  magenta: "bg-magenta text-white",
  ink: "bg-ink text-cream",
};

// Faixas coloridas trocam a cor do foco, do destaque do título e dos botões.
const surfaces: Partial<Record<SectionTone, "dark" | "teal" | "magenta">> = {
  ink: "dark",
  teal: "teal",
  magenta: "magenta",
};

type SectionProps = {
  id?: string;
  tone?: SectionTone;
  /** id do título da seção; dá o nome acessível à região. */
  labelledBy?: string;
  /** false = sem container interno (carrosséis que sangram até a borda). */
  contained?: boolean;
  /** Onda na base, na cor da PRÓXIMA seção (o contorno ondulado da marca). */
  wave?: SectionTone;
  className?: string;
  children: ReactNode;
};

/** Seção da página: fundo, ritmo vertical, largura do conteúdo e onda opcional. */
export function Section({
  id,
  tone = "cream",
  labelledBy,
  contained = true,
  wave,
  className,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-surface={surfaces[tone]}
      className={cn(wave ? "section-y-wave relative" : "section-y", tones[tone], className)}
    >
      {contained ? <div className="container-page">{children}</div> : children}
      {wave && <WaveDivider tone={wave} />}
    </section>
  );
}

type SectionHeaderProps = {
  eyebrow?: string;
  /** Use <Accent> em uma palavra para o destaque colorido. */
  title: ReactNode;
  description?: ReactNode;
  titleId?: string;
  /** Nível do título. Só a primeira seção da página usa h1. */
  as?: Extract<ElementType, "h1" | "h2" | "h3">;
  align?: "center" | "start";
  className?: string;
};

/** Eyebrow + título + subtítulo, no padrão de todas as seções. */
export function SectionHeader({
  eyebrow,
  title,
  description,
  titleId,
  as: Heading = "h2",
  align = "center",
  className,
}: SectionHeaderProps) {
  const centered = align === "center";
  return (
    <header
      className={cn(
        "reveal max-w-3xl",
        centered ? "mx-auto text-center" : "text-start",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "mb-3 flex items-center gap-2 text-eyebrow font-extrabold uppercase",
            // eyebrow pequeno precisa de 4,5:1: teal-deep no claro, ink no teal,
            // branco no magenta, teal no escuro
            "text-teal-deep [[data-surface=teal]_&]:text-ink [[data-surface=magenta]_&]:text-white [[data-surface=dark]_&]:text-teal",
            centered && "justify-center",
          )}
        >
          <ClawMark className="size-5 shrink-0" />
          {eyebrow}
        </p>
      )}
      <Heading
        id={titleId}
        className={cn("font-extrabold", Heading === "h1" ? "text-display" : "text-title")}
      >
        {title}
      </Heading>
      {description && (
        <p
          className={cn(
            "mt-5 text-lead text-ink-soft",
            "[[data-surface=teal]_&]:text-ink/85 [[data-surface=magenta]_&]:text-white [[data-surface=dark]_&]:text-cream/80",
            centered && "mx-auto max-w-2xl",
          )}
        >
          {description}
        </p>
      )}
    </header>
  );
}

/**
 * Palavra de destaque do título, como no site da Cristal Pet. Magenta no fundo
 * claro (título grande: 4,7:1); sobre o verde-água o magenta reprovaria, então
 * vira uma "etiqueta" magenta com texto branco (4,95:1); no escuro, teal; no
 * magenta, sublinhado ondulado.
 */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <em
      className={cn(
        "font-extrabold not-italic text-magenta",
        "[[data-surface=teal]_&]:rounded-xl [[data-surface=teal]_&]:bg-magenta [[data-surface=teal]_&]:px-2 [[data-surface=teal]_&]:text-white [[data-surface=teal]_&]:[box-decoration-break:clone]",
        "[[data-surface=dark]_&]:text-teal",
        "[[data-surface=magenta]_&]:text-white [[data-surface=magenta]_&]:underline [[data-surface=magenta]_&]:decoration-wavy [[data-surface=magenta]_&]:decoration-2 [[data-surface=magenta]_&]:underline-offset-8",
      )}
    >
      {children}
    </em>
  );
}
