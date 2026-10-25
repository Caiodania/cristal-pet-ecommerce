// Acesso do dono (painel). NÃO existe senha própria do painel nem tela de login
// do painel: o dono entra pelo login normal do site, com a conta dele, e o
// servidor só libera o painel se o e-mail da conta estiver em ADMIN_EMAILS.
//
// Quem não é o dono (visitante ou cliente) recebe 404 em /api/admin/*, a mesma
// resposta de uma rota que não existe: nada revela que o painel existe.

import type { Ctx } from "./context";
import { HttpError } from "./http";
import { currentUser } from "./services/accounts";
import type { ProfileRecord } from "./store/types";

/** A resposta de "esta rota não existe": a mesma para o painel negado e para o que de fato não existe. */
export const routeNotFound = () => new HttpError(404, "not_found", "Rota não encontrada.");

/** A conta logada, se for a do dono. */
export async function currentAdmin(ctx: Ctx, req: Request): Promise<ProfileRecord | null> {
  const user = await currentUser(ctx, req);
  return user && ctx.config.adminEmails.includes(user.email.trim().toLowerCase()) ? user : null;
}

/** Barra quem não é o dono, com 404 (não 401/403, que confirmariam que a rota existe). */
export async function requireAdmin(ctx: Ctx, req: Request): Promise<ProfileRecord> {
  const admin = await currentAdmin(ctx, req);
  if (!admin) throw routeNotFound();
  return admin;
}

/**
 * Pedidos que mudam dados vindos com cookie devem sair do próprio site. O
 * SameSite=Strict já barra o caso comum; isto fecha o resto.
 */
export function assertSameOrigin(ctx: Ctx, req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return; // chamadas sem Origin não vêm de navegador de terceiros
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, "forbidden", "Origem inválida.");
  }
  if (originHost !== host && !ctx.config.allowedOrigins.includes(origin)) {
    throw new HttpError(403, "forbidden", "Origem não permitida.");
  }
}
