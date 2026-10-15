// Contrato do armazenamento de dados. Duas implementações: `memory` (testes e
// desenvolvimento) e `supabase` (produção). O resto do servidor só conhece
// esta interface, então trocar de banco é trocar um arquivo.

import type { ItemConfig, ModelStatus, OrderStatus, PreviewStatus } from "../../lib/loja/tipos";

export type PreviewRecord = {
  id: string;
  /** Id opaco usado nas URLs e no polling (imprevisível). */
  publicId: string;
  sessionId: string;
  /** Hash do IP (nunca o IP) para a cota por rede. */
  ipHash: string;
  status: PreviewStatus;
  options: ItemConfig;

  photoPath?: string;
  photoContentType?: string;

  // Etapa 1: imagem da escultura (IA de imagem)
  imageProvider: string;
  imageJobId?: string;
  imagePath?: string;
  imageContentType?: string;
  imageCostCents: number;
  startedAt?: string;
  errorCode?: string;
  errorMessage?: string;

  // Etapa 2: arquivo de impressão (IA de imagem → 3D)
  modelStatus: ModelStatus;
  modelProvider?: string;
  modelJobId?: string;
  stlPath?: string;
  glbPath?: string;
  modelError?: string;
  modelCostCents: number;

  createdAt: string;
  expiresAt: string;
};

export type OrderItemRecord = {
  id: string;
  previewId: string;
  sizeId: string;
  poseId: string;
  colorId: string;
  petName?: string;
  unitCents: number | null;
  catalogVersion: string;
};

export type OrderEventRecord = {
  status: OrderStatus;
  at: string;
  note?: string;
};

export type OrderRecord = {
  id: string;
  code: string;
  /** Token longo que vai no link do cliente; prova que ele é o dono do pedido. */
  viewToken: string;
  status: OrderStatus;
  customerName?: string;
  customerPhone?: string;
  city?: string;
  notes?: string;
  adminNotes?: string;
  estimateCents: number | null;
  discountCents: number;
  consentAt: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItemRecord[];
  events: OrderEventRecord[];
};

export type NewPreview = Omit<
  PreviewRecord,
  "id" | "createdAt" | "expiresAt" | "imageCostCents" | "modelCostCents" | "modelStatus" | "status"
>;

export type NewOrder = Omit<
  OrderRecord,
  "id" | "createdAt" | "updatedAt" | "events" | "items" | "status"
> & { items: Omit<OrderItemRecord, "id">[] };

export type OrderListFilter = {
  status?: OrderStatus;
  /** Busca por código, nome, cidade ou telefone. */
  q?: string;
  limit: number;
  offset: number;
};

export interface Store {
  readonly kind: "memory" | "supabase";

  // Prévias
  createPreview(input: NewPreview): Promise<PreviewRecord>;
  getPreview(publicId: string): Promise<PreviewRecord | null>;
  getPreviewById(id: string): Promise<PreviewRecord | null>;
  updatePreview(publicId: string, patch: Partial<PreviewRecord>): Promise<PreviewRecord>;
  countPreviews(filter: { sessionId?: string; ipHash?: string; since: Date }): Promise<number>;
  /** Soma do custo de IA (imagem + modelo 3D) das prévias criadas desde `since`. */
  sumCosts(since: Date): Promise<number>;

  // Pedidos
  createOrder(input: NewOrder): Promise<OrderRecord>;
  getOrderByCode(code: string): Promise<OrderRecord | null>;
  getOrderById(id: string): Promise<OrderRecord | null>;
  listOrders(filter: OrderListFilter): Promise<{ rows: OrderRecord[]; total: number }>;
  countOrdersByStatus(): Promise<Record<OrderStatus, number>>;
  updateOrder(
    id: string,
    patch: { status?: OrderStatus; adminNotes?: string | null },
    event?: { status: OrderStatus; note?: string },
  ): Promise<OrderRecord>;
  /** Registra um evento na linha do tempo sem mudar o status. */
  addOrderEvent(id: string, event: { status: OrderStatus; note?: string }): Promise<OrderRecord>;
  /** Id do pedido que já usa esta prévia, se houver. */
  findOrderIdByPreview(previewId: string): Promise<string | null>;
}
