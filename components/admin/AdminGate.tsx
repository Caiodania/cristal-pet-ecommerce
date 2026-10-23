"use client";

import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { Alert, Loading } from "@/components/ui/Status";
import { ApiError, api } from "@/lib/loja/api";

type AdminContextValue = {
  logout: () => void;
  /** Chame quando a API responder 401: volta para a tela de login. */
  expire: () => void;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin só funciona dentro do AdminGate");
  return value;
}

type Session = "checking" | "out" | "in";

function LoginForm({ onLogin, notice }: { onLogin: () => void; notice?: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | undefined>(notice);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(undefined);
    setBusy(true);
    try {
      await api.admin.login(password);
      onLogin();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível entrar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center px-4">
      <form
        onSubmit={submit}
        className="grid w-full max-w-sm gap-5 rounded-card border border-line bg-white p-6 shadow-soft sm:p-8"
      >
        <div>
          <h1 className="font-display text-3xl font-extrabold">Painel</h1>
          <p className="mt-1 text-ink-soft">Cristal Pet Esculturas · área do dono</p>
        </div>
        <TextField
          label="Senha"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <Alert>{error}</Alert>}
        <Button type="submit" size="lg" disabled={busy || !password}>
          {busy ? "Entrando…" : "Entrar"}
        </Button>
        <Link href="/" className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-teal-deep underline underline-offset-4">
          Ir para a loja
        </Link>
      </form>
    </main>
  );
}

/**
 * Só mostra o painel para quem tem o cookie de sessão do dono. A proteção de
 * verdade está no servidor (cada rota /api/admin exige o cookie); isto só
 * decide entre mostrar o login ou o painel.
 */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>("checking");
  const [notice, setNotice] = useState<string>();

  useEffect(() => {
    let active = true;
    api.admin
      .me()
      .then(({ admin }) => active && setSession(admin ? "in" : "out"))
      .catch((error) => {
        if (!active) return;
        setNotice(error instanceof ApiError ? error.message : undefined);
        setSession("out");
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = useCallback(() => {
    void api.admin.logout().finally(() => setSession("out"));
  }, []);
  const expire = useCallback(() => {
    setNotice("Sua sessão expirou. Entre de novo.");
    setSession("out");
  }, []);

  if (session === "checking") {
    return (
      <main id="conteudo" className="grid min-h-dvh place-items-center">
        <Loading>Carregando o painel…</Loading>
      </main>
    );
  }
  if (session === "out") {
    return <LoginForm notice={notice} onLogin={() => { setNotice(undefined); setSession("in"); }} />;
  }
  return <AdminContext.Provider value={{ logout, expire }}>{children}</AdminContext.Provider>;
}

/** Barra do painel: título, atalhos e sair. */
export function AdminBar() {
  const { logout } = useAdmin();
  return (
    <header className="border-b border-line bg-white">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Link href="/admin" className="font-display text-lg font-extrabold">
          Painel <span className="font-semibold text-teal-deep">Cristal Pet</span>
        </Link>
        <nav aria-label="Painel" className="flex items-center gap-1">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink-soft hover:bg-sand hover:text-ink"
          >
            Pedidos
          </Link>
          <Link
            href="/admin/contas"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink-soft hover:bg-sand hover:text-ink"
          >
            Contas
          </Link>
          <Link
            href="/"
            target="_blank"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-ink-soft hover:bg-sand hover:text-ink"
          >
            Ver a loja<span className="sr-only"> (abre em nova aba)</span>
          </Link>
          <Button variant="secondary" size="sm" onClick={logout}>
            Sair
          </Button>
        </nav>
      </div>
    </header>
  );
}
