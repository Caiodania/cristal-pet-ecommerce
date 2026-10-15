// Armazenamento no Supabase (Postgres). Usa a chave de SERVIÇO: só roda no
// servidor. As tabelas e funções estão em supabase/migrations/0001_init.sql.
//
// STATUS: escrito conforme a migration, mas NÃO testado contra um projeto
// Supabase real (ainda não há projeto). Quando houver, rode a verificação do
// docs/backend.md ("Primeira ligação com o Supabase") antes de abrir a loja.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ORDER_STATUSES, type OrderStatus } from "../../lib/loja/tipos";
import { HttpError } from "../http";
import type {
  NewOrder,
  NewPreview,
  OrderListFilter,
  OrderRecord,
  PreviewRecord,
  Store,
} from "./types";

type Row = Record<string, unknown>;

const opt = <T>(v: unknown): T | undefined => (v === null || v === undefined ? undefined : (v as T));

function toPreview(r: Row): PreviewRecord {
  return {
    id: r.id as string,
    publicId: r.public_id as string,
    sessionId: r.session_id as string,
    ipHash: r.ip_hash as string,
    status: r.status as PreviewRecord["status"],
    options: r.options as PreviewRecord["options"],
    photoPath: opt(r.photo_path),
    photoContentType: opt(r.photo_content_type),
    imageProvider: r.image_provider as string,
    imageJobId: opt(r.image_job_id),
    imagePath: opt(r.image_path),
    imageContentType: opt(r.image_content_type),
    imageCostCents: r.image_cost_cents as number,
    startedAt: opt(r.started_at),
    errorCode: opt(r.error_code),
    errorMessage: opt(r.error_message),
    modelStatus: r.model_status as PreviewRecord["modelStatus"],
    modelProvider: opt(r.model_provider),
    modelJobId: opt(r.model_job_id),
    stlPath: opt(r.stl_path),
    glbPath: opt(r.glb_path),
    modelError: opt(r.model_error),
    modelCostCents: r.model_cost_cents as number,
    createdAt: r.created_at as string,
    expiresAt: r.expires_at as string,
  };
}

// camelCase → snake_case, só dos campos que o servidor atualiza.
const PREVIEW_COLUMNS: Record<string, string> = {
  status: "status",
  photoPath: "photo_path",
  photoContentType: "photo_content_type",
  imageProvider: "image_provider",
  imageJobId: "image_job_id",
  imagePath: "image_path",
  imageContentType: "image_content_type",
  imageCostCents: "image_cost_cents",
  startedAt: "started_at",
  errorCode: "error_code",
  errorMessage: "error_message",
  modelStatus: "model_status",
  modelProvider: "model_provider",
  modelJobId: "model_job_id",
  stlPath: "stl_path",
  glbPath: "glb_path",
  modelError: "model_error",
  modelCostCents: "model_cost_cents",
};

function toOrder(r: Row): OrderRecord {
  const items = ((r.order_items as Row[] | null) ?? []).map((i) => ({
    id: i.id as string,
    previewId: i.preview_id as string,
    sizeId: i.size_id as string,
    poseId: i.pose_id as string,
    colorId: i.color_id as string,
    petName: opt<string>(i.pet_name),
    unitCents: (i.unit_cents as number | null) ?? null,
    catalogVersion: i.catalog_version as string,
  }));
  const events = ((r.order_events as Row[] | null) ?? [])
    .map((e) => ({
      status: e.status as OrderStatus,
      at: e.at as string,
      note: opt<string>(e.note),
    }))
    .sort((a, b) => a.at.localeCompare(b.at));
  return {
    id: r.id as string,
    code: r.code as string,
    viewToken: r.view_token as string,
    status: r.status as OrderStatus,
    customerName: opt(r.customer_name),
    customerPhone: opt(r.customer_phone),
    city: opt(r.city),
    notes: opt(r.notes),
    adminNotes: opt(r.admin_notes),
    estimateCents: (r.estimate_cents as number | null) ?? null,
    discountCents: (r.discount_cents as number) ?? 0,
    consentAt: r.consent_at as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    items,
    events,
  };
}

const ORDER_SELECT = "*, order_items(*), order_events(*)";

