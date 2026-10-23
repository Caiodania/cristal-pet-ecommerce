"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { FaGoogle } from "react-icons/fa6";
import { Button } from "@/components/ui/Button";
import { CheckboxField, TextField } from "@/components/ui/Field";
import { Alert } from "@/components/ui/Status";
import { Turnstile } from "@/components/store/Turnstile";
import { previewsPerAccount } from "@/content/estatua";
import { ApiError, api } from "@/lib/loja/api";
import { account } from "@/lib/loja/conta";
import { rememberNext } from "@/lib/loja/dialogo-conta";
import { useConfig } from "@/lib/loja/useConfig";

// ───────── Peças comuns ─────────

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type FieldErrors = Partial<Record<"name" | "email" | "password" | "consent", string>>;

/** Erro da API → mensagem no campo certo (ou geral). */
function describe(error: unknown): { field?: keyof FieldErrors; message: string; code?: string } {
  if (error instanceof ApiError) {
    if (error.code === "invalid_email") return { field: "email", message: error.message, code: error.code };
    if (error.code === "weak_password") return { field: "password", message: error.message, code: error.code };
    if (error.code === "email_taken") return { field: "email", message: error.message, code: error.code };
    if (error.status === 400 && /senha/i.test(error.message)) return { field: "password", message: error.message, code: error.code };
    if (error.status === 400 && /e-mail/i.test(error.message)) return { field: "email", message: error.message, code: error.code };
    return { message: error.message, code: error.code };
  }
  return { message: "Algo deu errado. Tente de novo." };
}

/** Campo de senha com "Mostrar senha" (o toque errado em celular é a maior causa de senha perdida). */
function PasswordField({
  label = "Senha",
  value,
  onChange,
  error,
  hint,
  autoComplete,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  autoComplete: "current-password" | "new-password";
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="grid gap-1">
      <TextField
        label={label}
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        error={error}
        hint={hint}
        autoComplete={autoComplete}
        maxLength={72}
        required
      />
      <button
        type="button"
        aria-pressed={visible}
        onClick={() => setVisible((v) => !v)}
        className="min-h-11 justify-self-end rounded-full px-3 text-sm font-semibold text-teal-deep underline underline-offset-4"
      >
        {visible ? "Ocultar senha" : "Mostrar senha"}
      </button>
    </div>
  );
}

/** Captcha (só quando o servidor tem a chave): evita criar contas em massa para ganhar prévias. */
function useCaptcha() {
  const config = useConfig();
  const [token, setToken] = useState<string>();
  const [resetKey, setResetKey] = useState(0);
  const siteKey = config?.turnstileSiteKey;
  return {
    required: Boolean(siteKey),
    token,
    missing: Boolean(siteKey) && !token,
    reset: () => {
      setToken(undefined);
      setResetKey((n) => n + 1);
    },
    widget: siteKey ? <Turnstile siteKey={siteKey} onToken={setToken} resetKey={resetKey} /> : null,
  };
}

/** "Continuar com Google" (só aparece se o dono ligou o login com Google). */
export function GoogleButton({ next }: { next?: string }) {
  const config = useConfig();
  if (!config?.googleLoginUrl) return null;
  return (
    <div className="grid gap-4">
      <Button
        href={config.googleLoginUrl}
        variant="secondary"
        size="md"
        icon={<FaGoogle aria-hidden="true" />}
        onClick={() => rememberNext(next ?? window.location.pathname)}
      >
        Continuar com Google
      </Button>
      <p className="flex items-center gap-3 text-sm text-ink-soft" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        ou com e-mail
        <span className="h-px flex-1 bg-line" />
      </p>
    </div>
  );
}

/** Pede ao servidor um novo e-mail de confirmação, com espera entre os pedidos. */
function ResendButton({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string>();
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function resend() {
    setState("sending");
    try {
      await api.auth.resend(email);
      setState("sent");
      setMessage("Enviamos um novo e-mail.");
      setWait(60);
    } catch (error) {
      setState("error");
      setMessage(describe(error).message);
    }
  }

  return (
    <div className="grid gap-2">
      <Button variant="secondary" size="md" onClick={resend} disabled={state === "sending" || wait > 0}>
        {wait > 0 ? `Reenviar em ${wait}s` : "Reenviar o e-mail"}
      </Button>
      {message && (
        <p role="status" className={state === "error" ? "text-sm font-semibold text-danger" : "text-sm text-ink-soft"}>
          {message}
        </p>
      )}
    </div>
  );
}

/** Depois do cadastro com confirmação por e-mail: o que fazer agora. */
export function CheckEmail({ email, onBack }: { email: string; onBack?: () => void }) {
  return (
    <div className="grid gap-4" aria-live="polite">
      <Alert tone="success">Quase lá! Enviamos um link de confirmação para {email}.</Alert>
      <p className="text-ink-soft">
        Abra o e-mail e toque no link para ativar a sua conta. Se não encontrar, olhe também a caixa de spam. O link vale
        por 1 hora.
      </p>
      <ResendButton email={email} />
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack}>
          Usar outro e-mail
        </Button>
      )}
    </div>
  );
}

