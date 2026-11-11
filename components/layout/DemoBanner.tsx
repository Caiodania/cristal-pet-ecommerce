"use client";

import { useConfig } from "@/lib/loja/useConfig";

/**
 * O cliente só recebe aviso quando a geração de prévias está simulada.
 * O modo da IA 3D aparece no painel do dono, onde ela é utilizada.
 */
export function DemoBanner() {
  const config = useConfig();
  if (config?.imageProvider.mode !== "mock") return null;
  return (
    <div role="status" className="bg-ink px-4 py-2 text-center text-sm font-semibold text-snow">
      Modo demonstração: as prévias são ilustrativas e não representam a foto enviada.
    </div>
  );
}
