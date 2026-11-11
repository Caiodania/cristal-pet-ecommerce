import assert from "node:assert/strict";
import test from "node:test";
import { fallbackMessage, orderMessage } from "./pedido-whatsapp";
import type { ItemConfig } from "./tipos";

const items: ItemConfig[] = [
  { sizeId: "media", poseId: "sentado", colorId: "branco", petName: "Mel" },
  { productType: "quadro", sizeId: "30x40", styleId: "aquarela", frameId: "natural", petName: "Luna" },
];

test("mensagem de pedido misto identifica cada produto, suas opções e uma unidade por item", () => {
  const message = orderMessage({ code: "CP-123ABC", items, estimateCents: null, trackUrl: "https://loja.example/pedido?c=CP-123ABC&t=token" });
  assert.match(message, /Pedido: CP-123ABC/);
  assert.match(message, /1\. 1x Escultura 3D · Média · Sentado · Branco · "Mel"/);
  assert.match(message, /2\. 1x Quadro personalizado · 30 × 40 cm · Aquarela · Moldura madeira natural · "Luna"/);
  assert.doesNotMatch(message, /2x Quadro/);
  assert.match(message, /A combinar/i);
  assert.match(message, /Acompanhar: https:\/\/loja\.example\/pedido/);
});

test("mensagem alternativa mantém especificações dos quadros e informa que não há pedido registrado", () => {
  const message = fallbackMessage([items[1]]);
  assert.match(message, /não conseguiu registrar o pedido/);
  assert.match(message, /Quadro personalizado · 30 × 40 cm · Aquarela · Moldura madeira natural/);
  assert.doesNotMatch(message, /escultura 3D/i);
});
