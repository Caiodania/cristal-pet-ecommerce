// Cliente da API (`/api/*`, as Netlify Functions). Roda no navegador.
//
// Em produção e em `npm run dev:full` o site e a API estão na mesma origem.
// Para `next dev` (porta 3000) com a API em outra porta, defina
// NEXT_PUBLIC_API_URL=http://localhost:8888 (e ALLOWED_ORIGINS no servidor).

import type {
  AdminOrderDto,
  AdminOrderSummaryDto,
  AdminStatsDto,
  ApiErrorBody,
  ConfigDto,
  ItemConfig,
  ModelDto,
  OrderDto,
  OrderStatus,
  PreviewDto,
} from "./tipos";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

type RequestOptions = { json?: unknown; body?: Blob; timeoutMs?: number };

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);
  try {
    const headers: Record<string, string> = {};
    let body: BodyInit | undefined;
    if (opts.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.json);
    } else if (opts.body) {
      headers["Content-Type"] = opts.body.type || "application/octet-stream";
      body = opts.body;
    }
    const response = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body,
      signal: controller.signal,
      // o cookie do painel precisa ir (e voltar) também quando a API está em outra porta
      credentials: BASE ? "include" : "same-origin",
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const error = (data as ApiErrorBody | null)?.error;
      throw new ApiError(response.status, error?.code ?? "http_error", error?.message ?? "Algo deu errado. Tente de novo.");
    }
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(0, "timeout", "A conexão demorou demais. Tente de novo.");
    }
    throw new ApiError(0, "network", "Sem conexão com o servidor. Verifique a internet e tente de novo.");
  } finally {
    clearTimeout(timer);
  }
}

/** Links de arquivo relativos (`/api/files/…`) precisam do prefixo quando a API está em outra origem. */
export const fileUrl = (url: string | undefined) =>
  url && url.startsWith("/") ? `${BASE}${url}` : url;

const q = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") search.set(k, String(v));
  const s = search.toString();
  return s ? `?${s}` : "";
};

export const api = {
  config: () => request<ConfigDto>("GET", "/api/config"),

  createPreview: (input: { sessionId: string; options: ItemConfig; turnstileToken?: string }) =>
    request<PreviewDto>("POST", "/api/previews", { json: input }),
  uploadPhoto: (id: string, photo: Blob) =>
    request<PreviewDto>("PUT", `/api/previews/${id}/photo`, { body: photo, timeoutMs: 60_000 }),
  startPreview: (id: string) => request<PreviewDto>("POST", `/api/previews/${id}/start`, { json: {} }),
  getPreview: (id: string) => request<PreviewDto>("GET", `/api/previews/${id}`),
  regeneratePreview: (id: string, input: { sessionId: string; options?: ItemConfig; turnstileToken?: string }) =>
    request<PreviewDto>("POST", `/api/previews/${id}/regenerate`, { json: input }),

  createOrder: (input: {
    sessionId: string;
    previewIds: string[];
    customer: { name: string; phone?: string; city?: string; notes?: string };
    consent: boolean;
  }) => request<{ order: OrderDto; token: string }>("POST", "/api/orders", { json: input }),
  getOrder: (code: string, token: string) =>
    request<OrderDto>("GET", `/api/orders/${encodeURIComponent(code)}${q({ t: token })}`),

  admin: {
    login: (password: string) => request<{ ok: true }>("POST", "/api/admin/login", { json: { password } }),
    logout: () => request<{ ok: true }>("POST", "/api/admin/logout", { json: {} }),
    me: () => request<{ admin: boolean }>("GET", "/api/admin/me"),
    stats: () => request<AdminStatsDto>("GET", "/api/admin/stats"),
    orders: (params: { status?: OrderStatus; q?: string; page?: number }) =>
      request<{ orders: AdminOrderSummaryDto[]; total: number; pageSize: number }>(
        "GET",
        `/api/admin/orders${q(params)}`,
      ),
    order: (id: string) => request<AdminOrderDto>("GET", `/api/admin/orders/${id}`),
    updateOrder: (id: string, patch: { status?: OrderStatus; note?: string; adminNotes?: string }) =>
      request<AdminOrderDto>("PATCH", `/api/admin/orders/${id}`, { json: patch }),
    startModel: (id: string, itemId: string) =>
      request<ModelDto>("POST", `/api/admin/orders/${id}/items/${itemId}/model`, { json: {} }),
    model: (id: string, itemId: string) =>
      request<ModelDto>("GET", `/api/admin/orders/${id}/items/${itemId}/model`),
  },
};
