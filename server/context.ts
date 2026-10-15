// Monta tudo o que o servidor precisa (configuração, banco, arquivos e
// provedores de IA) a partir das variáveis de ambiente. Testes montam o seu
// próprio contexto, com tudo em memória e relógio controlado.

import { loadConfig, type ServerConfig } from "./env";
import { resolveProviders, type Providers } from "./providers";
import { createMemoryStore } from "./store/memory";
import { createSupabaseStore } from "./store/supabase";
import type { Store } from "./store/types";
import { createMemoryFileStore, createSupabaseFileStore, type FileStore } from "./storage";

export type Ctx = {
  config: ServerConfig;
  store: Store;
  files: FileStore;
  providers: Providers;
  now: () => Date;
};

export function createContext(
  env: Record<string, string | undefined> = process.env,
  overrides: Partial<Ctx> = {},
): Ctx {
  const config = overrides.config ?? loadConfig(env);
  const now = overrides.now ?? (() => new Date());

  const needSupabase = () => {
    if (!config.supabaseUrl || !config.supabaseServiceKey) {
      throw new Error("STORE/FILES=supabase exige SUPABASE_URL e SUPABASE_SERVICE_KEY.");
    }
    return { url: config.supabaseUrl, key: config.supabaseServiceKey };
  };

  const store =
    overrides.store ??
    (config.store === "supabase"
      ? createSupabaseStore(needSupabase().url, needSupabase().key)
      : createMemoryStore(now));

  const files =
    overrides.files ??
    (config.files === "supabase"
      ? createSupabaseFileStore(needSupabase().url, needSupabase().key, config.supabaseBucket)
      : createMemoryFileStore(config.sessionSecret));

  return { config, store, files, providers: overrides.providers ?? resolveProviders(config), now };
}

let shared: Ctx | undefined;

/** Contexto único do processo (uma instância da função reaproveita entre chamadas). */
export function getContext(): Ctx {
  shared ??= createContext();
  return shared;
}
