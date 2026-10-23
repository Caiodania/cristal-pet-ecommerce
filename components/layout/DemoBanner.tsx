"use client";

import { useConfig } from "@/lib/loja/useConfig";

/**
 * Aviso de "modo demonstração": aparece enquanto qualquer IA for simulada
 * (IMAGE_PROVIDER ou MODEL_PROVIDER = mock). Impede que alguém confunda a
 * prévia simulada com a escultura de verdade. Some sozinho quando as duas IAs
 * reais forem ligadas.
 */
export function DemoBanner() {
  const config = useConfig();
  if (config?.mode !== "demo") return null;
  return (
    <div role="status" className="bg-ink px-4 py-2 text-center text-sm font-semibold text-cream">
      Modo demonstração: as prévias e os arquivos 3D são simulados e não valem como pedido real.
    </div>
  );
}
