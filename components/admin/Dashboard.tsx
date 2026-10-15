"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert, Loading, StatusBadge, formatDateTime } from "@/components/ui/Status";
import { ApiError, api, fileUrl } from "@/lib/loja/api";
import { formatCents } from "@/lib/loja/estimativa";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  type AdminOrderSummaryDto,
  type AdminStatsDto,
  type OrderStatus,
} from "@/lib/loja/tipos";
import { cn } from "@/lib/cn";
import { AdminBar, useAdmin } from "./AdminGate";

type Page = { orders: AdminOrderSummaryDto[]; total: number; pageSize: number };

/** Lista de pedidos do dono: contagem por status, busca, tabela e paginação. */
export function Dashboard() {
  const { expire } = useAdmin();
  const [status, setStatus] = useState<OrderStatus>();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page>();
  const [stats, setStats] = useState<AdminStatsDto>();
  const [error, setError] = useState<string>();
  const [refresh, setRefresh] = useState(0);

  // busca com atraso: não consulta a cada tecla
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    Promise.all([api.admin.orders({ status, q: search, page }), api.admin.stats()])
      .then(([orders, counts]) => {
        if (!active) return;
        setData(orders);
        setStats(counts);
        setError(undefined);
      })
      .catch((e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) return expire();
        setError(e instanceof ApiError ? e.message : "Não foi possível carregar os pedidos.");
      });
    return () => {
      active = false;
    };
  }, [status, search, page, refresh, expire]);

  // atualiza sozinho a cada 30 s, só com a aba à vista
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") setRefresh((n) => n + 1);
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <AdminBar />
      <main id="conteudo" className="container-page grid gap-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-3xl font-medium">Pedidos</h1>
          <Button variant="secondary" size="sm" onClick={() => setRefresh((n) => n + 1)}>
            Atualizar
          </Button>
        </div>

        {/* contagem por status: cada cartão é um filtro */}
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7" aria-label="Filtrar por status">
          <li>
            <FilterCard
              label="Todos"
              count={stats?.total}
              active={status === undefined}
              onClick={() => {
                setStatus(undefined);
                setPage(1);
              }}
            />
          </li>
          {ORDER_STATUSES.map((s) => (
            <li key={s}>
              <FilterCard
                label={ORDER_STATUS_LABEL[s]}
                count={stats?.byStatus[s]}
                active={status === s}
                onClick={() => {
                  setStatus(status === s ? undefined : s);
                  setPage(1);
                }}
              />
            </li>
          ))}
        </ul>

        <div className="max-w-md">
          <TextField
            label="Buscar pedido"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Código, nome, cidade ou telefone"
            autoComplete="off"
          />
        </div>

        {error && <Alert>{error}</Alert>}
        {!data && !error && <Loading>Carregando os pedidos…</Loading>}

        {data && data.orders.length === 0 && (
          <p className="rounded-card border border-dashed border-field bg-white p-8 text-center text-ink-soft">
            {search || status ? "Nenhum pedido com esse filtro." : "Ainda não chegou nenhum pedido."}
          </p>
        )}

        {data && data.orders.length > 0 && (
          <div className="table-wrapper rounded-card border border-line bg-white shadow-soft">
            <table className="orders-table">
              <caption className="sr-only">Pedidos, do mais recente para o mais antigo</caption>
              <thead>
                <tr>
                  <th scope="col">Pedido</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">Esculturas</th>
                  <th scope="col">Valor</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.orders.map((order) => (
                  <tr key={order.id}>
                    <th scope="row">
                      <Link
                        href={`/admin/pedido?id=${order.id}`}
                        className="font-display text-lg font-semibold text-teal-deep underline underline-offset-4"
                      >
                        {order.code}
                      </Link>
                      <span className="block text-sm font-normal text-ink-soft">{formatDateTime(order.createdAt)}</span>
                    </th>
                    <td>
                      <span className="cell-label">Cliente</span>
                      <span>
                        {order.customerName ?? "—"}
                        {order.city && <span className="block text-sm text-ink-soft">{order.city}</span>}
                      </span>
                    </td>
                    <td>
                      <span className="cell-label">Esculturas</span>
                      <span className="flex items-center gap-3">
                        {order.thumbUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={fileUrl(order.thumbUrl)} alt="" className="size-10 rounded-soft object-cover" />
                        )}
                        {order.itemCount}
                      </span>
                    </td>
                    <td>
                      <span className="cell-label">Valor</span>
                      <span>{formatCents(order.estimateCents)}</span>
                    </td>
                    <td>
                      <span className="cell-label">Status</span>
                      <StatusBadge status={order.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <nav aria-label="Páginas" className="flex items-center justify-center gap-3">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-sm text-ink-soft">
              Página {page} de {pages}
            </span>
            <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Próxima
            </Button>
          </nav>
        )}
      </main>
    </>
  );
}

function FilterCard({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number | undefined;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "grid w-full gap-0.5 rounded-card border-2 p-3 text-left transition-colors",
        active ? "border-teal-deep bg-teal-mist" : "border-line bg-white hover:border-field",
      )}
    >
      <span className="text-sm font-semibold text-ink-soft">{label}</span>
      <span className="font-display text-2xl font-medium">{count ?? "–"}</span>
    </button>
  );
}
