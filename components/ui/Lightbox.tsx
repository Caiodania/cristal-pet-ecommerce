"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon } from "./icons";

export type ImageSource = {
  src: string;
  width: number;
  height: number;
};

export type LightboxImage = ImageSource & { alt: string };

type LightboxProps = {
  images: LightboxImage[];
  /** Índice da foto aberta; null = fechado. */
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  /** Nome acessível do diálogo. */
  label?: string;
};

const SWIPE_DISTANCE = 48;

/**
 * Visualizador de fotos com o <dialog> nativo: o navegador cuida de prender o
 * foco, fechar no Esc e devolver o foco ao botão que abriu. Além disso:
 * ← → trocam de foto, deslizar o dedo troca no celular e clicar fora fecha
 * (`closedby="any"`, com fallback manual para o Safari).
 */
export function Lightbox({
  images,
  index,
  onIndexChange,
  onClose,
  label = "Galeria de fotos",
}: LightboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const isOpen = index !== null;
  const total = images.length;

  // Guarda a última foto aberta: durante a animação de saída o conteúdo precisa
  // continuar na tela. (Padrão oficial de "ajustar estado durante a renderização".)
  const [shown, setShown] = useState<number | null>(index);
  if (index !== null && index !== shown) setShown(index);

  // Abre e fecha o diálogo conforme o estado do pai
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  // Safari ainda não tem `closedby`: fecha ao clicar no fundo
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || "closedBy" in HTMLDialogElement.prototype) return;

    const onClick = (event: MouseEvent) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.bottom &&
        rect.left <= event.clientX &&
        event.clientX <= rect.right;
      if (!inside) dialog.close();
    };

    dialog.addEventListener("click", onClick);
    return () => dialog.removeEventListener("click", onClick);
  }, []);

  // Pré-carrega as fotos vizinhas para a troca ser instantânea
  useEffect(() => {
    if (index === null) return;
    for (const offset of [-1, 1]) {
      const neighbour = images[(index + offset + total) % total];
      if (neighbour) new window.Image().src = neighbour.src;
    }
  }, [index, images, total]);

  const go = (step: number) => {
    if (index === null) return;
    onIndexChange((index + step + total) % total);
  };

  const current = shown === null ? null : images[shown];

  return (
    <dialog
      ref={dialogRef}
      className="lightbox"
      aria-label={label}
      onClose={onClose}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") go(-1);
        if (event.key === "ArrowRight") go(1);
      }}
      // closedby ainda não está nos tipos do React
      {...({ closedby: "any" } as object)}
    >
      {current && (
        <div className="relative flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 sm:px-5">
            <p
              className="text-sm font-semibold text-cream/80"
              aria-live="polite"
            >
              Foto {(shown ?? 0) + 1} de {total}
            </p>
            <form method="dialog">
              <button
                type="submit"
                aria-label="Fechar"
                className="grid size-11 place-items-center rounded-full text-xl text-cream transition-colors hover:bg-cream/15"
              >
                <CloseIcon />
              </button>
            </form>
          </div>

          <div
            className="relative grid place-items-center bg-black/40"
            onTouchStart={(event) => {
              touchStartX.current = event.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              const start = touchStartX.current;
              const end = event.changedTouches[0]?.clientX;
              touchStartX.current = null;
              if (start === null || end === undefined) return;
              if (end - start > SWIPE_DISTANCE) go(-1);
              if (start - end > SWIPE_DISTANCE) go(1);
            }}
          >
            <Image
              key={current.src}
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              sizes="(max-width: 1024px) 96vw, 1024px"
              className="h-auto max-h-[72dvh] w-auto max-w-full object-contain"
            />

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Foto anterior"
                  className="absolute left-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-ink/70 text-2xl text-cream backdrop-blur transition-colors hover:bg-ink sm:left-4"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Próxima foto"
                  className="absolute right-2 top-1/2 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-ink/70 text-2xl text-cream backdrop-blur transition-colors hover:bg-ink sm:right-4"
                >
                  <ChevronRightIcon />
                </button>
              </>
            )}
          </div>

          <p className="px-4 py-3 text-sm leading-snug text-cream/80 sm:px-5">
            {current.alt}
          </p>
        </div>
      )}
    </dialog>
  );
}
