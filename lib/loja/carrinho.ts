"use client";

// Carrinho e histórico de pedidos, guardados neste aparelho (sem login).

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
const cartStore = createLocalStore<CartItem[]>("cp:carrinho:v1", EMPTY_CART);

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

// ───────── Sessão anônima ─────────

/** Identifica o visitante (sem conta) para a cota diária de prévias. */
export function getSessionId(): string {
  const key = "cp:sessao";
  try {
    const saved = window.localStorage.getItem(key);
    if (saved && /^[A-Za-z0-9_-]{16,64}$/.test(saved)) return saved;
    const created = crypto.randomUUID().replace(/-/g, "");
    window.localStorage.setItem(key, created);
    return created;
  } catch {
    // sem armazenamento: um id por carregamento da página
    return (globalThis as { __cpSession?: string }).__cpSession ??= crypto.randomUUID().replace(/-/g, "");
  }
}
