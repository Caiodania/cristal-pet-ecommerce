// Tipos compartilhados entre o site (navegador) e o servidor (Netlify Functions).
// Só imports relativos e nenhuma API de navegador: o servidor importa este arquivo.

/** As escolhas do cliente para UMA escultura. */
export type ItemConfig = {
  sizeId: string;
  poseId: string;
  colorId: string;
  petName?: string;
};

// ───────── Prévia (etapa 1 da IA: foto → imagem da escultura) ─────────

export type PreviewStatus =
  | "queued" // criada, esperando a foto
  | "generating" // a IA está gerando a imagem
  | "ready" // imagem pronta
  | "failed" // erro do provedor
  | "rejected" // foto recusada (sem pet, vários pets, imprópria…)
  | "expired";

// ───────── Arquivo de impressão (etapa 2: imagem → modelo 3D pronto) ─────────

export type ModelStatus = "none" | "queued" | "processing" | "ready" | "failed";

// ───────── Pedido ─────────

export type OrderStatus =
  | "new" // enviado pelo cliente
  | "confirmed" // combinado (e pago) no WhatsApp
  | "in_production" // na impressora
  | "ready" // pronto para entregar
  | "delivered"
  | "canceled";

export const ORDER_STATUSES: OrderStatus[] = [
  "new",
  "confirmed",
  "in_production",
  "ready",
  "delivered",
  "canceled",
];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "Novo",
  confirmed: "Confirmado",
  in_production: "Em produção",
  ready: "Pronto",
  delivered: "Entregue",
  canceled: "Cancelado",
};

/** Quem o cliente vê: "Novo" soa a coisa do dono; para ele é "Recebido". */
export const ORDER_STATUS_LABEL_CUSTOMER: Record<OrderStatus, string> = {
  new: "Pedido recebido",
  confirmed: "Pedido confirmado",
  in_production: "Em produção",
  ready: "Pronto para entrega",
  delivered: "Entregue",
  canceled: "Cancelado",
};

/** Para quais status cada um pode ir. Só o dono muda o status. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "canceled"],
  confirmed: ["in_production", "canceled"],
  in_production: ["ready", "canceled"],
  ready: ["delivered", "canceled"],
  delivered: [],
  canceled: ["new"], // reabrir
};

export const canTransition = (from: OrderStatus, to: OrderStatus) =>
  ORDER_TRANSITIONS[from].includes(to);

// ───────── DTOs (o que a API devolve) ─────────

export type PreviewDto = {
  id: string;
  status: PreviewStatus;
  options: ItemConfig;
  /** URL temporária da imagem da escultura (quando pronta). */
  imageUrl?: string;
  /** Código curto do problema, quando falhou ou foi recusada. */
  errorCode?: string;
  errorMessage?: string;
  /** Quantas prévias ainda restam hoje para este visitante. */
  remaining?: number;
};

export type OrderEventDto = {
  status: OrderStatus;
  at: string;
  note?: string;
};

export type OrderItemDto = {
  id: string;
  sizeId: string;
  poseId: string;
  colorId: string;
  petName?: string;
  /** Preço unitário estimado; null = a combinar. */
  unitCents: number | null;
  previewId: string;
  imageUrl?: string;
};

/** Visão do cliente: sem telefone, sem notas internas. */
export type OrderDto = {
  code: string;
  status: OrderStatus;
  createdAt: string;
  customerName?: string;
  city?: string;
  /** Total estimado; null = valor a combinar no WhatsApp. */
  estimateCents: number | null;
  discountCents: number;
  items: OrderItemDto[];
  timeline: OrderEventDto[];
};

export type ModelDto = {
  status: ModelStatus;
  errorMessage?: string;
  /** Links temporários dos arquivos, quando prontos (só no painel do dono). */
  stlUrl?: string;
  glbUrl?: string;
};

export type AdminOrderItemDto = OrderItemDto & {
  photoUrl?: string;
  model: ModelDto;
  heightCm: number | null;
};

/** Visão do dono: tudo. */
export type AdminOrderDto = Omit<OrderDto, "items"> & {
  id: string;
  customerPhone?: string;
  notes?: string;
  adminNotes?: string;
  items: AdminOrderItemDto[];
  updatedAt: string;
};

export type AdminOrderSummaryDto = {
  id: string;
  code: string;
  status: OrderStatus;
  createdAt: string;
  customerName?: string;
  city?: string;
  itemCount: number;
  estimateCents: number | null;
  thumbUrl?: string;
};

export type AdminStatsDto = {
  byStatus: Record<OrderStatus, number>;
  total: number;
};

/** O que `GET /api/config` devolve. */
export type ConfigDto = {
  /** "demo" enquanto algum provedor de IA for simulado. */
  mode: "demo" | "live";
  imageProvider: { name: string; mode: "mock" | "live" };
  modelProvider: { name: string; mode: "mock" | "live" };
  previewsPerDay: number;
  turnstileSiteKey?: string;
  catalogVersion: string;
};

export type ApiErrorBody = { error: { code: string; message: string } };
