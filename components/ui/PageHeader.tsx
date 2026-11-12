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
 * contato, textos legais): faixa dourada suave, detalhes pink e a onda para o conteúdo
 * em fundo branco. Leva o único h1 da página.
 */
export function PageHeader({ eyebrow, title, description, titleId }: PageHeaderProps) {
  return (
    <section
      aria-labelledby={titleId}
      data-surface="gold"
      className="relative overflow-hidden bg-gold-sheen pb-24 pt-12 text-ink md:pb-32 md:pt-16"
    >
      <span aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-12 size-64 rounded-full bg-pink/10 blur-3xl" />
      <Bubbles className="-right-24 -top-24 w-72 opacity-30" />
      <div className="container-page relative">
        <SectionHeader as="h1" align="start" eyebrow={eyebrow} titleId={titleId} title={title} description={description} />
      </div>
      <WaveDivider tone="snow" />
    </section>
  );
}