// ───────── Entrar ─────────

export function LoginForm({
  onDone,
  onForgot,
  onCreate,
  next,
}: {
  onDone: () => void;
  /** Troca para "Esqueci a senha". Sem isto, vira um link para a página. */
  onForgot?: () => void;
  onCreate?: () => void;
  next?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string>();
  const [unverified, setUnverified] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: FieldErrors = {};
    if (!EMAIL.test(email.trim())) found.email = "Informe um e-mail válido.";
    if (!password) found.password = "Informe a sua senha.";
    setErrors(found);
    setGeneral(undefined);
    setUnverified(false);
    if (Object.keys(found).length) return;

    setBusy(true);
    try {
      await account.login({ email: email.trim(), password });
      onDone();
    } catch (error) {
      const info = describe(error);
      if (info.code === "email_not_verified") setUnverified(true);
      setGeneral(info.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <GoogleButton next={next} />
      <TextField
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        required
      />
      <PasswordField value={password} onChange={setPassword} error={errors.password} autoComplete="current-password" />
      {general && <Alert>{general}</Alert>}
      {unverified && <ResendButton email={email.trim()} />}
      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? "Entrando…" : "Entrar"}
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        {onForgot ? (
          <button type="button" onClick={onForgot} className="min-h-11 font-semibold text-teal-deep underline underline-offset-4">
            Esqueci a minha senha
          </button>
        ) : (
          <Link href="/esqueci-a-senha" className="inline-flex min-h-11 items-center font-semibold text-teal-deep underline underline-offset-4">
            Esqueci a minha senha
          </Link>
        )}
        {onCreate ? (
          <button type="button" onClick={onCreate} className="min-h-11 font-semibold text-teal-deep underline underline-offset-4">
            Criar conta
          </button>
        ) : (
          <Link href="/criar-conta" className="inline-flex min-h-11 items-center font-semibold text-teal-deep underline underline-offset-4">
            Criar conta
          </Link>
        )}
      </div>
    </form>
  );
}

// ───────── Criar conta ─────────

export function SignupForm({
  onDone,
  onLogin,
  next,
}: {
  onDone: () => void;
  onLogin?: () => void;
  next?: string;
}) {
  const config = useConfig();
  const captcha = useCaptcha();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [general, setGeneral] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string>();
  const firstError = useRef<HTMLFormElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const found: FieldErrors = {};
    if (name.trim().length < 2) found.name = "Informe o seu nome.";
    if (!EMAIL.test(email.trim())) found.email = "Informe um e-mail válido.";
    if (password.length < 8) found.password = "A senha precisa ter pelo menos 8 caracteres.";
    else if (!/\p{L}/u.test(password)) found.password = "Misture letras na senha: só números é fácil de adivinhar.";
    if (!consent) found.consent = "Aceite a política de privacidade para criar a conta.";
    setErrors(found);
    setGeneral(undefined);
    if (Object.keys(found).length) {
      // leva o foco ao primeiro campo com erro
      queueMicrotask(() => firstError.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (captcha.missing) {
      setGeneral("Confirme que você não é um robô para continuar.");
      return;
    }

    setBusy(true);
    try {
      if (next) rememberNext(next);
      const result = await account.signup({ name: name.trim(), email: email.trim(), password, turnstileToken: captcha.token });
      if (result.needsVerification) setSentTo(email.trim());
      else onDone();
    } catch (error) {
      const info = describe(error);
      if (info.field) setErrors({ [info.field]: info.message });
      else setGeneral(info.message);
      captcha.reset();
    } finally {
      setBusy(false);
    }
  }

  if (sentTo) return <CheckEmail email={sentTo} onBack={() => setSentTo(undefined)} />;

  return (
    <form ref={firstError} onSubmit={submit} noValidate className="grid gap-4">
      <p className="rounded-soft bg-teal-mist p-3 text-sm font-semibold">
        Grátis: cada conta gera até {config?.previewsPerAccount ?? previewsPerAccount} prévias de escultura, sem pagar nada.
      </p>
      <GoogleButton next={next} />
      <TextField label="Seu nome" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} maxLength={60} required />
      <TextField
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        required
      />
      <PasswordField
        value={password}
        onChange={setPassword}
        error={errors.password}
        hint="No mínimo 8 caracteres, com pelo menos uma letra."
        autoComplete="new-password"
      />
      <CheckboxField
        checked={consent}
        onChange={(e) => setConsent(e.target.checked)}
        error={errors.consent}
        label={
          <>
            Li e concordo com a{" "}
            <Link href="/politica-de-privacidade" target="_blank" className="font-semibold text-teal-deep underline underline-offset-4">
              Política de privacidade
              <span className="sr-only"> (abre em nova aba)</span>
            </Link>{" "}
            e os{" "}
            <Link href="/termos-de-uso" target="_blank" className="font-semibold text-teal-deep underline underline-offset-4">
              Termos de uso
              <span className="sr-only"> (abre em nova aba)</span>
            </Link>
            .
          </>
        }
      />
      {captcha.widget}
      {general && <Alert>{general}</Alert>}
      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? "Criando a conta…" : "Criar conta grátis"}
      </Button>
      <p className="text-center text-sm text-ink-soft">
        Já tem conta?{" "}
        {onLogin ? (
          <button type="button" onClick={onLogin} className="min-h-11 font-semibold text-teal-deep underline underline-offset-4">
            Entrar
          </button>
        ) : (
          <Link href="/entrar" className="inline-flex min-h-11 items-center font-semibold text-teal-deep underline underline-offset-4">
            Entrar
          </Link>
        )}
      </p>
    </form>
  );
}

