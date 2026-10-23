// Contrato do armazenamento de dados. Duas implementações: `memory` (testes e
// desenvolvimento) e `supabase` (produção). O resto do servidor só conhece
// esta interface, então trocar de banco é trocar um arquivo.

import type { ItemConfig, ModelStatus, OrderStatus, PreviewStatus } from "../../lib/loja/tipos";

/** A conta de um cliente (o login em si vive no Supabase Auth; aqui ficam os dados da loja). */
export type ProfileRecord = {
  /** O mesmo id do usuário no Supabase Auth. */
  id: string;
  email: string;
  name?: string;
  /** Prévias extras que o dono liberou para esta conta (somam ao limite padrão). */
  bonusPreviews: number;
  createdAt: string;
  lastLoginAt?: string;
};

/** Sessão de login do cliente. O cookie leva o token; aqui só fica o hash dele. */
export type SessionRecord = {
  tokenHash: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

/** A conta já usou todas as prévias a que tem direito. */
export class QuotaExceededError extends Error {
  constructor(
    public used: number,
    public limit: number,
  ) {
    super("quota_exceeded");
  }
}

export type PreviewRecord = {
  id: string;
  /** Id opaco usado nas URLs e no polling (imprevisível). */
  publicId: string;
  /** Dono da prévia (a conta que a gerou). */
  userId: string;
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
  /** Conta que fez o pedido. */
  userId?: string;
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

export type ProfileListFilter = {
  /** Busca por e-mail ou nome. */
  q?: string;
  limit: number;
  offset: number;
};

export type ProfileWithUsage = ProfileRecord & { previewsUsed: number; orderCount: number };

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

  // Contas
  /** Cria a conta ou atualiza e-mail e nome (login e cadastro chamam). */
  upsertProfile(input: { id: string; email: string; name?: string }): Promise<ProfileRecord>;
  getProfile(id: string): Promise<ProfileRecord | null>;
  touchLogin(id: string): Promise<void>;
  setBonusPreviews(id: string, bonus: number): Promise<ProfileRecord>;
  listProfiles(filter: ProfileListFilter): Promise<{ rows: ProfileWithUsage[]; total: number }>;

  // Sessões de login
  createSession(session: SessionRecord): Promise<void>;
  getSession(tokenHash: string): Promise<SessionRecord | null>;
  deleteSession(tokenHash: string): Promise<void>;
  /** Encerra todas as sessões de uma conta (troca de senha). */
  deleteUserSessions(userId: string): Promise<void>;
  /** Apaga as sessões vencidas (limpeza); devolve quantas. */
  deleteExpiredSessions(): Promise<number>;

  // Prévias
  /**
   * Cria a prévia SE a conta ainda tem direito a mais uma, tudo de uma vez (no
   * Postgres, numa transação com a conta travada: duas chamadas ao mesmo tempo
   * não passam do limite). Lança QuotaExceededError quando acabou.
   * `limit` é o limite padrão; o bônus da conta soma a ele.
   */
  reservePreview(input: NewPreview, limit: number): Promise<PreviewRecord>;
  /** Prévias que contam na cota: prontas, em geração, expiradas e as recém-criadas (< 1 h) que ainda esperam a foto. */
  countUserPreviews(userId: string): Promise<number>;
  getPreview(publicId: string): Promise<PreviewRecord | null>;
  getPreviewById(id: string): Promise<PreviewRecord | null>;
  updatePreview(publicId: string, patch: Partial<PreviewRecord>): Promise<PreviewRecord>;
  /** Prévias criadas desde `since`, para o limite diário por rede. */
  countPreviews(filter: { ipHash: string; since: Date }): Promise<number>;
  /** Soma do custo de IA (imagem + modelo 3D) das prévias criadas desde `since`. */
  sumCosts(since: Date): Promise<number>;

  // Pedidos
  createOrder(input: NewOrder): Promise<OrderRecord>;
  getOrderByCode(code: string): Promise<OrderRecord | null>;
  getOrderById(id: string): Promise<OrderRecord | null>;
  listOrders(filter: OrderListFilter): Promise<{ rows: OrderRecord[]; total: number }>;
  /** Pedidos de uma conta, do mais novo para o mais antigo. */
  listOrdersByUser(userId: string): Promise<OrderRecord[]>;
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
