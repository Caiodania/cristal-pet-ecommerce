import Image from "next/image";
import { ArrowRightIcon } from "@/components/ui/icons";
import { Placeholder } from "@/components/ui/Placeholder";
import { petItems } from "@/content/gallery";

// Uma foto real da galeria faz o papel de "foto enviada pelo cliente".
const photo =
  petItems.find((item) => item.thumb.src.includes("lulu-creme-gravata-branca")) ??
  petItems[0];

/**
 * Hero visual: a foto do pet vira a prévia da escultura. A foto é real; a
 * prévia é um espaço reservado até existirem esculturas para fotografar
 * (TODO-FOTO).
 */
export function PhotoToStatue({ className }: { className?: string }) {
  return (
    <div
      className={`mx-auto grid w-full max-w-xl grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4 ${className ?? ""}`}
    >
      <figure className="-rotate-2 overflow-hidden rounded-card border-4 border-white bg-white shadow-lift">
        <Image
          src={photo.thumb.src}
          alt={photo.alt}
          width={photo.thumb.width}
          height={photo.thumb.height}
          sizes="(max-width: 640px) 40vw, 240px"
          priority
          className="aspect-[4/5] w-full object-cover"
        />
        <figcaption className="px-3 py-2 text-center text-sm font-semibold text-ink-soft">
          A foto do seu pet
        </figcaption>
      </figure>

      <span
        aria-hidden="true"
        className="grid size-10 place-items-center rounded-full bg-teal text-ink shadow-soft"
      >
        <ArrowRightIcon className="text-xl" />
      </span>

      <figure className="rotate-2 overflow-hidden rounded-card border-4 border-white bg-white shadow-lift">
        <Placeholder
          label="Prévia 3D da escultura"
          todo="TODO-FOTO: imagem da prévia 3D / escultura para o hero"
          ratio="portrait"
          className="rounded-none border-0"
        />
        <figcaption className="px-3 py-2 text-center text-sm font-semibold text-ink-soft">
          A escultura em 3D
        </figcaption>
      </figure>
    </div>
  );
}
