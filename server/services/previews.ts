// Prévia: foto do cliente → imagem da escultura (IA de imagem).
//
// Só quem tem conta gera prévia (cada conta tem uma cota, contada no banco).
//
// Fluxo (cada passo é uma chamada da API):
//   1. createPreview   reserva uma prévia da cota da conta, confere o limite por
//                      rede e o teto de gasto
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
import { loadStyleReferences } from "../providers/style-references";
import type { FileRef, StatueOptions } from "../providers/types";
import { QuotaExceededError, type NewPreview, type PreviewRecord, type ProfileRecord } from "../store/types";
import { sniffImage } from "../validate";
import { quotaOf } from "./accounts";

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

/** Limite diário por rede (corta quem abre várias contas na mesma conexão) e teto diário de gasto com IA. */
async function enforceQuotas(ctx: Ctx, ipHash: string): Promise<void> {
  const since = new Date(ctx.now().getTime() - DAY_MS);
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
}

/** A conta já usou todas as prévias: a mensagem manda para o WhatsApp, onde o dono pode liberar mais. */
const quotaMessage = (limit: number) =>
  limit === 1
    ? "Você já usou a prévia da sua conta. Fale com a gente pelo WhatsApp que a gente ajuda você."
    : `Você já usou as ${limit} prévias da sua conta. Fale com a gente pelo WhatsApp que a gente ajuda você.`;

/** Reserva uma prévia da cota da conta (atômico no banco). */
async function reserve(ctx: Ctx, input: NewPreview): Promise<PreviewRecord> {
  try {
    return await ctx.store.reservePreview(input, ctx.config.previewsPerAccount);
  } catch (error) {
    if (error instanceof QuotaExceededError) throw new HttpError(403, "quota_exceeded", quotaMessage(error.limit));
    throw error;
  }
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

/** A prévia, só se for da conta (outra conta recebe "não encontrada", sem saber que existe). */
async function mustGet(ctx: Ctx, publicId: string, user: ProfileRecord): Promise<PreviewRecord> {
  const rec = await ctx.store.getPreview(publicId);
  if (!rec || rec.userId !== user.id) throw new HttpError(404, "not_found", "Prévia não encontrada.");
  return rec;
}

// ───────── 1. criar ─────────

export async function createPreview(
  ctx: Ctx,
  input: { user: ProfileRecord; options: PreviewRecord["options"]; ip: string },
): Promise<PreviewDto> {
  const ipHash = ipHashOf(ctx, input.ip);
  await enforceQuotas(ctx, ipHash);
  const rec = await reserve(ctx, {
    publicId: randomToken(18),
    userId: input.user.id,
    ipHash,
    options: input.options,
    imageProvider: ctx.providers.image.name,
  });
  return previewDto(ctx, rec, (await quotaOf(ctx, input.user)).remaining);
}

// ───────── 2. foto ─────────

export async function uploadPhoto(
  ctx: Ctx,
  publicId: string,
  bytes: Uint8Array,
  user: ProfileRecord,
): Promise<PreviewDto> {
  const rec = await mustGet(ctx, publicId, user);
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

export async function startPreview(ctx: Ctx, publicId: string, user: ProfileRecord): Promise<PreviewDto> {
  const rec = await mustGet(ctx, publicId, user);
  const retryable = rec.status === "failed" && rec.errorCode !== "rejected";
  if (rec.status !== "queued" && !retryable) {
    throw new HttpError(409, "conflict", "Esta prévia já foi iniciada.");
  }
  if (retryable) {
    // prévia que falhou não conta na cota; ao tentar de novo ela volta a contar, então confere
    const quota = await quotaOf(ctx, user);
    if (quota.remaining < 1) throw new HttpError(403, "quota_exceeded", quotaMessage(quota.limit));
  }
  if (!rec.photoPath) throw new HttpError(409, "photo_missing", "Envie a foto antes de gerar a prévia.");

  const photo = await ctx.files.get(rec.photoPath);
  if (!photo) throw new HttpError(409, "photo_missing", "A foto não foi encontrada. Envie de novo.");

  const options = statueOptions(rec);
  const styleReferences = await loadStyleReferences(ctx.config.styleReferenceFiles);
  const job = await ctx.providers.image.submit({
    photo: {
      url: await ctx.files.signedUrl(rec.photoPath, URL_TTL_SECONDS),
      bytes: photo.bytes,
      contentType: photo.contentType,
    },
    prompt: buildStatuePrompt(options, { hasStyleReference: styleReferences.length > 0 }),
    styleReferences,
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

export async function getPreview(ctx: Ctx, publicId: string, user: ProfileRecord): Promise<PreviewDto> {
  let rec = await mustGet(ctx, publicId, user);

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
  input: { user: ProfileRecord; ip: string; options?: PreviewRecord["options"] },
): Promise<PreviewDto> {
  const source = await mustGet(ctx, publicId, input.user);
  if (!source.photoPath) throw new HttpError(409, "photo_missing", "Esta prévia não tem foto.");

  const ipHash = ipHashOf(ctx, input.ip);
  await enforceQuotas(ctx, ipHash);

  const created = await reserve(ctx, {
    publicId: randomToken(18),
    userId: input.user.id,
    ipHash,
    options: input.options ?? source.options,
    imageProvider: ctx.providers.image.name,
    photoPath: source.photoPath,
    photoContentType: source.photoContentType,
  });
  const started = await startPreview(ctx, created.publicId, input.user);
  return { ...started, remaining: (await quotaOf(ctx, input.user)).remaining };
}
