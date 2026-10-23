"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { FaWhatsapp } from "react-icons/fa6";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CreateButton } from "@/components/ui/CtaButtons";
import { Alert, Loading } from "@/components/ui/Status";
import { site } from "@/content/site";
import { ApiError } from "@/lib/loja/api";
import { account, safeNext, useAccount } from "@/lib/loja/conta";
import { takeNext } from "@/lib/loja/dialogo-conta";
import { buildWhatsAppUrl } from "@/lib/whatsapp";
import { ForgotForm, LoginForm, ResetForm, SignupForm } from "./AuthForms";
import { LoginPrompt } from "./LoginPrompt";
import { QuotaMeter } from "./QuotaMeter";

// O corpo de cada página da conta (as rotas em app/(loja)/ só põem o título e o
// <Suspense>). Tudo aqui roda no navegador: a conta vive no cookie da sessão.

function AuthCard({ children }: { children: React.ReactNode }) {
  return <Card className="mx-auto w-full max-w-lg rounded-3xl shadow-lift">{children}</Card>;
}

/** Quem já está logado não precisa ver o formulário: vai direto para onde ia. */
function useRedirectWhenLoggedIn(next: string) {
  const { user } = useAccount();
  const router = useRouter();
  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);
  return user;
}

// ───────── /entrar ─────────

export function EntrarCorpo() {
  const next = safeNext(useSearchParams().get("proximo"));
  const router = useRouter();
  const user = useRedirectWhenLoggedIn(next);
  if (user) return <Loading>Você já está logado. Levando você…</Loading>;
  return (
    <AuthCard>
      <LoginForm onDone={() => router.replace(next)} next={next} />
    </AuthCard>
  );
}

// ───────── /criar-conta ─────────

export function CriarContaCorpo() {
  const next = safeNext(useSearchParams().get("proximo"), "/personalizar");
  const router = useRouter();
  const user = useRedirectWhenLoggedIn(next);
  if (user) return <Loading>Você já está logado. Levando você…</Loading>;
  return (
    <AuthCard>
      <SignupForm onDone={() => router.replace(next)} next={next} />
    </AuthCard>
  );
}

// ───────── /esqueci-a-senha ─────────

export function EsqueciCorpo() {
  return (
    <AuthCard>
      <ForgotForm />
    </AuthCard>
  );
}

// ───────── links que chegam por e-mail ─────────

type HashInfo = { accessToken?: string; type?: string; error?: string };

/**
 * O Supabase põe o resultado do link depois do # (access_token, type, ou um erro).
 * Lê uma vez, na primeira renderização no navegador (estas páginas não são
 * geradas no servidor: useSearchParams as deixa só para o navegador).
 */
function readHash(): HashInfo {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return {
    accessToken: params.get("access_token") ?? undefined,
    type: params.get("type") ?? undefined,
    error: params.get("error_description") ?? params.get("error") ?? undefined,
  };
}

