"use client";

import { useState } from "react";
import { FaInstagram } from "react-icons/fa6";
import { cn } from "@/lib/cn";
import { PlayIcon } from "./icons";

type InstagramFacadeProps = {
  /** Link do reel ou post (sem parâmetros de rastreio). */
  permalink: string;
  /** Texto do card e nome acessível do vídeo. */
  description: string;
  className?: string;
};

/**
 * Fachada de vídeo do Instagram: nada de terceiros carrega até o clique. O
 * iframe oficial (/embed/) só entra quando a pessoa pede, então o Instagram não
 * rastreia quem apenas passou pela página e o script dele não pesa no
 * carregamento. Sem JavaScript, o link "Ver no Instagram" continua valendo.
 */
export function InstagramFacade({
  permalink,
  description,
  className,
}: InstagramFacadeProps) {
  const [active, setActive] = useState(false);
  const embedSrc = `${permalink.replace(/\/?$/, "/")}embed/`;

  return (
    <div
      // card claro, mesmo dentro de uma faixa escura: o foco muda de cor
      data-surface="light"
      className={cn(
        "relative aspect-[9/17] overflow-hidden rounded-card border border-line bg-white text-ink shadow-soft",
        className,
      )}
    >
      {active ? (
        <iframe
          src={embedSrc}
          title={description}
          loading="lazy"
          allowFullScreen
          className="absolute inset-0 size-full border-0"
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-gradient-to-b from-sand to-white p-6 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-magenta-mist text-magenta">
            <FaInstagram aria-hidden="true" className="text-3xl" />
          </span>
          <p className="font-semibold text-balance">{description}</p>
          <button
            type="button"
            onClick={() => setActive(true)}
            aria-label={`Assistir aqui: ${description}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-cream transition-colors hover:bg-ink/85"
          >
            <PlayIcon className="text-base" />
            Assistir aqui
          </button>
          <a
            href={permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-teal-deep underline underline-offset-4"
          >
            Ver no Instagram
            <span className="sr-only"> (abre em nova aba)</span>
          </a>
          <p className="text-xs text-ink-soft">
            Ao assistir, o vídeo é carregado do Instagram.
          </p>
        </div>
      )}
    </div>
  );
}
