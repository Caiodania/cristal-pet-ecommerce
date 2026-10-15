// Pedidos: o cliente envia o carrinho; o dono acompanha no painel.
//
// Regras que o servidor impõe (o navegador não decide nenhuma delas):
//  - as opções de cada escultura vêm da PRÉVIA gravada, não do que o navegador manda;
//  - o preço é recalculado aqui, a partir do catálogo;
//  - uma prévia só pode estar em um pedido;
//  - só o dono muda o status, e só por transições permitidas.

import { catalog } from "../../content/estatua";
import { estimate } from "../../lib/loja/estimativa";
import {
  ORDER_STATUSES,
  canTransition,
  type AdminOrderDto,
  type AdminOrderItemDto,
  type AdminOrderSummaryDto,
  type AdminStatsDto,
  type ModelDto,
  type OrderDto,
  type OrderItemDto,
  type OrderStatus,
} from "../../lib/loja/tipos";
import type { Ctx } from "../context";
import { newOrderCode, randomToken, safeEqual } from "../crypto";
import { HttpError } from "../http";
import type { Customer } from "../validate";
import type { OrderItemRecord, OrderRecord, PreviewRecord } from "../store/types";
import { URL_TTL_SECONDS } from "./previews";
import { downloadNameOf, modelDtoOf, startModel } from "./model";

const MAX_ITEMS = 10;

// ───────── DTOs ─────────

async function itemDto(ctx: Ctx, item: OrderItemRecord, preview: PreviewRecord | null): Promise<OrderItemDto> {
  return {
    id: item.id,
    sizeId: item.sizeId,
    poseId: item.poseId,
    colorId: item.colorId,
    petName: item.petName,
    unitCents: item.unitCents,
    previewId: preview?.publicId ?? "",
    imageUrl: preview?.imagePath
      ? await ctx.files.signedUrl(preview.imagePath, URL_TTL_SECONDS)
      : undefined,
  };
}

/** Visão do cliente: sem telefone nem notas internas. */
export async function customerOrderDto(ctx: Ctx, order: OrderRecord): Promise<OrderDto> {
  const items = await Promise.all(
    order.items.map(async (item) => itemDto(ctx, item, await ctx.store.getPreviewById(item.previewId))),
  );
  return {
    code: order.code,
    status: order.status,
    createdAt: order.createdAt,
    customerName: order.customerName,
    city: order.city,
    estimateCents: order.estimateCents,
    discountCents: order.discountCents,
    items,
    // notas de uso interno (arquivo 3D etc.) não vão para o cliente: só mudanças de status
    timeline: order.events
      .filter((e) => !e.note?.startsWith("[interno]"))
      .map((e) => ({ status: e.status, at: e.at, note: e.note })),
  };
}

export async function adminOrderDto(ctx: Ctx, order: OrderRecord): Promise<AdminOrderDto> {
  const items: AdminOrderItemDto[] = await Promise.all(
    order.items.map(async (item) => {
      const preview = await ctx.store.getPreviewById(item.previewId);
      const base = await itemDto(ctx, item, preview);
      const size = catalog.sizes.find((s) => s.id === item.sizeId);
      const model: ModelDto = preview
        ? await modelDtoOf(ctx, preview, downloadNameOf(order.code, item.petName))
        : { status: "none" };
      return {
        ...base,
        model,
        heightCm: size?.cm ?? null,
        photoUrl: preview?.photoPath
          ? await ctx.files.signedUrl(preview.photoPath, URL_TTL_SECONDS)
          : undefined,
      };
    }),
  );
  return {
    id: order.id,
    code: order.code,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    city: order.city,
    notes: order.notes,
    adminNotes: order.adminNotes,
    estimateCents: order.estimateCents,
    discountCents: order.discountCents,
    items,
    timeline: order.events.map((e) => ({ status: e.status, at: e.at, note: e.note })),
  };
}

// ───────── Cliente ─────────

