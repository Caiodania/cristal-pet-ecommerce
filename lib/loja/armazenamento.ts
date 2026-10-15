"use client";

// Lista guardada no navegador (localStorage) e lida com useSyncExternalStore.
// Por que não useState + useEffect: o servidor e a primeira renderização do
// navegador precisam mostrar a MESMA coisa (lista vazia), senão a hidratação
// quebra no export estático. useSyncExternalStore usa o snapshot do servidor
// na hidratação e troca pelo valor real logo depois.
//
// Tudo em try/catch: localStorage pode estar bloqueado (aba anônima, política
// do navegador). Nesse caso a lista só dura enquanto a página estiver aberta.

export type LocalStore<T> = {
  get: () => T;
  set: (value: T) => void;
  subscribe: (listener: () => void) => () => void;
  getServerSnapshot: () => T;
};

export function createLocalStore<T>(key: string, empty: T): LocalStore<T> {
  let cache: T | undefined;
  const listeners = new Set<() => void>();

  const read = (): T => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : empty;
    } catch {
      return empty;
    }
  };

  return {
    get: () => (cache ??= read()),
    set: (value) => {
      cache = value;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* sem armazenamento: vale só nesta página */
      }
      listeners.forEach((l) => l());
    },
    subscribe: (listener) => {
      listeners.add(listener);
      // outra aba mudou a lista
      const onStorage = (event: StorageEvent) => {
        if (event.key === key) {
          cache = undefined;
          listener();
        }
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
      };
    },
    getServerSnapshot: () => empty,
  };
}
