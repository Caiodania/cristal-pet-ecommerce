// Login via Supabase Auth (GoTrue), falando com a API REST dele. É o Supabase que
// guarda as senhas, envia os e-mails de confirmação e recuperação e emite os
// tokens. Nós só pedimos e conferimos: a sessão do site é nossa (cookie próprio),
// então os tokens do Supabase não saem do servidor.
//
// STATUS: escrito conforme a API do Supabase Auth, testado contra um servidor de
// mentira que imita as respostas dela (server/__tests__/auth-supabase.test.ts),
// mas NÃO testado contra um projeto Supabase real (ainda não há projeto). Quando
// houver, rode `npm run check:supabase` (cobre o cadastro e o login) antes de
// abrir a loja.
//
// O que precisa estar configurado no projeto (docs/backend.md, "Contas e login"):
//   - Authentication > Providers > Email ligado, "Confirm email" LIGADO;
//   - Authentication > URL Configuration: Site URL = endereço da loja e, em
//     Redirect URLs, /confirmar e /redefinir-senha;
//   - SMTP próprio (o padrão do Supabase serve só para testar, com limite baixo).

import { AuthError, type AuthProvider, type AuthUser } from "./types";

type Json = Record<string, unknown>;

type GoTrueUser = {
  id?: string;
  email?: string;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  identities?: unknown[];
  user_metadata?: { name?: string; full_name?: string };
};

const TIMEOUT_MS = 10_000;

function toUser(user: GoTrueUser): AuthUser {
  if (!user.id || !user.email) throw new AuthError("provider_error", "Resposta inesperada do serviço de login.");
  return {
    id: user.id,
    email: user.email.toLowerCase(),
    name: user.user_metadata?.name ?? user.user_metadata?.full_name,
    emailVerified: Boolean(user.email_confirmed_at ?? user.confirmed_at),
  };
}

/** Traduz um erro do GoTrue (o formato mudou entre versões: aceita os dois). */
function toError(status: number, body: Json | null): AuthError {
  const code = String(body?.error_code ?? body?.error ?? "");
  const text = String(body?.msg ?? body?.message ?? body?.error_description ?? "");
  const lower = `${code} ${text}`.toLowerCase();

  if (code === "email_not_confirmed" || lower.includes("email not confirmed")) {
    return new AuthError("email_not_verified", "Confirme o seu e-mail para entrar. Enviamos um link para a sua caixa de entrada.");
  }
  if (code === "invalid_credentials" || code === "invalid_grant" || lower.includes("invalid login credentials")) {
    return new AuthError("invalid_credentials", "E-mail ou senha incorretos.");
  }
  if (code === "weak_password" || lower.includes("password should") || code === "same_password") {
    return new AuthError(
      "weak_password",
      code === "same_password" ? "A nova senha precisa ser diferente da atual." : "Escolha uma senha mais forte (mínimo de 8 caracteres, com letras e números).",
    );
  }
  if (code === "user_already_exists" || code === "email_exists" || lower.includes("already registered")) {
    return new AuthError("email_taken", "Já existe uma conta com este e-mail. Entre ou redefina a senha.");
  }
  if (code === "email_address_invalid" || code === "validation_failed" || lower.includes("invalid email")) {
    return new AuthError("invalid_email", "Informe um e-mail válido.");
  }
  if (code === "signup_disabled") {
    return new AuthError("signup_disabled", "O cadastro de novas contas está desligado no momento.");
  }
  if (status === 429 || code.startsWith("over_") || lower.includes("rate limit")) {
    return new AuthError("rate_limited", "Muitos pedidos em pouco tempo. Aguarde alguns minutos e tente de novo.");
  }
  if (status === 401 || status === 403 || code === "bad_jwt" || lower.includes("invalid jwt") || lower.includes("jwt")) {
    return new AuthError("invalid_token", "Este link é inválido ou venceu. Peça um novo.");
  }
  console.error(`[auth:supabase] resposta inesperada (${status}):`, body);
  return new AuthError("provider_error", "Não foi possível falar com o serviço de login. Tente de novo em instantes.");
}

