"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { cn } from "@/lib/cn";
import type { Img } from "@/content/images";

type CompareSliderProps = {
  /** A foto do pet (aparece à esquerda do divisor). */
  before: Img;
  /** A escultura (aparece à direita). */
  after: Img;
  beforeLabel?: string;
  afterLabel?: string;
  /** Carrega a imagem já (primeira dobra). */
  priority?: boolean;
  className?: string;
};

/**
 * Comparador "antes e depois": arraste o divisor para ver a foto virar escultura.
 * O controle de verdade é um <input type="range"> (teclado, leitor de tela); o
 * arrastar com mouse ou dedo é um acréscimo. Ao carregar, o divisor passeia uma
 * vez sozinho para mostrar que dá para mexer (não acontece com "reduzir movimento").
 */
export function CompareSlider({
  before,
  after,
  beforeLabel = "Foto",
  afterLabel = "Escultura 3D",
  priority = false,
  className,
}: CompareSliderProps) {
  const [pos, setPos] = useState(50);
  const frame = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const touched = useRef(false);

  // passeio de apresentação: 50 → 22 → 78 → 50, até a pessoa mexer
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const keyframes = [50, 22, 78, 50];
    const total = 3200;
    const start = performance.now() + 900;
    let raf = 0;
    const tick = (now: number) => {
      if (touched.current) return;
      const t = Math.max(0, Math.min(1, (now - start) / total));
      const segment = Math.min(keyframes.length - 2, Math.floor(t * (keyframes.length - 1)));
      const local = t * (keyframes.length - 1) - segment;
      const eased = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
      setPos(keyframes[segment] + (keyframes[segment + 1] - keyframes[segment]) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const moveTo = useCallback((clientX: number) => {
    const box = frame.current?.getBoundingClientRect();
    if (!box) return;
    setPos(Math.max(0, Math.min(100, ((clientX - box.left) / box.width) * 100)));
  }, []);

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    touched.current = true;
    dragging.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    moveTo(event.clientX);
  }

  return (
    <div
      ref={frame}
      onPointerDown={onPointerDown}
      onPointerMove={(event) => dragging.current && moveTo(event.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      className={cn(
        "relative aspect-[4/5] w-full cursor-ew-resize touch-pan-y select-none overflow-hidden",
        "rounded-[2rem] border-4 border-white bg-sand shadow-lift",
        className,
      )}
    >
      {/* escultura por baixo; a foto por cima, recortada até o divisor */}
      <Image
        src={after.src}
        alt={after.alt}
        width={after.width}
        height={after.height}
        sizes="(max-width: 640px) 90vw, (max-width: 1024px) 480px, 520px"
        priority={priority}
        draggable={false}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image
          src={before.src}
          alt={before.alt}
          width={before.width}
          height={before.height}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 480px, 520px"
          priority={priority}
          draggable={false}
          className="size-full object-cover"
        />
      </div>

      <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-ink px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
        {beforeLabel}
      </span>
      <span className="pointer-events-none absolute right-4 top-4 rounded-full bg-magenta px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
        {afterLabel}
      </span>

      {/* controle acessível: o mesmo valor do divisor */}
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={Math.round(pos)}
        onChange={(event) => {
          touched.current = true;
          setPos(Number(event.target.value));
        }}
        aria-label="Comparar a foto do pet com a escultura"
        aria-valuetext={`${Math.round(pos)}% da foto e ${100 - Math.round(pos)}% da escultura`}
        className="peer sr-only"
      />

      {/* divisor e alça */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 w-1 -translate-x-1/2 bg-white shadow-[0_0_0_1px_rgb(26_26_26/0.15)] peer-focus-visible:[&>span]:ring-ink"
        style={{ left: `${pos}%` }}
      >
        <span
          className={cn(
            "absolute left-1/2 top-1/2 grid size-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full",
            "bg-white text-magenta shadow-lift ring-4 ring-magenta/25",
          )}
        >
          <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 7l-5 5 5 5M15 7l5 5-5 5" />
          </svg>
        </span>
      </div>
    </div>
  );
}
