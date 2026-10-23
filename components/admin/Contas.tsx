"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert, Loading, formatDateTime } from "@/components/ui/Status";
import { ApiError, api } from "@/lib/loja/api";
import type { AdminUserDto } from "@/lib/loja/tipos";
import { AdminBar, useAdmin } from "./AdminGate";

type Page = { users: AdminUserDto[]; total: number; pageSize: number };

/** Uma conta: quantas prévias usou e quantas extras o dono libera. */
function UserRow({ user, onChange }: { user: AdminUserDto; onChange: (next: AdminUserDto) => void }) {
  const { expire } = useAdmin();
  const [bonus, setBonus] = useState(String(user.bonusPreviews));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const changed = Number(bonus) !== user.bonusPreviews;

  async function save() {
    setBusy(true);
    setMessage(undefined);
    try {
      const next = await api.admin.grantPreviews(user.id, Number(bonus));
      onChange(next);
      setBonus(String(next.bonusPreviews));
      setMessage({ ok: true, text: "Salvo." });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return expire();
      setMessage({ ok: false, text: error instanceof ApiError ? error.message : "Não foi possível salvar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr>
      <th scope="row" className="font-normal">
        <span className="cell-label">Conta</span>
        <span className="block font-semibold">{user.name ?? "Sem nome"}</span>
        <span className="block break-all text-sm text-ink-soft">{user.email}</span>
      </th>
      <td>
        <span className="cell-label">Cadastro</span>
        <span className="text-sm">{formatDateTime(user.createdAt)}</span>
      </td>
      <td>
        <span className="cell-label">Prévias</span>
        <span className="font-semibold">
          {user.previewsUsed} de {user.previewsLimit}
        </span>
      </td>
      <td>
        <span className="cell-label">Pedidos</span>
        {user.orderCount}
      </td>
      <td>
        <span className="cell-label">Liberar prévias extras</span>
        <span className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={bonus}
            onChange={(e) => setBonus(e.target.value)}
            aria-label={`Prévias extras para ${user.email}`}
            className="min-h-11 w-20 rounded-soft border border-field bg-white px-3 text-base"
          />
          <Button size="sm" variant="secondary" onClick={save} disabled={busy || !changed}>
            Salvar
          </Button>
          {message && (
            <span role="status" className={message.ok ? "text-sm text-teal-deep" : "text-sm font-semibold text-danger"}>
              {message.text}
            </span>
          )}
        </span>
      </td>
    </tr>
  );
}

/** Contas dos clientes: quem gerou quantas prévias e a liberação de prévias extras. */
export function Contas() {
  const { expire } = useAdmin();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let active = true;
    api.admin
      .users({ q: search, page })
      .then((result) => {
        if (!active) return;
        setData(result);
        setError(undefined);
      })
      .catch((e) => {
        if (!active) return;
        if (e instanceof ApiError && e.status === 401) return expire();
        setError(e instanceof ApiError ? e.message : "Não foi possível carregar as contas.");
      });
    return () => {
      active = false;
    };
  }, [search, page, expire]);

  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <>
      <AdminBar />
      <main id="conteudo" className="container-page grid gap-6 py-8">
        <h1 className="font-display text-3xl font-extrabold">Contas dos clientes</h1>
        <p className="mt-1 max-w-2xl text-ink-soft">
          Cada conta gera um número limitado de prévias grátis. Aqui você vê quanto cada cliente já usou e libera
          prévias extras (por exemplo, para quem já fez um pedido).
        </p>

        <div className="max-w-sm">
          <TextField
            label="Buscar por nome ou e-mail"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div>
          {error && <Alert>{error}</Alert>}
          {!data && !error && <Loading>Carregando as contas…</Loading>}
          {data && data.users.length === 0 && (
            <p className="text-ink-soft">{search ? "Nenhuma conta encontrada." : "Ainda não há contas."}</p>
          )}
          {data && data.users.length > 0 && (
            <div className="table-wrapper rounded-card border border-line bg-white shadow-soft">
              <table className="orders-table">
                <caption className="sr-only">Contas dos clientes</caption>
                <thead>
                  <tr>
                    <th scope="col">Conta</th>
                    <th scope="col">Cadastro</th>
                    <th scope="col">Prévias</th>
                    <th scope="col">Pedidos</th>
                    <th scope="col">Prévias extras</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      onChange={(next) =>
                        setData((current) =>
                          current ? { ...current, users: current.users.map((u) => (u.id === next.id ? next : u)) } : current,
                        )
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {data && pages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                Anterior
              </Button>
              <span className="text-sm text-ink-soft">
                Página {page} de {pages} ({data.total} contas)
              </span>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
                Próxima
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
