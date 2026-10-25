"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { NaoEncontrada } from "@/components/ui/NaoEncontrada";
import { Loading } from "@/components/ui/Status";
import { ApiError } from "@/lib/loja/api";
import { account, useAccount } from "@/lib/loja/conta";

type AdminContextValue = {
  /** Sai da conta e volta para a loja. */
  logout: () => void;
  /** Chame quando a API responder 404/401 no meio do uso (a sessão acabou): reconfere quem está logado. */
  expire: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

/**
 * A API responde 404 (igual a uma rota que não existe) a quem não é o dono, o que
 * inclui o dono cuja sessão acabou; 401 é o login vencido. Em qualquer dos dois
 * vale reconferir quem está logado (`expire`): se o acesso acabou, o AdminGate
 * passa a mostrar o "não encontrada"; se não, o erro da tela continua visível.
 */
export const lostAccess = (error: unknown) => error instanceof ApiError && (error.status === 401 || error.status === 404);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin só funciona dentro do AdminGate");
  return value;
}

/**
 * O painel é só do dono. Não há tela de login do painel: o dono entra pelo login
 * normal do site, com a conta dele, e só a conta cujo e-mail está em ADMIN_EMAILS
 * recebe `isAdmin`. Para qualquer outra pessoa (visitante ou cliente) esta página
 * mostra o "não encontrada" do site, igual a um endereço que não existe.
 *
 * A proteção de verdade está no servidor: toda rota /api/admin responde 404 a quem
 * não é o dono. Isto só decide o que mostrar.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { status, user } = useAccount();
  const router = useRouter();
  const isOwner = Boolean(user?.isAdmin);

  // o título só vira "Painel do dono" depois que se sabe que é o dono
  useEffect(() => {
    if (isOwner) document.title = "Painel do dono";
  }, [isOwner]);

  const logout = useCallback(() => {
    void account.logout().finally(() => router.replace("/"));
  }, [router]);
  const expire = useCallback(() => {
    void account.refresh();
  }, []);

  if (status === "loading") {
    return (
      <main id="conteudo" className="grid min-h-dvh place-items-center">
        <Loading>Carregando…</Loading>
      </main>
    );
  }
  if (!isOwner) return <NaoEncontrada />;
  return <AdminContext.Provider value={{ logout, expire }}>{children}</AdminContext.Provider>;
}

/** Barra do painel: título, atalhos e sair. */
export function AdminBar() {
  const { logout } = useAdmin();
  const { user } = useAccount();
  const link =
    "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink-soft hover:bg-sand hover:text-ink";
  return (
    <header className="border-b border-line bg-white">
      <div className="container-page flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-1">
        <Link href="/admin" className="font-display text-lg font-extrabold">
          Painel <span className="font-extrabold text-teal-deep">Cristal Pet</span>
        </Link>
        <nav aria-label="Painel" className="flex flex-wrap items-center gap-1">
          <Link href="/admin" className={link}>
            Pedidos
          </Link>
          <Link href="/admin/contas" className={link}>
            Contas
          </Link>
          <Link href="/" target="_blank" className={link}>
            Ver a loja<span className="sr-only"> (abre em nova aba)</span>
          </Link>
          {user && <span className="hidden px-2 text-sm text-ink-soft lg:inline">{user.email}</span>}
          <Button variant="secondary" size="sm" onClick={logout}>
            Sair
          </Button>
        </nav>
      </div>
    </header>
  );
}
