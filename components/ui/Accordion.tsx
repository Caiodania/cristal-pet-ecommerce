import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type AccordionItem = {
  question: string;
  /** Texto simples ou JSX. Para o FAQPage do Google, prefira texto simples. */
  answer: ReactNode;
};

type AccordionProps = {
  items: AccordionItem[];
  /**
   * Nome do grupo: itens com o mesmo `name` são exclusivos (abrir um fecha o
   * outro), sem JavaScript. Use um nome diferente para cada acordeão da página.
   */
  name: string;
  /** Índice do item que já nasce aberto. */
  defaultOpen?: number;
  className?: string;
};

/**
 * Acordeão com <details>/<summary> nativos: navegável pelo teclado (Enter e
 * Espaço), anunciado corretamente por leitores de tela e com as respostas no
 * HTML, então a busca da página e o Google enxergam o texto mesmo fechado.
 * Os estilos ficam em `.accordion` (app/globals.css).
 */
export function Accordion({
  items,
  name,
  defaultOpen,
  className,
}: AccordionProps) {
  return (
    <div className={cn("accordion", className)}>
      {items.map((item, index) => (
        <details key={item.question} name={name} open={index === defaultOpen}>
          <summary>{item.question}</summary>
          <div className="accordion-answer">{item.answer}</div>
        </details>
      ))}
    </div>
  );
}
