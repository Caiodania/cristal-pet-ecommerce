import assert from "node:assert/strict";
import test from "node:test";
import { createLocalStore } from "./armazenamento";
import { normalizeCart, type CartItem } from "./carrinho";
import { productDetails, productType } from "./produtos";

const legacy = {
  id: "item-escultura",
  previewId: "previa-escultura",
  addedAt: "2026-11-10T12:00:00.000Z",
  options: { sizeId: "media", poseId: "sentado", colorId: "branco", petName: "Mel" },
};
const portrait = {
  id: "item-quadro",
  previewId: "previa-quadro",
  addedAt: "2026-11-10T12:01:00.000Z",
  options: { productType: "quadro", sizeId: "30x40", styleId: "aquarela", frameId: "preta", petName: "Luna" },
};

test("carrinho persistido continua legível após atualização, com escultura antiga e quadro", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const data = new Map<string, string>([["cp:carrinho:v1", JSON.stringify([legacy, portrait])]]);
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { localStorage: { getItem: (key: string) => data.get(key) ?? null, setItem: (key: string, value: string) => data.set(key, value) } },
  });
  try {
    const store = createLocalStore<CartItem[]>("cp:carrinho:v1", [], normalizeCart);
    assert.deepEqual(store.getServerSnapshot(), []);
    const loaded = store.get();
    assert.deepEqual(loaded.map((item) => productType(item.options)), ["escultura", "quadro"]);
    assert.equal(loaded[0].previewId, legacy.previewId);
    assert.equal(loaded[1].previewId, portrait.previewId);
    assert.match(productDetails(loaded[0].options), /Média · Sentado · Branco/);
    assert.match(productDetails(loaded[1].options), /30 × 40 cm · Aquarela · Moldura preta/);
    store.set(loaded);
    const reloaded = createLocalStore<CartItem[]>("cp:carrinho:v1", [], normalizeCart).get();
    assert.deepEqual(reloaded, loaded);
  } finally {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("dados locais incompletos ou de outro tipo não viram esculturas por engano", () => {
  for (const malformed of [null, {}, "texto", 3]) assert.deepEqual(normalizeCart(malformed), []);
  const result = normalizeCart([
    null,
    { ...portrait, options: { ...portrait.options, productType: "caneca" } },
    { ...portrait, options: { productType: "quadro", sizeId: "30x40", poseId: "sentado", colorId: "branco" } },
    { ...legacy, options: { sizeId: "media" } },
    legacy,
    { ...legacy, id: "outro-id" },
    portrait,
  ]);
  assert.deepEqual(result.map((item) => item.id), [legacy.id, portrait.id]);
});
