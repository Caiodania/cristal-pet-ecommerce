import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SectionTone = "cream" | "sand" | "mist" | "ink" | "teal";

const tones: Record<SectionTone, string> = {
  cream: "bg-cream text-ink",
  sand: "bg-sand text-ink",
  mist: "bg-teal-mist text-ink",
  ink: "bg-ink text-cream",
  // faixa de marca: texto sempre ink (7,8:1). Sem eyebrow nem Accent aqui:
  // teal-deep sobre teal só daria 2,7:1.
  teal: "bg-teal text-ink",
};

const surfaces: Partial<Record<SectionTone, "dark" | "teal">> = {
  ink: "dark",
  teal: "teal",
};

type SectionProps = {
  id?: string;
  tone?: SectionTone;
  /** id do título da seção; dá o nome acessível à região. */
  labelledBy?: string;
  /** false = sem container interno (carrosséis que sangram até a borda). */
  contained?: boolean;
  className?: string;
  children: ReactNode;
};

/** Seção da página: fundo, ritmo vertical e largura do conteúdo. */
export function Section({
  id,
  tone = "cream",
  labelledBy,
  contained = true,
  className,
  children,
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      // faixas escuras e de marca trocam a cor do foco, do acento e dos botões
      data-surface={surfaces[tone]}
      className={cn("section-y", tones[tone], className)}
    >
      {contained ? <div className="container-page">{children}</div> : children}
    </section>
  );
}

type SectionHeaderProps = {
  eyebrow?: string;
  /** Use <Accent> em uma palavra para o itálico de destaque. */
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
        "max-w-3xl",
        centered ? "mx-auto text-center" : "text-start",
        className,
      )}
    >
      {eyebrow && (
        <p
          className={cn(
            "mb-4 flex items-center gap-3 text-eyebrow font-bold uppercase",
            "text-teal-deep [[data-surface=dark]_&]:text-teal",
            centered && "justify-center",
          )}
        >
          <span aria-hidden="true" className="h-px w-6 bg-current opacity-50" />
          {eyebrow}
          <span
            aria-hidden="true"
            className={cn("h-px w-6 bg-current opacity-50", !centered && "hidden")}
          />
        </p>
      )}
      <Heading
        id={titleId}
        className={cn(
          "font-medium",
          Heading === "h1" ? "text-display" : "text-title",
        )}
      >
        {title}
      </Heading>
      {description && (
        <p
          className={cn(
            "mt-5 text-lead text-ink-soft [[data-surface=dark]_&]:text-cream/80",
            centered && "mx-auto max-w-2xl",
          )}
        >
          {description}
        </p>
      )}
    </header>
  );
}

/** Palavra de destaque do título: itálico na cor da marca (teal-deep, AA). */
export function Accent({ children }: { children: ReactNode }) {
  return (
    <em className="font-medium italic text-teal-deep [[data-surface=dark]_&]:text-teal">
      {children}
    </em>
  );
}
