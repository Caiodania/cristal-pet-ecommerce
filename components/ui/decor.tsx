import Image from "next/image";
import { FaPaw } from "react-icons/fa6";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

// Peças decorativas da marca AUmor de Patas. Todas são aria-hidden: nenhuma
// carrega informação.

type Tone = "snow" | "pearl" | "mist" | "silver" | "gold" | "pink" | "navy" | "ink";

const waveColor: Record<Tone, string> = {
  snow: "text-snow",
  pearl: "text-pearl",
  mist: "text-silver-mist",
  silver: "text-silver",
  gold: "text-gold-mist",
  pink: "text-pink-mist",
  navy: "text-navy",
  ink: "text-ink",
};

/** Onda na base da seção, na cor da seção seguinte. */
export function WaveDivider({ tone }: { tone: Tone }) {
  return (
    <div
      aria-hidden="true"
      className={cn("absolute bottom-0 left-0 w-full translate-y-px overflow-hidden leading-none", waveColor[tone])}
    >
      <svg
        className="h-12 w-full md:h-20"
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M0,64 C240,120 480,0 720,32 C960,64 1200,120 1440,64 L1440,120 L0,120 Z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

/**
 * Contorno dourado inclinado atrás de fotos e cartões (a moldura da marca). Vai
 * dentro de um contêiner `relative`, antes do conteúdo.
 */
export function TiltedOutline({
  rotate = -3,
  x = 10,
  y = 10,
  className,
}: {
  rotate?: number;
  x?: number;
  y?: number;
  className?: string;
}) {
  const style: CSSProperties = { transform: `rotate(${rotate}deg) translate(${x}px, ${y}px)` };
  return (
    <span
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit] border-[3px] border-gold",
        className,
      )}
      style={style}
    />
  );
}

/** Bolhas (gotas de brilho), em baixa opacidade, como pano de fundo das faixas. */
export function Bubbles({ className }: { className?: string }) {
  return (
    <Image
      src="/images/marca/bolhas.webp"
      alt=""
      aria-hidden="true"
      width={800}
      height={800}
      loading="lazy"
      className={cn("pointer-events-none absolute max-w-none select-none opacity-60", className)}
    />
  );
}

/** Coraçãozinho que antecede os títulos (o coração do logo). Herda a cor do texto ao lado. */
export function HeartMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={cn(className)}>
      <path d="M12 21.2C5.2 16.6 2 13.1 2 9.2 2 6.2 4.2 4 7 4c1.9 0 3.7 1 5 2.8C13.3 5 15.1 4 17 4c2.8 0 5 2.2 5 5.2 0 3.9-3.2 7.4-10 12Z" />
    </svg>
  );
}

/** Selo redondo com texto girando em volta de uma patinha (só enfeite). */
export function SpinBadge({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn("relative grid place-items-center rounded-full bg-white shadow-lift", className)}>
      <svg viewBox="0 0 120 120" className="absolute inset-0 size-full motion-safe:animate-[spin_22s_linear_infinite]">
        <defs>
          <path id="spin-badge-path" d="M60,60 m-45,0 a45,45 0 1,1 90,0 a45,45 0 1,1 -90,0" />
        </defs>
        <text fontSize="10.5" fontWeight="800" fill="currentColor" textLength="276" lengthAdjust="spacing">
          <textPath href="#spin-badge-path">ESCULTURA 3D • FEITA SOB MEDIDA • </textPath>
        </text>
      </svg>
      <FaPaw className="relative text-2xl text-pink-deep" />
    </div>
  );
}
