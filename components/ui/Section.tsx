import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { HeartMark, WaveDivider } from "./decor";

export type SectionTone = "snow" | "pearl" | "mist" | "silver" | "navy" | "ink";

// Pares de cor já medidos (texto sobre fundo): ink/snow 17,7 · ink/silver 11,3 ·
// branco/navy 15,6 · snow/ink 17,7.
const tones: Record<SectionTone, string> = {
  snow: "bg-snow text-ink",
  pearl: "bg-pearl text-ink",
  mist: "bg-silver-mist text-ink",
  silver: "bg-silver-sheen text-ink",
  navy: "bg-navy text-white",
  ink: "bg-ink text-snow",
};

// Faixas coloridas trocam a cor do foco, do destaque do título e dos botões.
const surfaces: Partial<Record<SectionTone, "dark" | "silver" | "navy">> = {
  ink: "dark",
  silver: "silver",
  navy: "navy",
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
  tone = "snow",
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
            // eyebrow pequeno precisa de 4,5:1: navy no claro, ink no prata,
            // branco no marinho, prata no escuro
            "text-navy [[data-surface=silver]_&]:text-ink [[data-surface=navy]_&]:text-white [[data-surface=dark]_&]:text-silver",
            centered && "justify-center",
          )}
        >
          <HeartMark className="size-4 shrink-0" />
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
            "[[data-surface=silver]_&]:text-ink/85 [[data-surface=navy]_&]:text-white [[data-surface=dark]_&]:text-snow/80",
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
 * Palavra de destaque do título. No fundo claro: texto marinho sobre um "marca-texto"
 * prateado; na faixa prata, uma etiqueta marinho com texto branco (15,6:1); na faixa
 * marinho, texto branco com sublinhado ondulado prateado; no escuro, texto prata.
 */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <em
      className={cn(
        "font-extrabold not-italic text-navy",
        "px-1 [box-decoration-break:clone] bg-[linear-gradient(transparent_62%,var(--color-silver)_62%,var(--color-silver)_94%,transparent_94%)]",
        "[[data-surface=silver]_&]:rounded-xl [[data-surface=silver]_&]:bg-navy [[data-surface=silver]_&]:bg-none [[data-surface=silver]_&]:px-2 [[data-surface=silver]_&]:text-white",
        "[[data-surface=dark]_&]:bg-none [[data-surface=dark]_&]:text-silver",
        "[[data-surface=navy]_&]:bg-none [[data-surface=navy]_&]:px-0 [[data-surface=navy]_&]:text-white [[data-surface=navy]_&]:underline [[data-surface=navy]_&]:decoration-wavy [[data-surface=navy]_&]:decoration-silver [[data-surface=navy]_&]:decoration-2 [[data-surface=navy]_&]:underline-offset-8",
      )}
    >
      {children}
    </em>
  );
}
