import { portraitCatalog } from "@/content/quadros";
import { estimate, formatCents } from "@/lib/loja/estimativa";
import type { PortraitConfig } from "@/lib/loja/tipos";
import { PortraitVisual } from "./PortraitVisual";

export function PortraitSummary({ chosen, photoUrl, previewUrl }: { chosen: Partial<PortraitConfig>; photoUrl?: string; previewUrl?: string }) {
  const complete = chosen.sizeId && chosen.styleId && chosen.frameId;
  const rows = [
    ["Tamanho", portraitCatalog.sizes.find((item) => item.id === chosen.sizeId)?.label],
    ["Estilo", portraitCatalog.styles.find((item) => item.id === chosen.styleId)?.label],
    ["Moldura", portraitCatalog.frames.find((item) => item.id === chosen.frameId)?.label],
    ["Nome", chosen.petName || "Sem nome na arte"],
  ];
  return (
    <aside aria-label="Resumo do seu quadro" className="rounded-card border border-line border-t-4 border-t-gold bg-white p-5 shadow-soft lg:sticky lg:top-24">
      <h2 className="font-display text-xl font-extrabold">Seu quadro</h2>
      <div className="mt-4 overflow-hidden rounded-soft">
        <PortraitVisual {...chosen} name={chosen.petName} photoUrl={previewUrl || photoUrl} imageAlt={previewUrl ? "Prévia da arte do seu pet com simulação de moldura" : undefined} />
      </div>
      <p className="mt-2 text-center text-xs text-ink-soft">{previewUrl ? "Prévia da arte com simulação de moldura." : "Composição ilustrativa. Gere a prévia para ver a sua arte."}</p>
      <dl className="mt-5 grid gap-2">
        {rows.map(([label, value]) => <div key={label} className="flex justify-between gap-3 text-sm"><dt className="text-ink-soft">{label}</dt><dd className="text-right font-semibold">{value ?? "—"}</dd></div>)}
      </dl>
      <div className="mt-4 rounded-soft bg-gold-mist p-3">
        <p className="flex justify-between gap-3"><span className="text-ink-soft">Valor estimado</span><strong>{complete ? formatCents(estimate([chosen as PortraitConfig]).totalCents) : "—"}</strong></p>
        <p className="mt-2 text-xs text-ink-soft">Produção por parceiro. Confirmamos acabamento, valor e prazo pelo WhatsApp antes de produzir.</p>
      </div>
    </aside>
  );
}
