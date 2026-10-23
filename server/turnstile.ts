// Captcha (Cloudflare Turnstile), opcional: só vale se TURNSTILE_SECRET estiver
// definido. Protege o cadastro, onde se cria conta em massa para ganhar prévias.

import type { Ctx } from "./context";
import { HttpError } from "./http";

export async function verifyTurnstile(ctx: Ctx, token: string | undefined, ip: string): Promise<void> {
  if (!ctx.config.turnstileSecret) return;
  if (!token) throw new HttpError(400, "captcha_required", "Confirme que você não é um robô.");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: ctx.config.turnstileSecret, response: token, remoteip: ip }),
  });
  const result = (await response.json()) as { success?: boolean };
  if (!result.success) {
    throw new HttpError(400, "captcha_failed", "Não foi possível confirmar que você não é um robô. Tente de novo.");
  }
}
