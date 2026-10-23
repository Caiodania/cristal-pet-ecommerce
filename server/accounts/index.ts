// Escolhe o provedor de login conforme a configuração (AUTH_PROVIDER).

import type { ServerConfig } from "../env";
import { createMemoryAuth } from "./memory";
import { createSupabaseAuth } from "./supabase";
import type { AuthProvider } from "./types";

export function resolveAuth(config: ServerConfig, now: () => Date): AuthProvider {
  if (config.authProvider === "supabase") {
    if (!config.supabaseUrl || !config.supabaseAnonKey) {
      throw new Error("AUTH_PROVIDER=supabase exige SUPABASE_URL e SUPABASE_ANON_KEY.");
    }
    return createSupabaseAuth(config.supabaseUrl, config.supabaseAnonKey);
  }
  return createMemoryAuth({ requireVerification: config.authMemoryVerify, now });
}

export type { AuthProvider, AuthUser } from "./types";
export { AuthError } from "./types";
