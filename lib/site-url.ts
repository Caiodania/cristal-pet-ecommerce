// URL pública do site, sem barra final. Vem de NEXT_PUBLIC_SITE_URL (ver
// next.config.ts); nunca fixe o domínio no código.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/+$/, "");
