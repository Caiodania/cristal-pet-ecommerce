"use client";

import { Children, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

// Botões redondos: contorno ink em fundo claro; creme dentro de faixa escura.
const buttonClass =
  "grid size-11 place-items-center rounded-full border-2 border-ink text-ink transition-colors " +
  "hover:bg-ink hover:text-cream disabled:pointer-events-none disabled:opacity-40 " +
  "[[data-surface=dark]_&]:border-cream [[data-surface=dark]_&]:text-cream " +
  "[[data-surface=dark]_&]:hover:bg-cream [[data-surface=dark]_&]:hover:text-ink";

type CarouselProps = {
  /** Nome acessível do carrossel ("Fotos da unidade móvel"). */
  label: string;
  children: ReactNode;
  /** Largura de cada slide (classes do Tailwind). */
  slideClassName?: string;
  className?: string;
};

/**
 * Carrossel de rolagem horizontal com snap: o dedo e o trackpad rolam de forma
 * nativa; os botões Anterior/Próximo aparecem só quando há mais slides do que
 * cabem na tela. A trilha é focável, então as setas do teclado também rolam.
 * Com "reduzir movimento", a rolagem dos botões é instantânea.
 */
export function Carousel({
  label,
  children,
  slideClassName = "w-[78%] sm:w-[46%] lg:w-[31%]",
  className,
}: CarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    setEdges({ atStart: track.scrollLeft <= 1, atEnd: track.scrollLeft >= max - 1 });
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.addEventListener("scroll", measure, { passive: true });
    // o ResizeObserver dispara logo ao observar: é a medida inicial
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => {
      track.removeEventListener("scroll", measure);
      observer.disconnect();
    };
  }, [measure]);

  const scrollPage = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    // "auto" obedece ao scroll-behavior do CSS (suave, exceto com reduzir movimento)
    track.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: "auto" });
  };

  const overflowing = !(edges.atStart && edges.atEnd);

  return (
    <div
      role="region"
      aria-roledescription="carrossel"
      aria-label={label}
      className={className}
    >
      <ul
        ref={trackRef}
        tabIndex={0}
        aria-label={`${label}: itens`}
        className={cn(
          "flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2",
          "motion-safe:scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {Children.toArray(children).map((child, index) => (
          <li key={index} className={cn("shrink-0 snap-start", slideClassName)}>
            {child}
          </li>
        ))}
      </ul>

      {overflowing && (
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => scrollPage(-1)}
            disabled={edges.atStart}
            aria-label="Anterior"
            className={buttonClass}
          >
            <ChevronLeftIcon className="text-xl" />
          </button>
          <button
            type="button"
            onClick={() => scrollPage(1)}
            disabled={edges.atEnd}
            aria-label="Próximo"
            className={buttonClass}
          >
            <ChevronRightIcon className="text-xl" />
          </button>
        </div>
      )}
    </div>
  );
}
