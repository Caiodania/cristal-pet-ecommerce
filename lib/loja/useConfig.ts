"use client";

import { useEffect, useState } from "react";
import { api } from "./api";
import type { ConfigDto } from "./tipos";

// Uma consulta só por carregamento de página, compartilhada por quem precisar.
let pending: Promise<ConfigDto> | undefined;

export function loadConfig(): Promise<ConfigDto> {
  pending ??= api.config().catch((error) => {
    pending = undefined; // permite tentar de novo
    throw error;
  });
  return pending;
}

/** Configuração pública da loja (modo demonstração, cotas…). null enquanto carrega ou se a API estiver fora. */
export function useConfig(): ConfigDto | null {
  const [config, setConfig] = useState<ConfigDto | null>(null);
  useEffect(() => {
    let active = true;
    loadConfig()
      .then((value) => active && setConfig(value))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  return config;
}
