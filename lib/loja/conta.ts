"use client";

// Estado da conta do cliente no navegador: quem está logado e a cota de prévias.
//
// A verdade vive no servidor (cookie HttpOnly da sessão): o JavaScript do site
// não enxerga o cookie, só pergunta `GET /api/auth/me`. Aqui fica uma cópia da
// resposta, compartilhada por quem precisar (cabeçalho, configurador, carrinho)
// e lida com useSyncExternalStore, como o carrinho.

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { clearCart } from "./carrinho";
import type { AccountDto, AuthResultDto, QuotaDto } from "./tipos";

type State = {
  /** "loading" até a primeira resposta do servidor. */
  status: "loading" | "ready";
  user: AccountDto | null;
  quota?: QuotaDto;
};

const LOADING: State = { status: "loading", user: null };
let state: State = LOADING;
let started = false;
const listeners = new Set<() => void>();

function publish(next: State) {
  state = next;
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Pergunta ao servidor quem está logado e atualiza todo mundo. */
export async function refreshAccount(): Promise<void> {
  try {
    const me = await api.auth.me();
    remember(me.user?.id);
    publish({ status: "ready", user: me.user, quota: me.quota });
  } catch {
    // API fora do ar: segue como visitante (navegar continua funcionando)
    publish({ status: "ready", user: null });
  }
}

/** O carrinho é da conta: se quem entrou não é quem montou o carrinho, ele é esvaziado. */
function remember(userId: string | undefined) {
  if (!userId) return;
  try {
    const key = "cp:conta";
    const previous = window.localStorage.getItem(key);
    if (previous && previous !== userId) clearCart();
    window.localStorage.setItem(key, userId);
  } catch {
    /* sem armazenamento */
  }
}

function applyResult(result: AuthResultDto) {
  if (result.user) {
    remember(result.user.id);
    publish({ status: "ready", user: result.user, quota: result.quota });
  }
  return result;
}

export const account = {
  async login(input: { email: string; password: string }) {
    return applyResult(await api.auth.login(input));
  },
  async signup(input: { name: string; email: string; password: string; turnstileToken?: string }) {
    return applyResult(await api.auth.signup(input));
  },
  /** Depois do link do e-mail (confirmação ou Google). */
  async confirm(accessToken: string) {
    return applyResult(await api.auth.confirm(accessToken));
  },
  async reset(input: { accessToken: string; password: string }) {
    return applyResult(await api.auth.reset(input));
  },
  async logout() {
    try {
      await api.auth.logout();
    } finally {
      clearCart();
      publish({ status: "ready", user: null });
    }
  },
  refresh: refreshAccount,
};

/** A conta atual e a cota. Na primeira vez que alguém usa, consulta o servidor. */
export function useAccount() {
  const snapshot = useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
  useEffect(() => {
    if (!started) {
      started = true;
      void refreshAccount();
    }
  }, []);
  return snapshot;
}

/** Caminho interno seguro para voltar depois do login (nunca um endereço de outro site). */
export function safeNext(value: string | null | undefined, fallback = "/minha-conta"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  return value;
}
