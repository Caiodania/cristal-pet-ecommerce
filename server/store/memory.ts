// Armazenamento em memória: para testes e desenvolvimento local. Os dados
// somem quando o processo reinicia; em produção use o Supabase (a configuração
// recusa subir em produção com este).

import { ORDER_STATUSES, type OrderStatus } from "../../lib/loja/tipos";
import { uuid } from "../crypto";
import type {
  NewOrder,
  NewPreview,
  OrderListFilter,
  OrderRecord,
  PreviewRecord,
  Store,
} from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const clone = <T>(value: T): T => structuredClone(value);

export function createMemoryStore(now: () => Date = () => new Date()): Store {
  const previews = new Map<string, PreviewRecord>(); // por publicId
  const orders = new Map<string, OrderRecord>(); // por id

  const mustOrder = (id: string): OrderRecord => {
    const order = orders.get(id);
    if (!order) throw new Error(`pedido não existe: ${id}`);
    return order;
  };

  return {
    kind: "memory",

    async createPreview(input: NewPreview) {
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

    async countPreviews({ sessionId, ipHash, since }) {
      let count = 0;
      for (const p of previews.values()) {
        if (new Date(p.createdAt) < since) continue;
        if (sessionId && p.sessionId !== sessionId) continue;
        if (ipHash && p.ipHash !== ipHash) continue;
        count += 1;
      }
      return count;
    },

    async sumCosts(since) {
      let sum = 0;
      for (const p of previews.values()) {
        if (new Date(p.createdAt) >= since) sum += p.imageCostCents + p.modelCostCents;
      }
      return sum;
    },

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
