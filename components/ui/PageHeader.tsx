import type { ReactNode } from "react";
import { Bubbles, WaveDivider } from "./decor";
import { SectionHeader } from "./Section";

type PageHeaderProps = {
  eyebrow?: string;
  /** Use <Accent> em uma palavra para o destaque. */
  title: ReactNode;
  description?: ReactNode;
  titleId: string;
};

/**
 * Faixa de abertura das páginas internas (personalizar, carrinho, pedidos,
 * contato, textos legais): verde-água da marca, bolhas e a onda para o conteúdo
 * em fundo creme. Leva o único h1 da página.
 */
export function PageHeader({ eyebrow, title, description, titleId }: PageHeaderProps) {
  return (
    <section
      aria-labelledby={titleId}
      data-surface="teal"
      className="relative overflow-hidden bg-teal pb-24 pt-12 text-ink md:pb-32 md:pt-16"
    >
      <Bubbles className="-right-24 -top-24 w-72 opacity-30" />
      <div className="container-page relative">
        <SectionHeader as="h1" align="start" eyebrow={eyebrow} titleId={titleId} title={title} description={description} />
      </div>
      <WaveDivider tone="cream" />
    </section>
  );
}