/** Tira o token da barra de endereço (ele não precisa ficar no histórico do navegador). */
function clearHash() {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

// ───────── /confirmar (confirmação de e-mail e retorno do Google) ─────────

export function ConfirmarCorpo() {
  useSearchParams(); // só para a página ser montada no navegador, onde está o # do link
  const router = useRouter();
  const [hash] = useState<HashInfo>(readHash);
  const [state, setState] = useState<"working" | "done" | "error">(hash.accessToken ? "working" : "error");
  const [message, setMessage] = useState<string | undefined>(
    hash.accessToken ? undefined : (hash.error ?? "Este link de confirmação não é válido. Abra o link direto do e-mail."),
  );
  const ran = useRef(false);

  useEffect(() => {
    if (!hash.accessToken || ran.current) return;
    ran.current = true;
    clearHash();
    account
      .confirm(hash.accessToken)
      .then(() => {
        setState("done");
        const target = safeNext(takeNext(), "/minha-conta");
        setTimeout(() => router.replace(target), 1400);
      })
      .catch((error) => {
        setState("error");
        setMessage(error instanceof ApiError ? error.message : "Não foi possível confirmar o e-mail. Tente de novo.");
      });
  }, [hash.accessToken, router]);

  return (
    <AuthCard>
      <div className="grid gap-4 text-center" aria-live="polite">
        {state === "working" && <Loading>Confirmando o seu e-mail…</Loading>}
        {state === "done" && (
          <>
            <Alert tone="success">E-mail confirmado! Você já está dentro.</Alert>
            <p className="text-ink-soft">Levando você de volta…</p>
          </>
        )}
        {state === "error" && (
          <>
            <Alert>{message}</Alert>
            <p className="text-ink-soft">
              O link pode ter vencido (vale por 1 hora). Entre com o seu e-mail e a senha: se a conta ainda não foi
              confirmada, você pode pedir um novo link.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button href="/entrar" size="md">
                Entrar
              </Button>
              <Button href="/criar-conta" variant="secondary" size="md">
                Criar conta
              </Button>
            </div>
          </>
        )}
      </div>
    </AuthCard>
  );
}

// ───────── /redefinir-senha ─────────

export function RedefinirCorpo() {
  useSearchParams();
  const router = useRouter();
  const [hash] = useState<HashInfo>(readHash);
  const [token] = useState(hash.accessToken);

  useEffect(() => {
    if (hash.accessToken) clearHash();
  }, [hash.accessToken]);

  if (!token) {
    return (
      <AuthCard>
        <div className="grid gap-4 text-center">
          <Alert>{hash.error ?? "Este link para criar uma nova senha não é válido ou já venceu."}</Alert>
          <p className="text-ink-soft">Peça um novo link: ele vale por 1 hora.</p>
          <Button href="/esqueci-a-senha" size="md">
            Pedir um novo link
          </Button>
        </div>
      </AuthCard>
    );
  }
  return (
    <AuthCard>
      <ResetForm accessToken={token} onDone={() => router.replace("/minha-conta")} />
    </AuthCard>
  );
}

// ───────── /minha-conta ─────────

export function MinhaContaCorpo() {
  const { status, user, quota } = useAccount();
  const router = useRouter();

  if (status === "loading") return <Loading>Carregando a sua conta…</Loading>;
  if (!user) {
    return (
      <LoginPrompt
        title="Entre para ver a sua conta"
        text="Faça login ou crie uma conta grátis para gerar prévias de escultura e acompanhar os seus pedidos."
        onSuccess={() => router.refresh()}
      />
    );
  }

  const noMore = quota?.remaining === 0;
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <Card className="rounded-3xl shadow-lift">
        <div className="flex flex-wrap items-center gap-4">
          <span
            aria-hidden="true"
            className="grid size-16 place-items-center rounded-full bg-magenta font-display text-3xl font-extrabold text-white shadow-soft"
          >
            {(user.name ?? user.email).trim().charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-extrabold">{user.name ?? "Minha conta"}</h2>
            <p className="truncate text-ink-soft">{user.email}</p>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl">
        <h2 className="font-display text-xl font-extrabold">Prévias de escultura</h2>
        <p className="mt-1 text-ink-soft">
          Cada conta gera um número limitado de prévias grátis. Elas contam quando a prévia é gerada.
        </p>
        {quota && <QuotaMeter quota={quota} className="mt-4" />}
        <div className="mt-5 flex flex-wrap gap-3">
          {noMore ? (
            <Button
              href={buildWhatsAppUrl(`Olá! Usei todas as prévias da minha conta (${user.email}) e quero fazer mais uma escultura.`)}
              size="md"
              icon={<FaWhatsapp aria-hidden="true" className="text-xl" />}
            >
              Pedir mais prévias no WhatsApp
            </Button>
          ) : (
            <CreateButton size="md">Criar uma escultura</CreateButton>
          )}
        </div>
        {noMore && (
          <p className="mt-3 text-sm text-ink-soft">
            Falamos com você {site.hoursSentence}. Também dá para fazer o pedido com as prévias que você já gerou.
          </p>
        )}
      </Card>

      <Card className="rounded-3xl">
        <h2 className="font-display text-xl font-extrabold">Pedidos</h2>
        <p className="mt-1 text-ink-soft">Acompanhe o andamento das suas esculturas em qualquer aparelho.</p>
        <div className="mt-4">
          <Button href="/meus-pedidos" variant="secondary" size="md">
            Ver meus pedidos
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/politica-de-privacidade" className="inline-flex min-h-11 items-center text-sm font-semibold text-teal-deep underline underline-offset-4">
          Política de privacidade
        </Link>
        <Button
          variant="ghost"
          onClick={async () => {
            await account.logout();
            router.replace("/");
          }}
        >
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
