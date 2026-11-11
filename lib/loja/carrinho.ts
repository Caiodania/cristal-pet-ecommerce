"use client";

// Carrinho e atalho dos pedidos, guardados neste aparelho. As prévias do
// carrinho são da conta que as gerou: ao sair (ou entrar em outra conta) o
// carrinho é esvaziado. Os pedidos de verdade ficam na conta (Meus pedidos).

import { useSyncExternalStore } from "react";
import { createLocalStore } from "./armazenamento";
import type { ItemConfig } from "./tipos";

// ───────── Carrinho ─────────

export type CartItem = {
  /** Id local do item (não vai para o servidor). */
  id: string;
  /** Id público da prévia no servidor: é o que o pedido referencia. */
  previewId: string;
  options: ItemConfig;
  addedAt: string;
};

const EMPTY_CART: CartItem[] = [];

/** Lê a versão existente do carrinho sem confundir esculturas antigas com quadros. */
export function normalizeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  const items: CartItem[] = [];
  const ids = new Set<string>();
  const previewIds = new Set<string>();
  const hasText = (entry: unknown): entry is string => typeof entry === "string" && entry.trim().length > 0;

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const { id, previewId, addedAt, options } = entry as Record<string, unknown>;
    if (!hasText(id) || !hasText(previewId) || !hasText(addedAt) || ids.has(id) || previewIds.has(previewId)) continue;
    if (!options || typeof options !== "object") continue;
    const config = options as Record<string, unknown>;
    if (!hasText(config.sizeId)) continue;
    const petName = typeof config.petName === "string" ? config.petName : undefined;
    let normalized: ItemConfig;
    if (config.productType === "quadro") {
      if (!hasText(config.styleId) || !hasText(config.frameId)) continue;
      normalized = { productType: "quadro", sizeId: config.sizeId, styleId: config.styleId, frameId: config.frameId, petName };
    } else if (config.productType === undefined || config.productType === "escultura") {
      if (!hasText(config.poseId) || !hasText(config.colorId)) continue;
      normalized = { productType: "escultura", sizeId: config.sizeId, poseId: config.poseId, colorId: config.colorId, petName };
    } else {
      continue;
    }
    items.push({ id, previewId, addedAt, options: normalized });
    ids.add(id);
    previewIds.add(previewId);
  }
  return items;
}

const cartStore = createLocalStore<CartItem[]>("cp:carrinho:v1", EMPTY_CART, normalizeCart);

/** Esvazia o carrinho (troca de conta). */
export const clearCart = () => cartStore.set(EMPTY_CART);

export function useCart() {
  const items = useSyncExternalStore(cartStore.subscribe, cartStore.get, cartStore.getServerSnapshot);
  return {
    items,
    count: items.length,
    /** Uma prévia só entra uma vez no carrinho. */
    add(previewId: string, options: ItemConfig) {
      const current = cartStore.get();
      if (current.some((i) => i.previewId === previewId)) return;
      cartStore.set([
        ...current,
        { id: crypto.randomUUID(), previewId, options, addedAt: new Date().toISOString() },
      ]);
    },
    remove(id: string) {
      cartStore.set(cartStore.get().filter((i) => i.id !== id));
    },
    clear() {
      cartStore.set(EMPTY_CART);
    },
  };
}

// ───────── Histórico de pedidos deste aparelho ─────────

export type OrderRef = {
  code: string;
  /** Token do link do cliente: sem ele o servidor não mostra o pedido. */
  token: string;
  createdAt: string;
  itemCount: number;
};

const EMPTY_ORDERS: OrderRef[] = [];
const ordersStore = createLocalStore<OrderRef[]>("cp:pedidos:v1", EMPTY_ORDERS);

export function useOrderHistory() {
  const orders = useSyncExternalStore(ordersStore.subscribe, ordersStore.get, ordersStore.getServerSnapshot);
  return {
    orders,
    count: orders.length,
    add(ref: OrderRef) {
      const current = ordersStore.get().filter((o) => o.code !== ref.code);
      ordersStore.set([ref, ...current].slice(0, 50));
    },
  };
}

