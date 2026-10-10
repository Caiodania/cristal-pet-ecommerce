"use client";

import Image from "next/image";
import { useState } from "react";
import type { Img } from "@/content/images";
import { Lightbox } from "./Lightbox";

type Certificate = { ano: string; categoria: string; image: Img };

/** Certificados em miniatura; cada um amplia no Lightbox. */
export function CertificatesGallery({
  certificates,
}: {
  certificates: Certificate[];
}) {
  const [index, setIndex] = useState<number | null>(null);

  return (
    <>
      <ul className="grid gap-4 sm:grid-cols-2">
        {certificates.map((certificate, position) => (
          <li key={certificate.ano}>
            <button
              type="button"
              onClick={() => setIndex(position)}
              aria-label={`Ampliar certificado IPOPE ${certificate.ano}, ${certificate.categoria}`}
              className="group block w-full overflow-hidden rounded-soft border border-line bg-white text-left shadow-soft"
            >
              <Image
                src={certificate.image.src}
                alt={certificate.image.alt}
                width={certificate.image.width}
                height={certificate.image.height}
                sizes="(max-width: 640px) 90vw, 360px"
                className="h-auto w-full transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.02]"
              />
              <span className="block px-4 py-3 text-sm font-semibold">
                IPOPE {certificate.ano}
                <span className="font-normal text-ink-soft"> · {certificate.categoria}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      <Lightbox
        label="Certificados IPOPE"
        images={certificates.map((certificate) => certificate.image)}
        index={index}
        onIndexChange={setIndex}
        onClose={() => setIndex(null)}
      />
    </>
  );
}
