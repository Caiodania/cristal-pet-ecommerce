// Cálculo da estimativa do pedido. Função pura, usada nos dois lados: o site
// mostra o valor; o servidor RECALCULA ao gravar o pedido e ignora o que o
// navegador mandou. O valor final é sempre combinado no WhatsApp.

import { catalog as defaultCatalog, type Catalog } from "../../content/estatua";
import type { ItemConfig } from "./tipos";

export type PriceResult =
  | { ok: true; unitCents: number | null }
  | { ok: false; error: string };

/**
 * Preço de UMA escultura: tamanho + acréscimo do tipo.
 * Devolve `unitCents: null` quando o tamanho ainda não tem preço (a definir).
 * Um acréscimo `null` (a definir) conta como 0.
 */
export function priceItem(config: ItemConfig, catalog: Catalog = defaultCatalog): PriceResult {
  const size = catalog.sizes.find((s) => s.id === config.sizeId);
  const pose = catalog.poses.find((p) => p.id === config.poseId);
  const color = catalog.colors.find((c) => c.id === config.colorId);
  if (!size) return { ok: false, error: `Tamanho inválido: ${config.sizeId}` };
  if (!pose) return { ok: false, error: `Tipo inválido: ${config.poseId}` };
  if (!color) return { ok: false, error: `Cor inválida: ${config.colorId}` };
  if (size.priceCents === null) return { ok: true, unitCents: null };
  return { ok: true, unitCents: size.priceCents + (pose.priceDeltaCents ?? 0) };
}

export type Estimate = {
  /** Preço unitário de cada item, na ordem recebida (null = a definir). */
  unitCents: (number | null)[];
  /** Desconto total da oferta da 2ª peça (0 se não houver). */
  discountCents: number;
  /** Total; null se algum item ainda não tem preço. */
  totalCents: number | null;
};

/**
 * Estimativa do carrinho. A oferta da 2ª peça (se `secondPieceDiscountPct`
 * existir) vale para todas as peças a partir da 2ª, começando pelas mais
 * baratas, para o desconto nunca recair sobre a mais cara.
 */
export function estimate(items: ItemConfig[], catalog: Catalog = defaultCatalog): Estimate {
  const unitCents: (number | null)[] = [];
  for (const item of items) {
    const result = priceItem(item, catalog);
    if (!result.ok) throw new Error(result.error);
    unitCents.push(result.unitCents);
  }

  if (unitCents.some((u) => u === null)) {
    return { unitCents, discountCents: 0, totalCents: null };
  }

  const prices = (unitCents as number[]).slice();
  const subtotal = prices.reduce((sum, p) => sum + p, 0);
  const pct = catalog.secondPieceDiscountPct;
  let discountCents = 0;
  if (pct && prices.length > 1) {
    const cheapestFirst = prices.slice().sort((a, b) => a - b);
    const discounted = cheapestFirst.slice(0, cheapestFirst.length - 1);
    discountCents = Math.round(discounted.reduce((sum, p) => sum + p, 0) * (pct / 100));
  }
  return { unitCents, discountCents, totalCents: subtotal - discountCents };
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** "R$ 1.234,50" ou "A combinar" quando ainda não há preço. */
export function formatCents(cents: number | null): string {
  return cents === null ? "A combinar" : brl.format(cents / 100);
}