export function createSupabaseAuth(
  url: string,
  anonKey: string,
  fetchImpl: typeof fetch = fetch,
): AuthProvider {
  const base = `${url.replace(/\/$/, "")}/auth/v1`;

  async function call(
    method: string,
    path: string,
    options: { body?: Json; accessToken?: string; query?: Record<string, string> } = {},
  ): Promise<{ status: number; ok: boolean; body: Json | null }> {
    const query = options.query ? `?${new URLSearchParams(options.query)}` : "";
    let response: Response;
    try {
      response = await fetchImpl(`${base}${path}${query}`, {
        method,
        headers: {
          apikey: anonKey,
          "Content-Type": "application/json",
          ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      console.error("[auth:supabase] sem resposta:", error);
      throw new AuthError("provider_error", "Não foi possível falar com o serviço de login. Tente de novo em instantes.");
    }
    const text = await response.text();
    let body: Json | null = null;
    try {
      body = text ? (JSON.parse(text) as Json) : null;
    } catch {
      /* corpo que não é JSON */
    }
    return { status: response.status, ok: response.ok, body };
  }

  return {
    name: "supabase",
    mode: "supabase",

    async signUp({ email, password, name, redirectTo }) {
      const res = await call("POST", "/signup", {
        query: { redirect_to: redirectTo },
        body: { email, password, data: name ? { name } : {} },
      });
      if (!res.ok) throw toError(res.status, res.body);

      const body = res.body ?? {};
      // com a confirmação ligada: devolve o usuário; sem ela: uma sessão com `user`
      const user = (body.user ?? body) as GoTrueUser;
      // e-mail que já tem conta: o Supabase responde como se fosse novo, mas sem identidades
      // (não revela quem tem conta). Nós fazemos igual.
      if (Array.isArray(user.identities) && user.identities.length === 0) {
        return { user: null, needsVerification: true };
      }
      const verified = Boolean(body.access_token) || Boolean(user.email_confirmed_at ?? user.confirmed_at);
      return verified ? { user: toUser(user), needsVerification: false } : { user: null, needsVerification: true };
    },

    async signIn({ email, password }) {
      const res = await call("POST", "/token", { query: { grant_type: "password" }, body: { email, password } });
      if (!res.ok) throw toError(res.status, res.body);
      return toUser((res.body?.user ?? {}) as GoTrueUser);
    },

    async recover({ email, redirectTo }) {
      const res = await call("POST", "/recover", { query: { redirect_to: redirectTo }, body: { email } });
      // só o limite de envio é dito à pessoa; o resto (inclusive e-mail que não existe) fica em silêncio
      if (!res.ok && (res.status === 429 || String(res.body?.error_code ?? "").startsWith("over_"))) {
        throw toError(res.status, res.body);
      }
    },

    async resend({ email, redirectTo }) {
      const res = await call("POST", "/resend", { query: { redirect_to: redirectTo }, body: { type: "signup", email } });
      if (!res.ok && (res.status === 429 || String(res.body?.error_code ?? "").startsWith("over_"))) {
        throw toError(res.status, res.body);
      }
    },

    async userFromAccessToken(accessToken) {
      const res = await call("GET", "/user", { accessToken });
      if (!res.ok) throw toError(res.status === 400 ? 401 : res.status, res.body);
      const user = toUser((res.body ?? {}) as GoTrueUser);
      if (!user.emailVerified) {
        // token válido de uma conta ainda sem e-mail confirmado: não serve para entrar
        throw new AuthError("email_not_verified", "Confirme o seu e-mail para entrar.");
      }
      return user;
    },

    async updatePassword(accessToken, password) {
      const res = await call("PUT", "/user", { accessToken, body: { password } });
      if (!res.ok) throw toError(res.status, res.body);
      return toUser((res.body ?? {}) as GoTrueUser);
    },
  };
}