export function createSupabaseStore(url: string, serviceKey: string): Store {
  const db: SupabaseClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const fail = (what: string, error: { message: string; code?: string }) => {
    console.error(`[supabase] ${what}:`, error);
    throw new Error(`Falha no banco (${what}).`);
  };

  const fetchOrder = async (column: "id" | "code", value: string) => {
    const { data, error } = await db.from("orders").select(ORDER_SELECT).eq(column, value).maybeSingle();
    if (error) fail("buscar pedido", error);
    return data ? toOrder(data as Row) : null;
  };

  return {
    kind: "supabase",

    async createPreview(input: NewPreview) {
      const { data, error } = await db
        .from("previews")
        .insert({
          public_id: input.publicId,
          session_id: input.sessionId,
          ip_hash: input.ipHash,
          options: input.options,
          image_provider: input.imageProvider,
          photo_path: input.photoPath ?? null,
          photo_content_type: input.photoContentType ?? null,
        })
        .select()
        .single();
      if (error) fail("criar prévia", error);
      return toPreview(data as Row);
    },

    async getPreview(publicId) {
      const { data, error } = await db.from("previews").select().eq("public_id", publicId).maybeSingle();
      if (error) fail("buscar prévia", error);
      return data ? toPreview(data as Row) : null;
    },

    async getPreviewById(id) {
      const { data, error } = await db.from("previews").select().eq("id", id).maybeSingle();
      if (error) fail("buscar prévia", error);
      return data ? toPreview(data as Row) : null;
    },

    async updatePreview(publicId, patch) {
      const update: Row = {};
      for (const [key, value] of Object.entries(patch)) {
        const column = PREVIEW_COLUMNS[key];
        if (column) update[column] = value ?? null;
      }
      const { data, error } = await db
        .from("previews")
        .update(update)
        .eq("public_id", publicId)
        .select()
        .single();
      if (error) fail("atualizar prévia", error);
      return toPreview(data as Row);
    },

    async countPreviews({ sessionId, ipHash, since }) {
      let query = db
        .from("previews")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since.toISOString());
      if (sessionId) query = query.eq("session_id", sessionId);
      if (ipHash) query = query.eq("ip_hash", ipHash);
      const { count, error } = await query;
      if (error) fail("contar prévias", error);
      return count ?? 0;
    },

    async sumCosts(since) {
      const { data, error } = await db.rpc("sum_costs", { p_since: since.toISOString() });
      if (error) fail("somar custos", error);
      return Number(data ?? 0);
    },

    async createOrder(input: NewOrder) {
      const { data, error } = await db.rpc("create_order", {
        p_order: {
          code: input.code,
          view_token: input.viewToken,
          customer_name: input.customerName ?? null,
          customer_phone: input.customerPhone ?? null,
          city: input.city ?? null,
          notes: input.notes ?? null,
          estimate_cents: input.estimateCents,
          discount_cents: input.discountCents,
          consent_at: input.consentAt,
        },
        p_items: input.items.map((i) => ({
          preview_id: i.previewId,
          size_id: i.sizeId,
          pose_id: i.poseId,
          color_id: i.colorId,
          pet_name: i.petName ?? null,
          unit_cents: i.unitCents,
          catalog_version: i.catalogVersion,
        })),
      });
      if (error) {
        // 23505 = unique_violation (prévia já usada em outro pedido, ou código repetido)
        if (error.code === "23505") {
          throw new HttpError(409, "conflict", "Uma das prévias já está em outro pedido.");
        }
        fail("criar pedido", error);
      }
      const order = await fetchOrder("id", data as string);
      if (!order) throw new Error("Pedido criado mas não encontrado.");
      return order;
    },

    getOrderByCode: (code) => fetchOrder("code", code),
    getOrderById: (id) => fetchOrder("id", id),

    async listOrders({ status, q, limit, offset }: OrderListFilter) {
      let query = db
        .from("orders")
        .select(ORDER_SELECT, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      if (status) query = query.eq("status", status);
      // só letras, números, espaço, hífen e + (evita quebrar o filtro .or)
      const needle = q?.replace(/[^\p{L}\p{N} +-]/gu, "").trim();
      if (needle) {
        query = query.or(
          ["code", "customer_name", "city", "customer_phone"].map((c) => `${c}.ilike.%${needle}%`).join(","),
        );
      }
      const { data, count, error } = await query;
      if (error) fail("listar pedidos", error);
      return { rows: (data as Row[]).map(toOrder), total: count ?? 0 };
    },

    async countOrdersByStatus() {
      const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
      await Promise.all(
        ORDER_STATUSES.map(async (status) => {
          const { count, error } = await db
            .from("orders")
            .select("id", { count: "exact", head: true })
            .eq("status", status);
          if (error) fail("contar pedidos", error);
          counts[status] = count ?? 0;
        }),
      );
      return counts;
    },

    async updateOrder(id, patch, event) {
      const update: Row = {};
      if (patch.status) update.status = patch.status;
      if (patch.adminNotes !== undefined) update.admin_notes = patch.adminNotes;
      if (Object.keys(update).length) {
        const { error } = await db.from("orders").update(update).eq("id", id);
        if (error) fail("atualizar pedido", error);
      }
      if (event) {
        const { error } = await db
          .from("order_events")
          .insert({ order_id: id, status: event.status, note: event.note ?? null });
        if (error) fail("registrar evento", error);
      }
      const order = await fetchOrder("id", id);
      if (!order) throw new Error(`pedido não existe: ${id}`);
      return order;
    },

    async addOrderEvent(id, event) {
      const { error } = await db
        .from("order_events")
        .insert({ order_id: id, status: event.status, note: event.note ?? null });
      if (error) fail("registrar evento", error);
      // toca o updated_at
      await db.from("orders").update({ updated_at: new Date().toISOString() }).eq("id", id);
      const order = await fetchOrder("id", id);
      if (!order) throw new Error(`pedido não existe: ${id}`);
      return order;
    },

    async findOrderIdByPreview(previewId) {
      const { data, error } = await db
        .from("order_items")
        .select("order_id")
        .eq("preview_id", previewId)
        .maybeSingle();
      if (error) fail("buscar item", error);
      return data ? ((data as Row).order_id as string) : null;
    },
  };
}
