// Armazenamento no Supabase (Postgres). Usa a chave de SERVIÇO: só roda no
// servidor. As tabelas e funções estão em supabase/migrations/0001_init.sql
// (pedidos e prévias) e 0002_contas.sql (contas, sessões e a cota de prévias).
//
// STATUS: escrito conforme a migration, mas NÃO testado contra um projeto
// Supabase real (ainda não há projeto). Quando houver, rode a verificação do
// docs/backend.md ("Primeira ligação com o Supabase") antes de abrir a loja.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { ORDER_STATUSES, type OrderStatus } from "../../lib/loja/tipos";
import { HttpError } from "../http";
import {
  QuotaExceededError,
  type NewOrder,
  type NewPreview,
  type OrderListFilter,
  type OrderRecord,
  type PreviewRecord,
  type ProfileRecord,
  type SessionRecord,
  type Store,
} from "./types";

type Row = Record<string, unknown>;

const opt = <T>(v: unknown): T | undefined => (v === null || v === undefined ? undefined : (v as T));

function toPreview(r: Row): PreviewRecord {
  return {
    id: r.id as string,
    publicId: r.public_id as string,
    userId: (r.user_id as string | null) ?? "",
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

function toProfile(r: Row): ProfileRecord {
  return {
    id: r.id as string,
    email: r.email as string,
    name: opt(r.name),
    bonusPreviews: (r.bonus_previews as number) ?? 0,
    createdAt: r.created_at as string,
    lastLoginAt: opt(r.last_login_at),
  };
}

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
    userId: opt(r.user_id),
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

    // ───────── Contas ─────────

    async upsertProfile({ id, email, name }) {
      // o gatilho do Auth já cria o perfil; isto garante e mantém e-mail e nome em dia
      const { data, error } = await db
        .from("profiles")
        .upsert({ id, email, ...(name ? { name } : {}) }, { onConflict: "id" })
        .select()
        .single();
      if (error) fail("gravar conta", error);
      return toProfile(data as Row);
    },

    async getProfile(id) {
      const { data, error } = await db.from("profiles").select().eq("id", id).maybeSingle();
      if (error) fail("buscar conta", error);
      return data ? toProfile(data as Row) : null;
    },

    async touchLogin(id) {
      const { error } = await db.from("profiles").update({ last_login_at: new Date().toISOString() }).eq("id", id);
      if (error) fail("registrar login", error);
    },

    async setBonusPreviews(id, bonus) {
      const { data, error } = await db
        .from("profiles")
        .update({ bonus_previews: Math.max(0, Math.floor(bonus)) })
        .eq("id", id)
        .select()
        .single();
      if (error) fail("liberar prévias", error);
      return toProfile(data as Row);
    },

    async listProfiles({ q, limit, offset }) {
      let query = db
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);
      // só letras, números, espaço, ponto, arroba, hífen e + (evita quebrar o filtro .or)
      const needle = q?.replace(/[^\p{L}\p{N} .@+_-]/gu, "").trim();
      if (needle) query = query.or(`email.ilike.%${needle}%,name.ilike.%${needle}%`);
      const { data, count, error } = await query;
      if (error) fail("listar contas", error);
      const profiles = (data as Row[]).map(toProfile);
      const ids = profiles.map((p) => p.id);
      const used = new Map<string, number>();
      const orderCount = new Map<string, number>();
      if (ids.length) {
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const [previewRows, orderRows] = await Promise.all([
          db.from("previews").select("user_id, status, created_at").in("user_id", ids),
          db.from("orders").select("user_id").in("user_id", ids),
        ]);
        if (previewRows.error) fail("contar prévias das contas", previewRows.error);
        if (orderRows.error) fail("contar pedidos das contas", orderRows.error);
        for (const row of (previewRows.data ?? []) as Row[]) {
          const counts =
            ["ready", "generating", "expired"].includes(row.status as string) ||
            (row.status === "queued" && (row.created_at as string) > since);
          if (counts) used.set(row.user_id as string, (used.get(row.user_id as string) ?? 0) + 1);
        }
        for (const row of (orderRows.data ?? []) as Row[]) {
          orderCount.set(row.user_id as string, (orderCount.get(row.user_id as string) ?? 0) + 1);
        }
      }
      return {
        rows: profiles.map((p) => ({ ...p, previewsUsed: used.get(p.id) ?? 0, orderCount: orderCount.get(p.id) ?? 0 })),
        total: count ?? 0,
      };
    },

    // ───────── Sessões ─────────

    async createSession(session: SessionRecord) {
      const { error } = await db.from("customer_sessions").insert({
        token_hash: session.tokenHash,
        user_id: session.userId,
        created_at: session.createdAt,
        expires_at: session.expiresAt,
      });
      if (error) fail("criar sessão", error);
    },

    async getSession(tokenHash) {
      const { data, error } = await db.from("customer_sessions").select().eq("token_hash", tokenHash).maybeSingle();
      if (error) fail("buscar sessão", error);
      if (!data) return null;
      const r = data as Row;
      return {
        tokenHash: r.token_hash as string,
        userId: r.user_id as string,
        createdAt: r.created_at as string,
        expiresAt: r.expires_at as string,
      };
    },

    async deleteSession(tokenHash) {
      const { error } = await db.from("customer_sessions").delete().eq("token_hash", tokenHash);
      if (error) fail("encerrar sessão", error);
    },

    async deleteUserSessions(userId) {
      const { error } = await db.from("customer_sessions").delete().eq("user_id", userId);
      if (error) fail("encerrar sessões da conta", error);
    },

    async deleteExpiredSessions() {
      const { data, error } = await db
        .from("customer_sessions")
        .delete()
        .lte("expires_at", new Date().toISOString())
        .select("token_hash");
      if (error) fail("limpar sessões", error);
      return (data ?? []).length;
    },

    // ───────── Prévias ─────────

    async reservePreview(input: NewPreview, limit: number) {
      const { data, error } = await db.rpc("reserve_preview", {
        p_preview: {
          public_id: input.publicId,
          user_id: input.userId,
          ip_hash: input.ipHash,
          options: input.options,
          image_provider: input.imageProvider,
          photo_path: input.photoPath ?? null,
          photo_content_type: input.photoContentType ?? null,
        },
        p_limit: limit,
      });
      if (error) {
        if (error.message?.includes("quota_exceeded")) {
          const [used, allowed] = String((error as { details?: string }).details ?? "").split("/").map(Number);
          throw new QuotaExceededError(Number.isFinite(used) ? used : limit, Number.isFinite(allowed) ? allowed : limit);
        }
        fail("criar prévia", error);
      }
      const { data: row, error: readError } = await db.from("previews").select().eq("id", data as string).single();
      if (readError) fail("ler a prévia criada", readError);
      return toPreview(row as Row);
    },

    async countUserPreviews(userId) {
      const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count, error } = await db
        .from("previews")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .or(`status.in.(ready,generating,expired),and(status.eq.queued,created_at.gt.${since})`);
      if (error) fail("contar prévias da conta", error);
      return count ?? 0;
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

    async countPreviews({ ipHash, since }) {
      const { count, error } = await db
        .from("previews")
        .select("id", { count: "exact", head: true })
        .gte("created_at", since.toISOString())
        .eq("ip_hash", ipHash);
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
          user_id: input.userId ?? null,
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

    async listOrdersByUser(userId) {
      const { data, error } = await db
        .from("orders")
        .select(ORDER_SELECT)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) fail("listar pedidos da conta", error);
      return (data as Row[]).map(toOrder);
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
