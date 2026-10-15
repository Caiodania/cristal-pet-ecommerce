// Configuração do servidor, lida das variáveis de ambiente (Netlify: Site
// configuration > Environment variables). Veja `.env.example` para a lista
// completa. Nada aqui tem prefixo NEXT_PUBLIC_: segredos nunca vão para o site.

import { randomBytes } from "node:crypto";

export type ServerConfig = {
  /** true em produção na Netlify (ou NODE_ENV=production). */
  isProd: boolean;
  siteUrl: string;

  // Painel do dono
  adminPassword?: string;
  sessionSecret: string;
  sessionTtlSeconds: number;

  // Provedores de IA
  imageProvider: string;
  modelProvider: string;
  /** Quando gerar o arquivo 3D sozinho: nunca (só pelo painel), ao receber o pedido, ou ao confirmar. */
  modelAuto: "never" | "order" | "confirmed";
  /** Só os provedores simulados: quanto demoram para "terminar". */
  mockDelayMs: number

  // Proteção de custo e abuso
  previewsPerDay: number;
  previewsPerDayPerIp: number;
  /** Teto diário de gasto com IA, em centavos. 0 = sem teto. */
  dailyBudgetCents: number;
  generationTimeoutMs: number;
  ipHashSalt: string;
  turnstileSecret?: string;
  turnstileSiteKey?: string;
  maxPhotoBytes: number;

  // Dados
  store: "memory" | "supabase";
  files: "memory" | "supabase";
  supabaseUrl?: string;
  supabaseServiceKey?: string;
  supabaseBucket: string;

  /** Origens extras com acesso (CORS): só para desenvolvimento (next dev em outra porta). */
  allowedOrigins: string[];
};

type Env = Record<string, string | undefined>;

const int = (value: string | undefined, fallback: number) => {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) ? n : fallback;
};

export function loadConfig(env: Env = process.env): ServerConfig {
  const isProd =
    env.NODE_ENV === "production" ||
    (env.NETLIFY === "true" && env.CONTEXT === "production");

  const store = (env.STORE ?? (env.SUPABASE_URL ? "supabase" : "memory")) as ServerConfig["store"];
  const files = (env.FILES ?? store) as ServerConfig["files"];

  if (isProd && (store === "memory" || files === "memory") && env.ALLOW_MEMORY_STORE !== "1") {
    throw new Error(
      "Em produção os dados não podem ficar em memória (somem a cada execução). " +
        "Configure SUPABASE_URL e SUPABASE_SERVICE_KEY (veja .env.example).",
    );
  }

  const sessionSecret = env.ADMIN_SESSION_SECRET ?? randomBytes(32).toString("hex");
  if (isProd && !env.ADMIN_SESSION_SECRET) {
    throw new Error("Configure ADMIN_SESSION_SECRET em produção.");
  }

  return {
    isProd,
    siteUrl: env.SITE_URL ?? env.URL ?? "http://localhost:8888",

    adminPassword: env.ADMIN_PASSWORD || undefined,
    sessionSecret,
    sessionTtlSeconds: int(env.ADMIN_SESSION_TTL_SECONDS, 60 * 60 * 12),

    imageProvider: env.IMAGE_PROVIDER ?? "mock",
    modelProvider: env.MODEL_PROVIDER ?? "mock",
    modelAuto: (["never", "order", "confirmed"].includes(env.MODEL_AUTO ?? "")
      ? env.MODEL_AUTO
      : "never") as ServerConfig["modelAuto"],
    mockDelayMs: int(env.MOCK_DELAY_MS, 2500),

    previewsPerDay: int(env.PREVIEWS_PER_DAY, 3),
    previewsPerDayPerIp: int(env.PREVIEWS_PER_DAY_PER_IP, 8),
    dailyBudgetCents: int(env.PREVIEW_DAILY_BUDGET_CENTS, 0),
    generationTimeoutMs: int(env.GENERATION_TIMEOUT_MS, 5 * 60 * 1000),
    ipHashSalt: env.IP_HASH_SALT ?? sessionSecret,
    turnstileSecret: env.TURNSTILE_SECRET || undefined,
    turnstileSiteKey: env.TURNSTILE_SITE_KEY || env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || undefined,
    maxPhotoBytes: int(env.MAX_PHOTO_BYTES, 5 * 1024 * 1024),

    store,
    files,
    supabaseUrl: env.SUPABASE_URL || undefined,
    supabaseServiceKey: env.SUPABASE_SERVICE_KEY || undefined,
    supabaseBucket: env.SUPABASE_BUCKET ?? "cristal-pet",

    allowedOrigins: (env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
  };
}
