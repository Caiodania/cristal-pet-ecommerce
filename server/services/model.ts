// Arquivo de impressão: imagem da escultura → modelo 3D pronto para a impressora.
//
// É a etapa CARA e fica sob controle do dono: só roda quando ele pede no painel
// (ou, se configurado, ao receber/confirmar o pedido: MODEL_AUTO). A etapa 1
// (imagem da prévia) é barata e o cliente a repete à vontade; esta roda uma vez
// por escultura pedida.

import { catalog } from "../../content/estatua";
import type { ModelDto } from "../../lib/loja/tipos";
import type { Ctx } from "../context";
import { HttpError } from "../http";
import type { PreviewRecord } from "../store/types";
import { URL_TTL_SECONDS, resolveFile, statueOptions } from "./previews";

async function loadItem(ctx: Ctx, orderId: string, itemId: string) {
  const order = await ctx.store.getOrderById(orderId);
  const item = order?.items.find((i) => i.id === itemId);
  if (!order || !item) throw new HttpError(404, "not_found", "Item do pedido não encontrado.");
  const preview = await ctx.store.getPreviewById(item.previewId);
  if (!preview?.imagePath) throw new HttpError(409, "image_missing", "Este item não tem imagem de prévia.");
  return { order, item, preview };
}

/** Estado do arquivo 3D de uma escultura, com links temporários quando pronto. */
export async function modelDtoOf(ctx: Ctx, rec: PreviewRecord, downloadName: string): Promise<ModelDto> {
  const dto: ModelDto = { status: rec.modelStatus, errorMessage: rec.modelError };
  if (rec.modelStatus === "ready") {
    if (rec.stlPath) dto.stlUrl = await ctx.files.signedUrl(rec.stlPath, URL_TTL_SECONDS, { downloadName });
    if (rec.glbPath) dto.glbUrl = await ctx.files.signedUrl(rec.glbPath, URL_TTL_SECONDS);
  }
  return dto;
}

export const downloadNameOf = (code: string, petName?: string) =>
  `${code}-${petName ?? "escultura"}.stl`.replace(/\s+/g, "-");

/** Pede a geração do arquivo 3D. Pode ser repetido se tiver falhado. */
export async function startModel(ctx: Ctx, orderId: string, itemId: string): Promise<ModelDto> {
  const { order, item, preview } = await loadItem(ctx, orderId, itemId);
  if (preview.modelStatus === "processing" || preview.modelStatus === "queued" || preview.modelStatus === "ready") {
    return modelDtoOf(ctx, preview, downloadNameOf(order.code, item.petName));
  }

  const image = await ctx.files.get(preview.imagePath!);
  if (!image) throw new HttpError(409, "image_missing", "A imagem da prévia não foi encontrada.");

  const size = catalog.sizes.find((s) => s.id === item.sizeId);
  const job = await ctx.providers.model.submit({
    image: {
      url: await ctx.files.signedUrl(preview.imagePath!, URL_TTL_SECONDS),
      bytes: image.bytes,
      contentType: image.contentType,
    },
    heightMm: size?.cm ? size.cm * 10 : null,
    options: statueOptions(preview),
  });

  const updated = await ctx.store.updatePreview(preview.publicId, {
    modelStatus: "processing",
    modelProvider: ctx.providers.model.name,
    modelJobId: job.jobId,
    modelCostCents: preview.modelCostCents + (job.costCents ?? 0),
    modelError: undefined,
  });
  await ctx.store.addOrderEvent(order.id, {
    status: order.status,
    note: `[interno] Arquivo 3D solicitado (${item.petName ?? "escultura"}).`,
  });
  return modelDtoOf(ctx, updated, downloadNameOf(order.code, item.petName));
}

/** Consulta o andamento (o servidor pergunta ao provedor) e guarda os arquivos quando prontos. */
export async function getModel(ctx: Ctx, orderId: string, itemId: string): Promise<ModelDto> {
  const { order, item, preview } = await loadItem(ctx, orderId, itemId);
  let rec = preview;

  if (rec.modelStatus === "processing" && rec.modelJobId) {
    const result = await ctx.providers.model.poll(rec.modelJobId);
    if (result.status === "succeeded") {
      const stlBytes = await resolveFile(result.stl);
      const stlPath = `models/${rec.id}.stl`;
      await ctx.files.put(stlPath, stlBytes, "model/stl");
      let glbPath: string | undefined;
      if (result.glb) {
        glbPath = `models/${rec.id}.glb`;
        await ctx.files.put(glbPath, await resolveFile(result.glb), "model/gltf-binary");
      }
      rec = await ctx.store.updatePreview(rec.publicId, {
        modelStatus: "ready",
        stlPath,
        glbPath,
        modelCostCents: rec.modelCostCents + (result.costCents ?? 0),
      });
      await ctx.store.addOrderEvent(order.id, {
        status: order.status,
        note: `[interno] Arquivo 3D pronto (${item.petName ?? "escultura"}).`,
      });
    } else if (result.status === "failed") {
      rec = await ctx.store.updatePreview(rec.publicId, {
        modelStatus: "failed",
        modelError: result.message,
      });
    }
  }
  return modelDtoOf(ctx, rec, downloadNameOf(order.code, item.petName));
}
