"use client";

// O pedido para abrir o diálogo de "Entrar / Criar conta". Qualquer parte do
// site (cabeçalho, configurador, carrinho) chama `openAuth`; um único diálogo,
// montado no layout, responde. Assim a pessoa entra SEM sair da página: o que
// ela já escolheu (e a foto) não se perde.

import { useSyncExternalStore } from "react";

export type AuthDialogRequest = {
  /** Qual aba abrir primeiro. */
  tab: "login" | "signup";
  /** Frase no topo: por que a conta é necessária ("Faça login para gerar a prévia…"). */
  reason?: string;
  /** Roda depois que a pessoa entra (ex.: continuar gerando a prévia). */
  onSuccess?: () => void;
};

let current: AuthDialogRequest | null = null;
const listeners = new Set<() => void>();

function publish(next: AuthDialogRequest | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

export const openAuth = (request: AuthDialogRequest) => publish(request);
export const closeAuth = () => publish(null);

export function useAuthDialog(): AuthDialogRequest | null {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => null,
  );
}

const NEXT_KEY = "cp:proximo";

/** Guarda para onde voltar depois de um desvio (link do e-mail, Google). */
export function rememberNext(path: string) {
  try {
    window.sessionStorage.setItem(NEXT_KEY, path);
  } catch {
    /* sem armazenamento */
  }
}

export function takeNext(): string | null {
  try {
    const value = window.sessionStorage.getItem(NEXT_KEY);
    window.sessionStorage.removeItem(NEXT_KEY);
    return value;
  } catch {
    return null;
  }
}
