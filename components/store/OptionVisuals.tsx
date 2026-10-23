import Image from "next/image";
import { SculptureIllustration } from "@/components/ui/illustrations";
import { optionImage, type OptionKind } from "@/content/opcoes";

// Imagens dos cartões do configurador. Preenchem o espaço do cartão (position:
// absolute) e são decorativas: o nome e a descrição da opção já dizem tudo.

/** Foto da opção (tipo ou cor) se existir; senão, a ilustração na cor dada. */
export function OptionVisual({
  kind,
  id,
  pose,
  tint,
  sizes = "(max-width: 640px) 112px, 280px",
}: {
  kind: Exclude<OptionKind, "nome">;
  id: string;
  /** Pose da ilustração de reserva. */
  pose: string;
  tint: string;
  sizes?: string;
}) {
  const photo = optionImage(kind, id, "");
  if (photo) {
    return (
      <Image
        src={photo.src}
        alt=""
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        className="absolute inset-0 size-full object-cover"
      />
    );
  }
  return (
    <span className="absolute inset-0 grid place-items-end bg-gradient-to-b from-teal-mist to-sand p-3">
      <SculptureIllustration pose={pose} tint={tint} />
    </span>
  );
}

/**
 * Escala de tamanho: o mesmo cachorrinho em três alturas, apoiado na mesma
 * "prateleira". A altura real em cm entra ao lado quando o dono definir.
 */
export function SizeVisual({ scale, tint }: { scale: number; tint: string }) {
  return (
    <span className="absolute inset-0 flex items-end justify-center bg-gradient-to-b from-teal-mist to-sand px-3 pb-3">
      <span style={{ width: `${Math.round(scale * 72)}%` }} className="block">
        <SculptureIllustration pose="sentado" tint={tint} />
      </span>
    </span>
  );
}
