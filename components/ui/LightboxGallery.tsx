"use client";

import Image from "next/image";
import { useState } from "react";
import { Lightbox, type ImageSource } from "./Lightbox";

export type GalleryItem = {
  /** Descrição da foto (uma só, usada na miniatura e na ampliada). */
  alt: string;
  thumb: ImageSource;
  full: ImageSource;
};

type LightboxGalleryProps = {
  items: GalleryItem[];
  /** Nome acessível do visualizador. */
  label?: string;
  /** Quantas fotos já carregam sem esperar a rolagem (as de cima da página). */
  eager?: number;
};

/**
 * Mosaico de miniaturas (alturas variadas, estilo Pinterest) que abre o
 * Lightbox ao clicar. Cada miniatura é um <button> com nome acessível.
 */
export function LightboxGallery({
  items,
  label = "Galeria de fotos",
  eager = 0,
}: LightboxGalleryProps) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <>
      <ul className="columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {items.map((item, position) => (
          <li key={item.thumb.src} className="mb-3 break-inside-avoid sm:mb-4">
            <button
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`Ampliar foto: ${item.alt}`}
              className="group relative block w-full overflow-hidden rounded-card bg-sand shadow-soft"
            >
              <Image
                src={item.thumb.src}
                alt={item.alt}
                width={item.thumb.width}
                height={item.thumb.height}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                priority={position < eager}
                className="h-auto w-full object-cover transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-105"
              />
              <span
                aria-hidden="true"
                className="absolute inset-0 bg-ink/0 transition-colors motion-safe:duration-300 group-hover:bg-ink/20"
              />
            </button>
          </li>
        ))}
      </ul>

      <Lightbox
        label={label}
        images={items.map((item) => ({ ...item.full, alt: item.alt }))}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setIndex(null)}
      />
    </>
  );
}
