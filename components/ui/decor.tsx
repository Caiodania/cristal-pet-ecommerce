import Image from "next/image";
import { FaPaw } from "react-icons/fa6";
import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

// Peças decorativas da marca Cristal Pet (do site institucional). Todas são
// aria-hidden: nenhuma carrega informação.

type Tone = "cream" | "sand" | "mist" | "teal" | "magenta" | "ink";

const waveColor: Record<Tone, string> = {
  cream: "text-cream",
  sand: "text-sand",
  mist: "text-teal-mist",
  teal: "text-teal",
  magenta: "text-magenta",
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
 * Contorno magenta inclinado atrás de fotos e cartões (marca registrada do site
 * institucional). Vai dentro de um contêiner `relative`, antes do conteúdo.
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
        "pointer-events-none absolute inset-0 rounded-[inherit] border-[3px] border-magenta",
        "[[data-surface=magenta]_&]:border-white",
        className,
      )}
      style={style}
    />
  );
}

/** Bolhas de sabão da marca, em baixa opacidade, como pano de fundo. */
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

/** Patinha da marca. */
export function Paw({ className }: { className?: string }) {
  return (
    <Image
      src="/images/marca/patinhas.png"
      alt=""
      aria-hidden="true"
      width={34}
      height={44}
      loading="lazy"
      className={cn("pointer-events-none absolute h-auto select-none", className)}
    />
  );
}

/** As três marquinhas de garra laranja que antecedem os títulos no site da marca. */
export function ClawMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={cn("text-claw", className)}
    >
      <path d="M6 3L4 11M12 3L10 11M18 3L16 11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
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
      <FaPaw className="relative text-2xl text-magenta" />
    </div>
  );
}