// ───────── Esqueci a senha ─────────

export function ForgotForm({ onBack }: { onBack?: () => void }) {
  const captcha = useCaptcha();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>();
  const [general, setGeneral] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setGeneral(undefined);
    if (!EMAIL.test(email.trim())) return setError("Informe um e-mail válido.");
    setError(undefined);
    if (captcha.missing) return setGeneral("Confirme que você não é um robô para continuar.");
    setBusy(true);
    try {
      await api.auth.forgot({ email: email.trim(), turnstileToken: captcha.token });
      setSent(true);
    } catch (e) {
      setGeneral(describe(e).message);
      captcha.reset();
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="grid gap-4" aria-live="polite">
        <Alert tone="success">Se existir uma conta com {email.trim()}, enviamos um link para criar uma nova senha.</Alert>
        <p className="text-ink-soft">Olhe a caixa de entrada e o spam. O link vale por 1 hora.</p>
        {onBack ? (
          <Button variant="secondary" size="md" onClick={onBack}>
            Voltar para entrar
          </Button>
        ) : (
          <Button href="/entrar" variant="secondary" size="md">
            Voltar para entrar
          </Button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <p className="text-ink-soft">Informe o e-mail da sua conta e enviamos um link para criar uma nova senha.</p>
      <TextField
        label="E-mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        required
      />
      {captcha.widget}
      {general && <Alert>{general}</Alert>}
      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? "Enviando…" : "Enviar o link"}
      </Button>
      {onBack ? (
        <Button variant="ghost" size="sm" onClick={onBack}>
          Voltar
        </Button>
      ) : (
        <Link href="/entrar" className="inline-flex min-h-11 items-center justify-center font-semibold text-teal-deep underline underline-offset-4">
          Voltar para entrar
        </Link>
      )}
    </form>
  );
}

// ───────── Nova senha (depois do link do e-mail) ─────────

export function ResetForm({ accessToken, onDone }: { accessToken: string; onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [general, setGeneral] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setGeneral(undefined);
    if (password.length < 8) return setError("A senha precisa ter pelo menos 8 caracteres.");
    if (!/\p{L}/u.test(password)) return setError("Misture letras na senha: só números é fácil de adivinhar.");
    setError(undefined);
    setBusy(true);
    try {
      await account.reset({ accessToken, password });
      onDone();
    } catch (e) {
      const info = describe(e);
      if (info.field === "password") setError(info.message);
      else setGeneral(info.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      <PasswordField
        label="Nova senha"
        value={password}
        onChange={setPassword}
        error={error}
        hint="No mínimo 8 caracteres, com pelo menos uma letra."
        autoComplete="new-password"
      />
      {general && <Alert>{general}</Alert>}
      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? "Salvando…" : "Salvar a nova senha"}
      </Button>
    </form>
  );
}
