"use client";

import { catalog } from "@/content/estatua";
import { estimate, formatCents } from "@/lib/loja/estimativa";
import type { ItemConfig } from "@/lib/loja/tipos";

type Chosen = Partial<ItemConfig>;

type SummaryCardProps = {
  chosen: Chosen;
  /** Miniatura da foto escolhida (blob local). */
  photoUrl?: string;
  /** Imagem da prévia pronta (link temporário do servidor). */
  previewUrl?: string;
};

const labelOf = <T extends { id: string; label: string }>(list: T[], id?: string) =>
  list.find((item) => item.id === id)?.label;

/** Resumo sempre à vista: o que já foi escolhido e quanto custa (estimado). */
export function SummaryCard({ chosen, photoUrl, previewUrl }: SummaryCardProps) {
  const complete = chosen.sizeId && chosen.poseId && chosen.colorId;
  const total = complete ? estimate([chosen as ItemConfig]).totalCents : undefined;
  const rows: [string, string | undefined][] = [
    ["Tamanho", labelOf(catalog.sizes, chosen.sizeId)],
    ["Tipo", labelOf(catalog.poses, chosen.poseId)],
    ["Cor", labelOf(catalog.colors, chosen.colorId)],
    ["Nome", chosen.petName],
  ];

  return (
    <aside
      aria-label="Resumo da sua escultura"
      className="rounded-card border border-line bg-white p-5 shadow-soft lg:sticky lg:top-24"
    >
      <h2 className="font-display text-xl font-medium">Sua escultura</h2>

      {(photoUrl || previewUrl) && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {photoUrl && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt="Foto do seu pet" className="aspect-square w-full rounded-soft object-cover" />
              <figcaption className="mt-1 text-center text-xs text-ink-soft">Foto</figcaption>
            </figure>
          )}
          {previewUrl && (
            <figure>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Prévia da escultura" className="aspect-square w-full rounded-soft object-cover" />
              <figcaption className="mt-1 text-center text-xs text-ink-soft">Prévia</figcaption>
            </figure>
          )}
        </div>
      )}

      <dl className="mt-4 grid gap-2">
        {rows.map(([name, value]) => (
          <div key={name} className="flex justify-between gap-3 text-sm">
            <dt className="text-ink-soft">{name}</dt>
            <dd className="text-right font-semibold">{value ?? "—"}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 border-t border-line pt-4">
        <p className="flex justify-between gap-3">
          <span className="text-ink-soft">Valor estimado</span>
          <strong>{complete ? formatCents(total ?? null) : "—"}</strong>
        </p>
        <p className="mt-1 text-xs text-ink-soft">O valor final é combinado no WhatsApp.</p>
      </div>
    </aside>
  );
}
