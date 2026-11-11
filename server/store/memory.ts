// Armazenamento em memória: para testes e desenvolvimento local. Os dados
// somem quando o processo reinicia; em produção use o Supabase (a configuração
// recusa subir em produção com este).

import { ORDER_STATUSES, type OrderStatus } from "../../lib/loja/tipos";
import { uuid } from "../crypto";
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

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const clone = <T>(value: T): T => structuredClone(value);

export function createMemoryStore(now: () => Date = () => new Date()): Store {
  const previews = new Map<string, PreviewRecord>(); // por publicId
  const orders = new Map<string, OrderRecord>(); // por id
  const profiles = new Map<string, ProfileRecord>(); // por id
  const sessions = new Map<string, SessionRecord>(); // por tokenHash

  const mustOrder = (id: string): OrderRecord => {
    const order = orders.get(id);
    if (!order) throw new Error(`pedido não existe: ${id}`);
    return order;
  };

  const mustProfile = (id: string): ProfileRecord => {
    const profile = profiles.get(id);
    if (!profile) throw new Error(`conta não existe: ${id}`);
    return profile;
  };

  // Mesma regra do Postgres (função reserve_preview): o que conta na cota da conta.
  const countsForQuota = (p: PreviewRecord) =>
    p.status === "ready" ||
    p.status === "generating" ||
    p.status === "expired" ||
    (p.status === "queued" && now().getTime() - new Date(p.createdAt).getTime() < HOUR_MS);

  const countUser = (userId: string) => {
    let count = 0;
    for (const p of previews.values()) if (p.userId === userId && countsForQuota(p)) count += 1;
    return count;
  };

  return {
    kind: "memory",

    // ───────── Contas ─────────

    async upsertProfile({ id, email, name }) {
      const existing = profiles.get(id);
      if (existing) {
        existing.email = email;
        if (name) existing.name = name;
        return clone(existing);
      }
      const created: ProfileRecord = {
        id,
        email,
        name,
        bonusPreviews: 0,
        createdAt: now().toISOString(),
      };
      profiles.set(id, created);
      return clone(created);
    },

    async getProfile(id) {
      const profile = profiles.get(id);
      return profile ? clone(profile) : null;
    },

    async touchLogin(id) {
      mustProfile(id).lastLoginAt = now().toISOString();
    },

    async setBonusPreviews(id, bonus) {
      const profile = mustProfile(id);
      profile.bonusPreviews = Math.max(0, Math.floor(bonus));
      return clone(profile);
    },

    async listProfiles({ q, limit, offset }) {
      const needle = q?.trim().toLowerCase();
      const all = [...profiles.values()]
        .filter((p) => !needle || p.email.toLowerCase().includes(needle) || p.name?.toLowerCase().includes(needle))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const rows = all.slice(offset, offset + limit).map((p) => ({
        ...clone(p),
        previewsUsed: countUser(p.id),
        orderCount: [...orders.values()].filter((o) => o.userId === p.id).length,
      }));
      return { rows, total: all.length };
    },

    // ───────── Sessões ─────────

    async createSession(session) {
      sessions.set(session.tokenHash, clone(session));
    },

    async getSession(tokenHash) {
      const session = sessions.get(tokenHash);
      return session ? clone(session) : null;
    },

    async deleteSession(tokenHash) {
      sessions.delete(tokenHash);
    },

    async deleteUserSessions(userId) {
      for (const [hash, s] of sessions) if (s.userId === userId) sessions.delete(hash);
    },

    async deleteExpiredSessions() {
      let removed = 0;
      for (const [hash, s] of sessions) {
        if (new Date(s.expiresAt) <= now()) {
          sessions.delete(hash);
          removed += 1;
        }
      }
      return removed;
    },

    // ───────── Prévias ─────────

    async reservePreview(input: NewPreview, limit: number) {
      const profile = mustProfile(input.userId);
      const used = countUser(input.userId);
      const allowed = limit + profile.bonusPreviews;
      if (used >= allowed) throw new QuotaExceededError(used, allowed);

      const created = now();
      const record: PreviewRecord = {
        ...clone(input),
        id: uuid(),
        status: "queued",
        imageCostCents: 0,
        modelStatus: "none",
        modelCostCents: 0,
        createdAt: created.toISOString(),
        expiresAt: new Date(created.getTime() + 30 * DAY_MS).toISOString(),
      };
      previews.set(record.publicId, record);
      return clone(record);
    },

    async countUserPreviews(userId) {
      return countUser(userId);
    },

    async claimPreviewGeneration(publicId, input) {
      const record = previews.get(publicId);
      if (!record) throw new HttpError(404, "not_found", "Prévia não encontrada.");
      if (record.status !== "queued" && !(record.status === "failed" && record.errorCode !== "rejected")) {
        throw new HttpError(409, "conflict", "Esta prévia já foi iniciada.");
      }
      if (!record.photoPath) throw new HttpError(409, "photo_missing", "Envie a foto antes de gerar a prévia.");
      const limit = input.accountLimit + mustProfile(record.userId).bonusPreviews;
      const used = countUser(record.userId);
      if (!countsForQuota(record) && used >= limit) throw new QuotaExceededError(used, limit);
      const since = now().getTime() - DAY_MS;
      const recent = (p: PreviewRecord) => Math.max(Date.parse(p.createdAt), Date.parse(p.startedAt ?? p.createdAt)) >= since;
      let spent = 0;
      for (const p of previews.values()) if (recent(p)) spent += p.imageCostCents + p.modelCostCents;
      // Tentativas antigas passam a pertencer à janela atual de forma conservadora.
      const carried = recent(record) ? 0 : record.imageCostCents + record.modelCostCents;
      if (input.dailyBudgetCents > 0 && spent + carried + input.estimatedCostCents > input.dailyBudgetCents) {
        throw new HttpError(503, "budget_exceeded", "O limite diário de prévias foi atingido. Fale com a gente pelo WhatsApp.");
      }
      Object.assign(record, {
        status: "generating", imageProvider: input.provider, imageJobId: undefined,
        imageCostCents: record.imageCostCents + input.estimatedCostCents,
        startedAt: now().toISOString(), errorCode: undefined, errorMessage: undefined,
      });
      return clone(record);
    },

    async getPreview(publicId) {
      const record = previews.get(publicId);
      return record ? clone(record) : null;
    },

    async getPreviewById(id) {
      for (const record of previews.values()) if (record.id === id) return clone(record);
      return null;
    },

    async updatePreview(publicId, patch) {
      const record = previews.get(publicId);
      if (!record) throw new Error(`prévia não existe: ${publicId}`);
      Object.assign(record, clone(patch));
      return clone(record);
    },

    async countPreviews({ ipHash, since }) {
      let count = 0;
      for (const p of previews.values()) {
        if (new Date(p.createdAt) < since) continue;
        if (p.ipHash !== ipHash) continue;
        count += 1;
      }
      return count;
    },

    async sumCosts(since) {
      let sum = 0;
      for (const p of previews.values()) {
        if (Math.max(Date.parse(p.createdAt), Date.parse(p.startedAt ?? p.createdAt)) >= since.getTime()) sum += p.imageCostCents + p.modelCostCents;
      }
      return sum;
    },

    // ───────── Pedidos ─────────

    async createOrder(input: NewOrder) {
      const created = now().toISOString();
      const id = uuid();
      const order: OrderRecord = {
        ...clone({ ...input, items: undefined }),
        id,
        status: "new",
        createdAt: created,
        updatedAt: created,
        items: input.items.map((item) => ({ ...clone(item), id: uuid() })),
        events: [{ status: "new", at: created }],
      } as OrderRecord;
      orders.set(id, order);
      return clone(order);
    },

    async getOrderByCode(code) {
      for (const o of orders.values()) if (o.code === code) return clone(o);
      return null;
    },

    async getOrderById(id) {
      const order = orders.get(id);
      return order ? clone(order) : null;
    },

    async listOrders({ status, q, limit, offset }: OrderListFilter) {
      const needle = q?.trim().toLowerCase();
      const all = [...orders.values()]
        .filter((o) => !status || o.status === status)
        .filter((o) => {
          if (!needle) return true;
          return [o.code, o.customerName, o.city, o.customerPhone].some((field) =>
            field?.toLowerCase().includes(needle),
          );
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      return { rows: all.slice(offset, offset + limit).map(clone), total: all.length };
    },

    async listOrdersByUser(userId) {
      return [...orders.values()]
        .filter((o) => o.userId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(clone);
    },

    async countOrdersByStatus() {
      const counts = Object.fromEntries(ORDER_STATUSES.map((s) => [s, 0])) as Record<OrderStatus, number>;
      for (const o of orders.values()) counts[o.status] += 1;
      return counts;
    },

    async updateOrder(id, patch, event) {
      const order = mustOrder(id);
      const at = now().toISOString();
      if (patch.status) order.status = patch.status;
      if (patch.adminNotes !== undefined) order.adminNotes = patch.adminNotes ?? undefined;
      if (event) order.events.push({ ...event, at });
      order.updatedAt = at;
      return clone(order);
    },

    async addOrderEvent(id, event) {
      const order = mustOrder(id);
      const at = now().toISOString();
      order.events.push({ ...event, at });
      order.updatedAt = at;
      return clone(order);
    },

    async findOrderIdByPreview(previewId) {
      for (const o of orders.values()) {
        if (o.items.some((i) => i.previewId === previewId)) return o.id;
      }
      return null;
    },
  };
}
