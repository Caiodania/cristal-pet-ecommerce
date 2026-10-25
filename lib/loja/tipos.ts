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

// ───────── Entrega ─────────

/** Como o cliente recebe: em casa (entrega ou envio) ou retirando com a loja. */
export type DeliveryMethod = "entrega" | "retirada";

export const DELIVERY_LABEL: Record<DeliveryMethod, string> = {
  entrega: "Entrega no endereço",
  retirada: "Retirada com a loja",
};

export type Address = {
  /** Só os 8 dígitos. */
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  /** Sigla da UF (SP). */
  state: string;
};

export const BR_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const formatCep = (cep: string) => cep.replace(/^(\d{5})(\d{3})$/, "$1-$2");

/** O endereço como vai na etiqueta (várias linhas). */
export const formatAddress = (a: Address) =>
  [
    `${a.street}, ${a.number}${a.complement ? ` - ${a.complement}` : ""}`,
    a.neighborhood,
    `${a.city} - ${a.state}`,
    `CEP ${formatCep(a.cep)}`,
  ].join("\n");

/** (19) 99999-1234 a partir dos dígitos guardados (com ou sem o 55 do Brasil). */
export function formatPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return phone;
}

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
  /** Quantas prévias ainda restam nesta conta. */
  remaining?: number;
};

// ───────── Conta do cliente ─────────

export type AccountDto = {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
  /** Só existe (e vale true) para a conta do dono: o site mostra o atalho do painel. */
  isAdmin?: true;
};

/** Cota de prévias da conta (o limite padrão mais o que o dono liberou). */
export type QuotaDto = {
  limit: number;
  used: number;
  remaining: number;
};

/** `GET /api/auth/me`: quem está logado (ou ninguém) e a cota. */
export type SessionDto = {
  user: AccountDto | null;
  quota?: QuotaDto;
};

/** Resposta de cadastro e de login. `needsVerification`: falta confirmar o e-mail. */
export type AuthResultDto = {
  user: AccountDto | null;
  quota?: QuotaDto;
  needsVerification: boolean;
};

/** Pedido na lista de "Meus pedidos" da conta (leva o token do link de acompanhamento). */
export type MyOrderDto = {
  code: string;
  token: string;
  status: OrderStatus;
  createdAt: string;
  itemCount: number;
  estimateCents: number | null;
};

export type AdminUserDto = {
  id: string;
  email: string;
  name?: string;
  createdAt: string;
  lastLoginAt?: string;
  previewsUsed: number;
  /** Limite padrão + bônus. */
  previewsLimit: number;
  bonusPreviews: number;
  orderCount: number;
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
  /** Andamento de 0 a 100 enquanto gera, quando o provedor informa. */
  progress?: number;
  /** Nome do provedor que gerou (ou está gerando) o arquivo. */
  provider?: string;
  /** Custo acumulado em centavos (todas as tentativas). */
  costCents?: number;
  /** Links temporários dos arquivos, quando prontos (só no painel do dono). */
  stlUrl?: string;
  glbUrl?: string;
};

export type AdminOrderItemDto = OrderItemDto & {
  photoUrl?: string;
  /** Links que baixam a foto original e a prévia com um nome de arquivo bom (CP-XXXXXX-nome-foto.jpg). */
  photoDownloadUrl?: string;
  imageDownloadUrl?: string;
  model: ModelDto;
  heightCm: number | null;
};

/** Visão do dono: tudo. */
export type AdminOrderDto = Omit<OrderDto, "items"> & {
  id: string;
  /** E-mail da conta que fez o pedido. */
  accountEmail?: string;
  customerPhone?: string;
  /** Como o cliente quer receber, e o endereço (só na entrega). */
  deliveryMethod?: DeliveryMethod;
  address?: Address;
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
  /** "Indaiatuba - SP" na entrega; vazio na retirada. */
  cityState?: string;
  deliveryMethod?: DeliveryMethod;
  itemCount: number;
  /** Quantos itens já têm o arquivo 3D pronto (e quantos estão sendo gerados agora). */
  modelsReady: number;
  modelsRunning: number;
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
  /** Quantas prévias cada conta pode gerar (o dono pode liberar mais a uma conta). */
  previewsPerAccount: number;
  turnstileSiteKey?: string;
  /** Endereço para entrar com Google (só aparece se estiver ligado). */
  googleLoginUrl?: string;
  catalogVersion: string;
};

export type ApiErrorBody = { error: { code: string; message: string } };
