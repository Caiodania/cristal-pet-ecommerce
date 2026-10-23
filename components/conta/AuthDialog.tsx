"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { cn } from "@/lib/cn";
import { closeAuth, useAuthDialog, type AuthDialogRequest } from "@/lib/loja/dialogo-conta";
import { ForgotForm, LoginForm, SignupForm } from "./AuthForms";

type Tab = "login" | "signup" | "forgot";

const TITLES: Record<Tab, string> = {
  login: "Entrar na sua conta",
  signup: "Crie a sua conta grátis",
  forgot: "Recuperar a senha",
};

/** O conteúdo. Monta de novo a cada abertura, então começa sempre limpo e na aba pedida. */
function Body({ request }: { request: AuthDialogRequest }) {
  const [tab, setTab] = useState<Tab>(request.tab);

  function done() {
    closeAuth();
    request.onSuccess?.();
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <h2 id="auth-dialog-titulo" className="font-display text-2xl font-extrabold sm:text-3xl">
          {TITLES[tab]}
        </h2>
        <button
          type="button"
          onClick={closeAuth}
          aria-label="Fechar"
          className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink hover:bg-sand"
        >
          <CloseIcon className="text-2xl" />
        </button>
      </div>

      {request.reason && (
        <p role="note" className="mt-3 rounded-soft bg-magenta-mist p-3 font-semibold">
          {request.reason}
        </p>
      )}

      {tab !== "forgot" && (
        <div role="tablist" aria-label="Entrar ou criar conta" className="mt-5 grid grid-cols-2 rounded-full bg-sand p-1">
          {(["login", "signup"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={cn(
                "min-h-11 rounded-full font-bold transition-colors",
                tab === id ? "bg-white text-ink shadow-soft" : "text-ink-soft hover:text-ink",
              )}
            >
              {id === "login" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {tab === "login" && <LoginForm onDone={done} onForgot={() => setTab("forgot")} onCreate={() => setTab("signup")} />}
        {tab === "signup" && <SignupForm onDone={done} onLogin={() => setTab("login")} />}
        {tab === "forgot" && <ForgotForm onBack={() => setTab("login")} />}
      </div>
    </div>
  );
}

/**
 * Diálogo de "Entrar / Criar conta", montado uma vez no layout. Abre por
 * `openAuth` (lib/loja/dialogo-conta.ts), de qualquer lugar do site, sem tirar
 * a pessoa da página.
 */
export function AuthDialogHost() {
  const request = useAuthDialog();
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (request && !dialog.open) dialog.showModal();
    if (!request && dialog.open) dialog.close();
  }, [request]);

  return (
    <dialog
      ref={ref}
      className="auth-dialog"
      aria-labelledby="auth-dialog-titulo"
      onCancel={(event) => {
        event.preventDefault(); // o Esc passa pelo nosso estado, para o diálogo e o estado não se separarem
        closeAuth();
      }}
      // clique no fundo escurecido = fora do conteúdo
      onClick={(event) => {
        if (event.target === ref.current) closeAuth();
      }}
    >
      {request && <Body request={request} />}
    </dialog>
  );
}