export async function createOrder(
  ctx: Ctx,
  input: { sessionId: string; previewIds: string[]; customer: Customer },
): Promise<{ order: OrderDto; token: string }> {
  const ids = [...new Set(input.previewIds)];
  if (ids.length === 0) throw new HttpError(400, "invalid_input", "O carrinho está vazio.");
  if (ids.length > MAX_ITEMS) throw new HttpError(400, "invalid_input", `No máximo ${MAX_ITEMS} esculturas por pedido.`);

  const previews: PreviewRecord[] = [];
  for (const id of ids) {
    const preview = await ctx.store.getPreview(id);
    if (!preview || preview.sessionId !== input.sessionId) {
      throw new HttpError(404, "preview_not_found", "Uma das esculturas do carrinho não foi encontrada. Gere a prévia de novo.");
    }
    if (preview.status !== "ready") {
      throw new HttpError(409, "preview_not_ready", "Uma das prévias ainda não está pronta.");
    }
    if (await ctx.store.findOrderIdByPreview(preview.id)) {
      throw new HttpError(409, "preview_used", "Uma das esculturas já está em outro pedido.");
    }
    previews.push(preview);
  }

  // O preço sai do catálogo, a partir das opções gravadas na prévia.
  const estimated = estimate(previews.map((p) => p.options));
  const token = randomToken(24);

  let order: OrderRecord | undefined;
  for (let attempt = 0; attempt < 5 && !order; attempt++) {
    try {
      order = await ctx.store.createOrder({
        code: newOrderCode(),
        viewToken: token,
        customerName: input.customer.name,
        customerPhone: input.customer.phone,
        city: input.customer.city,
        notes: input.customer.notes,
        estimateCents: estimated.totalCents,
        discountCents: estimated.discountCents,
        consentAt: ctx.now().toISOString(),
        items: previews.map((p, i) => ({
          previewId: p.id,
          sizeId: p.options.sizeId,
          poseId: p.options.poseId,
          colorId: p.options.colorId,
          petName: p.options.petName,
          unitCents: estimated.unitCents[i],
          catalogVersion: catalog.version,
        })),
      });
    } catch (error) {
      // código repetido (muito raro): tenta outro. Qualquer outro erro sobe.
      if (!(error instanceof HttpError && error.code === "conflict") || attempt === 4) throw error;
    }
  }
  if (!order) throw new HttpError(500, "internal", "Não foi possível criar o pedido.");

  if (ctx.config.modelAuto === "order") await autoStartModels(ctx, order);
  return { order: await customerOrderDto(ctx, order), token };
}

export async function getOrderForCustomer(ctx: Ctx, code: string, token: string): Promise<OrderDto> {
  const order = await ctx.store.getOrderByCode(code.toUpperCase());
  // mesma resposta para "não existe" e "token errado": não revela quais códigos existem
  if (!order || !safeEqual(order.viewToken, token)) {
    throw new HttpError(404, "not_found", "Pedido não encontrado. Confira o link ou o código.");
  }
  return customerOrderDto(ctx, order);
}

// ───────── Dono ─────────

export async function listOrders(
  ctx: Ctx,
  filter: { status?: OrderStatus; q?: string; page: number },
): Promise<{ orders: AdminOrderSummaryDto[]; total: number; pageSize: number }> {
  const pageSize = 20;
  const { rows, total } = await ctx.store.listOrders({
    status: filter.status,
    q: filter.q,
    limit: pageSize,
    offset: (filter.page - 1) * pageSize,
  });
  // TODO(escala): cada linha busca a prévia para a miniatura (N consultas). Com
  // centenas de pedidos por página, trocar por uma consulta única.
  const orders = await Promise.all(
    rows.map(async (o): Promise<AdminOrderSummaryDto> => {
      const first = o.items[0] ? await ctx.store.getPreviewById(o.items[0].previewId) : null;
      return {
        id: o.id,
        code: o.code,
        status: o.status,
        createdAt: o.createdAt,
        customerName: o.customerName,
        city: o.city,
        itemCount: o.items.length,
        estimateCents: o.estimateCents,
        thumbUrl: first?.imagePath ? await ctx.files.signedUrl(first.imagePath, URL_TTL_SECONDS) : undefined,
      };
    }),
  );
  return { orders, total, pageSize };
}

export async function getOrderAdmin(ctx: Ctx, id: string): Promise<AdminOrderDto> {
  const order = await ctx.store.getOrderById(id);
  if (!order) throw new HttpError(404, "not_found", "Pedido não encontrado.");
  return adminOrderDto(ctx, order);
}

export async function adminStats(ctx: Ctx): Promise<AdminStatsDto> {
  const byStatus = await ctx.store.countOrdersByStatus();
  return { byStatus, total: ORDER_STATUSES.reduce((sum, s) => sum + byStatus[s], 0) };
}

export async function updateOrderAdmin(
  ctx: Ctx,
  id: string,
  input: { status?: OrderStatus; adminNotes?: string | null; note?: string },
): Promise<AdminOrderDto> {
  const order = await ctx.store.getOrderById(id);
  if (!order) throw new HttpError(404, "not_found", "Pedido não encontrado.");

  let event: { status: OrderStatus; note?: string } | undefined;
  if (input.status && input.status !== order.status) {
    if (!canTransition(order.status, input.status)) {
      throw new HttpError(409, "invalid_transition", `Não dá para ir de "${order.status}" para "${input.status}".`);
    }
    event = { status: input.status, note: input.note };
  }

  const updated = await ctx.store.updateOrder(
    id,
    { status: input.status, adminNotes: input.adminNotes },
    event,
  );
  if (input.status === "confirmed" && ctx.config.modelAuto === "confirmed") {
    await autoStartModels(ctx, updated);
  }
  return adminOrderDto(ctx, (await ctx.store.getOrderById(id)) ?? updated);
}

/** Dispara o arquivo 3D de todos os itens; um erro num item não derruba o pedido. */
async function autoStartModels(ctx: Ctx, order: OrderRecord) {
  for (const item of order.items) {
    try {
      await startModel(ctx, order.id, item.id);
    } catch (error) {
      console.error(`[orders] arquivo 3D automático falhou (${order.code}):`, error);
    }
  }
}
