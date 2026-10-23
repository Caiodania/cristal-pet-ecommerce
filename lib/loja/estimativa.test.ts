import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Catalog } from "../../content/estatua";
import { canTransition, ORDER_STATUSES, ORDER_TRANSITIONS } from "./tipos";
import { estimate, formatCents, priceItem } from "./estimativa";

const priced: Catalog = {
  version: "teste",
  sizes: [
    { id: "p", label: "P", blurb: "", scale: 0.5, cm: 10, priceCents: 10000 },
    { id: "g", label: "G", blurb: "", scale: 1, cm: 20, priceCents: 20000 },
    { id: "sem-preco", label: "?", blurb: "", scale: 1, cm: null, priceCents: null },
  ],
  poses: [
    { id: "a", label: "A", description: "", priceDeltaCents: 0 },
    { id: "b", label: "B", description: "", priceDeltaCents: 1500 },
    { id: "c", label: "C", description: "", priceDeltaCents: null },
  ],
  colors: [{ id: "x", label: "X", description: "", swatch: "#000000" }],
  secondPieceDiscountPct: null,
};

const item = (sizeId: string, poseId = "a") => ({ sizeId, poseId, colorId: "x" });

describe("priceItem", () => {
  it("soma o tamanho e o acréscimo do tipo", () => {
    assert.deepEqual(priceItem(item("p", "b"), priced), { ok: true, unitCents: 11500 });
  });

  it("acréscimo 'a definir' (null) conta como zero", () => {
    assert.deepEqual(priceItem(item("g", "c"), priced), { ok: true, unitCents: 20000 });
  });

  it("tamanho sem preço dá null, não zero", () => {
    assert.deepEqual(priceItem(item("sem-preco"), priced), { ok: true, unitCents: null });
  });

  it("recusa opções que não existem", () => {
    assert.equal(priceItem(item("zzz"), priced).ok, false);
    assert.equal(priceItem(item("p", "zzz"), priced).ok, false);
    assert.equal(priceItem({ sizeId: "p", poseId: "a", colorId: "zzz" }, priced).ok, false);
  });

  it("o catálogo provisório (sem preços) nunca inventa um valor", () => {
    assert.deepEqual(priceItem({ sizeId: "media", poseId: "sentado", colorId: "branco" }), {
      ok: true,
      unitCents: null,
    });
  });
});

describe("estimate", () => {
  it("soma os itens", () => {
    const result = estimate([item("p"), item("g", "b")], priced);
    assert.deepEqual(result, { unitCents: [10000, 21500], discountCents: 0, totalCents: 31500 });
  });

  it("total é null se algum item ainda não tem preço", () => {
    const result = estimate([item("p"), item("sem-preco")], priced);
    assert.equal(result.totalCents, null);
    assert.deepEqual(result.unitCents, [10000, null]);
  });

  it("a oferta da 2ª peça desconta as mais baratas, nunca a mais cara", () => {
    const withOffer = { ...priced, secondPieceDiscountPct: 25 };
    // 2 peças: desconta 25% da mais barata (10000 → 2500)
    assert.equal(estimate([item("g"), item("p")], withOffer).discountCents, 2500);
    assert.equal(estimate([item("g"), item("p")], withOffer).totalCents, 27500);
    // 3 peças: desconta as duas mais baratas
    assert.equal(estimate([item("g"), item("p"), item("p")], withOffer).discountCents, 5000);
    // 1 peça: sem desconto
    assert.equal(estimate([item("g")], withOffer).discountCents, 0);
  });

  it("lança erro para item inválido (o servidor valida antes)", () => {
    assert.throws(() => estimate([item("zzz")], priced), /Tamanho inválido/);
  });
});

describe("formatCents", () => {
  it("formata em reais e mostra 'A combinar' sem preço", () => {
    assert.match(formatCents(123456), /R\$\s?1\.234,56/);
    assert.equal(formatCents(null), "A combinar");
  });
});

describe("transições de status do pedido", () => {
  it("fluxo normal, cancelamento e reabertura", () => {
    assert.ok(canTransition("new", "confirmed"));
    assert.ok(canTransition("confirmed", "in_production"));
    assert.ok(canTransition("in_production", "ready"));
    assert.ok(canTransition("ready", "delivered"));
    assert.ok(canTransition("in_production", "canceled"));
    assert.ok(canTransition("canceled", "new"));
  });

  it("não pula etapas nem sai de 'entregue'", () => {
    assert.ok(!canTransition("new", "ready"));
    assert.ok(!canTransition("new", "delivered"));
    assert.ok(!canTransition("delivered", "canceled"));
    assert.ok(!canTransition("confirmed", "new"));
  });

  it("todo status tem entrada na tabela de transições", () => {
    for (const status of ORDER_STATUSES) assert.ok(status in ORDER_TRANSITIONS);
  });
});
