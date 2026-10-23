import Image from "next/image";
import { Placeholder } from "@/components/ui/Placeholder";
import type { Exemplo } from "@/content/exemplos";

/**
 * Cartão de exemplo, no formato das referências: a escultura em destaque, o
 * selo "Escultura 3D" no canto, a foto original num círculo e o nome do pet
 * numa etiqueta. Sem a escultura (ainda não gerada), mostra o espaço reservado,
 * mas já com a foto real do pet no círculo.
 */
export function SculptureCard({ item, priority = false }: { item: Exemplo; priority?: boolean }) {
  const { sculpture, photo, name } = item;
  return (
    <figure className="group relative overflow-hidden rounded-3xl bg-sand shadow-lift transition-[translate,box-shadow] duration-300 hover:-translate-y-1.5">
      {sculpture ? (
        <>
          <Image
            src={sculpture.src}
            alt={sculpture.alt}
            width={sculpture.width}
            height={sculpture.height}
            sizes="(max-width: 640px) 72vw, (max-width: 1024px) 45vw, 25vw"
            priority={priority}
            className="aspect-[4/5] w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-full bg-magenta px-3 py-1 text-xs font-bold text-white">
            Escultura 3D
          </span>
        </>
      ) : (
        <Placeholder
          label={`Escultura de ${name}`}
          todo={`TODO-FOTO: escultura de ${name} (npm run esculturas; veja docs/prompts-esculturas.md)`}
          ratio="portrait"
          className="rounded-none border-0"
        />
      )}

      <span className="absolute right-3 top-3 size-16 overflow-hidden rounded-full border-4 border-white shadow-soft sm:size-20">
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes="80px"
          className="size-full object-cover"
        />
      </span>

      <figcaption className="absolute bottom-3 right-3 rounded-full bg-ink px-3 py-1 text-sm font-bold text-white">
        {name}
      </figcaption>
    </figure>
  );
}
