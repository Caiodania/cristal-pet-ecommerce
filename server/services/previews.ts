// Prévia: foto do cliente → imagem da escultura (IA de imagem).
//
// Fluxo (cada passo é uma chamada da API):
//   1. createPreview   cria o registro, confere cotas e limite de gasto
//   2. uploadPhoto     recebe a foto (já reduzida pelo navegador)
//   3. startPreview    manda a foto para a IA de imagem
//   4. getPreview      o site consulta a cada poucos segundos; aqui o servidor
//                      pergunta ao provedor e, quando termina, guarda a imagem

import { catalog } from "../../content/estatua";
import type { PreviewDto } from "../../lib/loja/tipos";
import { randomToken, sha256Hex } from "../crypto";
import type { Ctx } from "../context";
import { HttpError } from "../http";
import { buildStatuePrompt } from "../providers/prompts";
import type { FileRef, StatueOptions } from "../providers/types";
import type { PreviewRecord } from "../store/types";
import { sniffImage } from "../validate";

const DAY_MS = 24 * 60 * 60 * 1000;
export const URL_TTL_SECONDS = 60 * 60;

export const ipHashOf = (ctx: Ctx, ip: string) => sha256Hex(`${ctx.config.ipHashSalt}:${ip}`);

const extOf = (contentType: string) =>
  ({ "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/svg+xml": "svg" })[
    contentType.split(";")[0]
  ] ?? "bin";

/** Baixa o arquivo que o provedor devolveu como link (links de provedores expiram). */
export async function fetchBytes(url: string, maxBytes = 30 * 1024 * 1024): Promise<Uint8Array> {
  // só https: um provedor (ou alguém se passando por ele) não leva o servidor a
  // buscar endereços internos nem http puro
  if (!/^https:\/\//i.test(url)) throw new Error("link de arquivo não é https");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`download falhou (${response.status})`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length > maxBytes) throw new Error("arquivo grande demais");
  return bytes;
}

export async function resolveFile(file: FileRef): Promise<Uint8Array> {
  if (file.bytes) return file.bytes;
  if (file.url) return fetchBytes(file.url);
  throw new Error("o provedor não devolveu bytes nem link");
}

async function verifyTurnstile(ctx: Ctx, token: string | undefined, ip: string) {
  if (!ctx.config.turnstileSecret) return;
  if (!token) throw new HttpError(400, "captcha_required", "Confirme que você não é um robô.");
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret: ctx.config.turnstileSecret, response: token, remoteip: ip }),
  });
  const result = (await response.json()) as { success?: boolean };
  if (!result.success) throw new HttpError(400, "captcha_failed", "Não foi possível confirmar que você não é um robô. Tente de novo.");
}

/** Cotas por visitante e por rede, e teto diário de gasto com IA. */
async function enforceQuotas(ctx: Ctx, sessionId: string, ipHash: string): Promise<number> {
  const since = new Date(ctx.now().getTime() - DAY_MS);
  const perSession = await ctx.store.countPreviews({ sessionId, since });
  if (perSession >= ctx.config.previewsPerDay) {
    throw new HttpError(
      429,
      "quota_exceeded",
      `Você já gerou ${ctx.config.previewsPerDay} prévias hoje. Tente amanhã ou fale com a gente pelo WhatsApp.`,
    );
  }
  const perIp = await ctx.store.countPreviews({ ipHash, since });
  if (perIp >= ctx.config.previewsPerDayPerIp) {
    throw new HttpError(429, "quota_exceeded", "Muitas prévias desta rede hoje. Tente amanhã ou fale com a gente pelo WhatsApp.");
  }
  if (ctx.config.dailyBudgetCents > 0) {
    const spent = await ctx.store.sumCosts(since);
    if (spent >= ctx.config.dailyBudgetCents) {
      throw new HttpError(
        503,
        "budget_exceeded",
        "O limite diário de prévias da loja foi atingido. Fale com a gente pelo WhatsApp que ajudamos você.",
      );
    }
  }
  return ctx.config.previewsPerDay - perSession - 1;
}

export function statueOptions(rec: PreviewRecord): StatueOptions {
  const pose = catalog.poses.find((p) => p.id === rec.options.poseId);
  const color = catalog.colors.find((c) => c.id === rec.options.colorId);
  return {
    ...rec.options,
    poseLabel: pose?.label ?? rec.options.poseId,
    colorLabel: color?.label ?? rec.options.colorId,
    colorHex: color?.swatch ?? "#cccccc",
  };
}

export async function previewDto(ctx: Ctx, rec: PreviewRecord, remaining?: number): Promise<PreviewDto> {
  return {
    id: rec.publicId,
    status: rec.status,
    options: rec.options,
    imageUrl:
      rec.status === "ready" && rec.imagePath
        ? await ctx.files.signedUrl(rec.imagePath, URL_TTL_SECONDS)
        : undefined,
    errorCode: rec.errorCode,
    errorMessage: rec.errorMessage,
    remaining,
  };
}

async function mustGet(ctx: Ctx, publicId: string): Promise<PreviewRecord> {
  const rec = await ctx.store.getPreview(publicId);
  if (!rec) throw new HttpError(404, "not_found", "Prévia não encontrada.");
  return rec;
}

// ───────── 1. criar ─────────

