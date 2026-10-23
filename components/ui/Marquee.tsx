import { FaPaw } from "react-icons/fa6";
import { cn } from "@/lib/cn";

type MarqueeProps = {
  items: string[];
  className?: string;
};

/**
 * Faixa de frases que rola sem parar (só CSS), como uma fita colada na página.
 * É enfeite: as mesmas ideias já estão no texto das seções, então o conjunto
 * fica escondido dos leitores de tela. Passar o mouse pausa; com "reduzir
 * movimento" a faixa fica parada.
 */
export function Marquee({ items, className }: MarqueeProps) {
  const row = (copy: 1 | 2) => (
    <ul data-copy={copy} className="flex shrink-0 items-center" aria-hidden="true">
      {items.map((item) => (
        <li key={item} className="flex items-center whitespace-nowrap font-display text-lg font-extrabold tracking-wide">
          <span className="px-6">{item}</span>
          <FaPaw className="text-base opacity-80" />
        </li>
      ))}
    </ul>
  );

  return (
    <div aria-hidden="true" className={cn("marquee bg-magenta py-3 text-white", className)}>
      <div className="marquee-track">
        {row(1)}
        {row(2)}
      </div>
    </div>
  );
}
