"use client";

import { useId } from "react";
import type { Img } from "@/content/images";

// Faixas de luminosidade de cada fotografia. A normalização permite simular
// materiais claros também no busto preto, preservando os detalhes do relevo.
const tones: Record<string, { shadow: number; highlight: number; gamma?: number }> = {
  "na-pose": { shadow: 0.2, highlight: 0.84 },
  sentado: { shadow: 0.17, highlight: 0.7 },
  busto: { shadow: 0.01, highlight: 0.8, gamma: 0.55 },
};

function materialRamp(hex: string, poseId: string) {
  const rgb = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const { shadow, highlight, gamma = 1 } = tones[poseId] ?? tones.sentado;
  return rgb.map((channel) => Array.from({ length: 64 }, (_, index) => {
    const light = Math.pow(Math.max(0, Math.min(1, (index / 63 - shadow) / (highlight - shadow))), gamma);
    const middle = channel * 0.88;
    const value = light < 0.6
      ? channel * 0.24 + (middle - channel * 0.24) * (light / 0.6)
      : middle + (channel + (1 - channel) * 0.2 - middle) * ((light - 0.6) / 0.4);
    return value.toFixed(4);
  }).join(" "));
}

/**
 * A foto original permanece intacta. Uma segunda camada usa a mesma imagem,
 * com a cor do material aplicada apenas dentro da máscara da escultura/base.
 * Cenário, textos da foto e sombras externas nunca passam pelo filtro.
 */
export function SculpturePreview({
  photo,
  poseId,
  tint,
  label,
}: {
  photo: Img;
  poseId: string;
  tint: string;
  label: string;
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const filterId = `material-${id}`;
  const maskId = `sculpture-${id}`;
  const [red, green, blue] = materialRamp(tint, poseId);

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={label}
      viewBox="0 0 640 800"
      className="absolute inset-0 size-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        <filter id={filterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="table" tableValues={red} />
            <feFuncG type="table" tableValues={green} />
            <feFuncB type="table" tableValues={blue} />
            <feFuncA type="identity" />
          </feComponentTransfer>
        </filter>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="640" height="800" style={{ maskType: "alpha" }}>
          <image href={`/images/opcoes/mascaras/tipo-${poseId}.svg?v=20261112`} width="640" height="800" />
        </mask>
      </defs>
      <image href={photo.src} width="640" height="800" />
      <image href={photo.src} width="640" height="800" filter={`url(#${filterId})`} mask={`url(#${maskId})`} />
    </svg>
  );
}