export async function createPreview(
  ctx: Ctx,
  input: { sessionId: string; options: PreviewRecord["options"]; ip: string; turnstileToken?: string },
): Promise<PreviewDto> {
  await verifyTurnstile(ctx, input.turnstileToken, input.ip);
  const ipHash = ipHashOf(ctx, input.ip);
  const remaining = await enforceQuotas(ctx, input.sessionId, ipHash);
  const rec = await ctx.store.createPreview({
    publicId: randomToken(18),
    sessionId: input.sessionId,
    ipHash,
    options: input.options,
    imageProvider: ctx.providers.image.name,
  });
  return previewDto(ctx, rec, remaining);
}

// ───────── 2. foto ─────────

export async function uploadPhoto(ctx: Ctx, publicId: string, bytes: Uint8Array): Promise<PreviewDto> {
  const rec = await mustGet(ctx, publicId);
  if (rec.status !== "queued" || rec.photoPath) {
    throw new HttpError(409, "conflict", "Esta prévia já recebeu uma foto.");
  }
  if (bytes.length < 1024) throw new HttpError(400, "invalid_photo", "A foto está vazia ou corrompida.");
  if (bytes.length > ctx.config.maxPhotoBytes) {
    throw new HttpError(413, "photo_too_large", "A foto é grande demais. Envie uma de até 5 MB.");
  }
  const kind = sniffImage(bytes);
  if (!kind) throw new HttpError(400, "invalid_photo", "Envie uma foto em JPG, PNG ou WebP.");

  const photoPath = `photos/${rec.id}.${kind.ext}`;
  await ctx.files.put(photoPath, bytes, kind.contentType);
  const updated = await ctx.store.updatePreview(publicId, { photoPath, photoContentType: kind.contentType });
  return previewDto(ctx, updated);
}

// ───────── 3. gerar ─────────

export async function startPreview(ctx: Ctx, publicId: string): Promise<PreviewDto> {
  const rec = await mustGet(ctx, publicId);
  const retryable = rec.status === "failed" && rec.errorCode !== "rejected";
  if (rec.status !== "queued" && !retryable) {
    throw new HttpError(409, "conflict", "Esta prévia já foi iniciada.");
  }
  if (!rec.photoPath) throw new HttpError(409, "photo_missing", "Envie a foto antes de gerar a prévia.");

  const photo = await ctx.files.get(rec.photoPath);
  if (!photo) throw new HttpError(409, "photo_missing", "A foto não foi encontrada. Envie de novo.");

  const options = statueOptions(rec);
  const job = await ctx.providers.image.submit({
    photo: {
      url: await ctx.files.signedUrl(rec.photoPath, URL_TTL_SECONDS),
      bytes: photo.bytes,
      contentType: photo.contentType,
    },
    prompt: buildStatuePrompt(options),
    options,
  });

  const updated = await ctx.store.updatePreview(publicId, {
    status: "generating",
    imageProvider: ctx.providers.image.name,
    imageJobId: job.jobId,
    imageCostCents: rec.imageCostCents + (job.costCents ?? 0),
    startedAt: ctx.now().toISOString(),
    errorCode: undefined,
    errorMessage: undefined,
  });
  return previewDto(ctx, updated);
}

// ───────── 4. acompanhar ─────────

export async function getPreview(ctx: Ctx, publicId: string): Promise<PreviewDto> {
  let rec = await mustGet(ctx, publicId);

  if (rec.status === "generating" && rec.imageJobId) {
    const startedAt = rec.startedAt ? new Date(rec.startedAt).getTime() : ctx.now().getTime();
    const result = await ctx.providers.image.poll(rec.imageJobId);

    if (result.status === "succeeded") {
      const bytes = await resolveFile(result.image);
      const imagePath = `images/${rec.id}.${extOf(result.image.contentType)}`;
      await ctx.files.put(imagePath, bytes, result.image.contentType);
      rec = await ctx.store.updatePreview(publicId, {
        status: "ready",
        imagePath,
        imageContentType: result.image.contentType,
        imageCostCents: rec.imageCostCents + (result.costCents ?? 0),
      });
    } else if (result.status === "failed") {
      rec = await ctx.store.updatePreview(publicId, {
        status: result.code === "rejected" ? "rejected" : "failed",
        errorCode: result.code,
        errorMessage: result.message,
      });
    } else if (ctx.now().getTime() - startedAt > ctx.config.generationTimeoutMs) {
      rec = await ctx.store.updatePreview(publicId, {
        status: "failed",
        errorCode: "timeout",
        errorMessage: "A geração demorou demais. Tente de novo.",
      });
    }
  }
  return previewDto(ctx, rec);
}

// ───────── gerar outra (mesma foto, opções novas ou iguais) ─────────

export async function regeneratePreview(
  ctx: Ctx,
  publicId: string,
  input: { sessionId: string; ip: string; options?: PreviewRecord["options"]; turnstileToken?: string },
): Promise<PreviewDto> {
  const source = await mustGet(ctx, publicId);
  if (source.sessionId !== input.sessionId) throw new HttpError(404, "not_found", "Prévia não encontrada.");
  if (!source.photoPath) throw new HttpError(409, "photo_missing", "Esta prévia não tem foto.");

  await verifyTurnstile(ctx, input.turnstileToken, input.ip);
  const ipHash = ipHashOf(ctx, input.ip);
  const remaining = await enforceQuotas(ctx, input.sessionId, ipHash);

  const created = await ctx.store.createPreview({
    publicId: randomToken(18),
    sessionId: input.sessionId,
    ipHash,
    options: input.options ?? source.options,
    imageProvider: ctx.providers.image.name,
    photoPath: source.photoPath,
    photoContentType: source.photoContentType,
  });
  const started = await startPreview(ctx, created.publicId);
  return { ...started, remaining };
}
