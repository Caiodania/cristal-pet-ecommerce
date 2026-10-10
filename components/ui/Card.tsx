import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type CardProps = {
  /** Elemento HTML: "article" para conteúdo independente, "li" em listas… */
  as?: ElementType;
  tone?: "white" | "sand" | "ink";
  /** Sobe levemente ao passar o mouse; use em cards que são links. */
  interactive?: boolean;
  /** false = sem padding (card com imagem até a borda). */
  padded?: boolean;
  className?: string;
  children: ReactNode;
};

const tones = {
  white: "bg-white text-ink",
  sand: "bg-sand text-ink",
  ink: "bg-ink text-cream border-transparent",
} as const;

export function Card({
  as: Component = "div",
  tone = "white",
  interactive = false,
  padded = true,
  className,
  children,
}: CardProps) {
  return (
    <Component
      // o card claro numa faixa escura volta ao foco escuro-sobre-claro
      data-surface={tone === "ink" ? "dark" : "light"}
      className={cn(
        "overflow-hidden rounded-card border border-line shadow-soft",
        tones[tone],
        padded && "p-6 sm:p-8",
        interactive &&
          "transition-[box-shadow,translate] motion-safe:duration-300 " +
            "hover:shadow-lift motion-safe:hover:-translate-y-1",
        className,
      )}
    >
      {children}
    </Component>
  );
}
