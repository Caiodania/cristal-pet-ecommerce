// Contrato do login do cliente (e-mail e senha, confirmação, recuperação). Duas
// implementações: `memory` (desenvolvimento e testes, sem e-mail de verdade) e
// `supabase` (produção: Supabase Auth, que envia os e-mails e guarda as senhas).
// O resto do servidor só conhece esta interface.
//
// O provedor cuida de QUEM a pessoa é. A sessão (o cookie) e a cota de prévias
// são nossas: veja services/accounts.ts.

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  emailVerified: boolean;
};

/** Motivos de falha que o site sabe explicar à pessoa. */
export type AuthErrorCode =
  | "invalid_credentials" // e-mail ou senha errados (mesma mensagem nos dois casos)
  | "email_not_verified" // a senha confere, mas o e-mail ainda não foi confirmado
  | "email_taken" // já existe conta (só avisado quando não há confirmação por e-mail)
  | "weak_password"
  | "invalid_email"
  | "invalid_token" // link de confirmação ou recuperação inválido ou vencido
  | "rate_limited" // o provedor de e-mail limitou o envio
  | "signup_disabled"
  | "provider_error";

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface AuthProvider {
  readonly name: string;
  readonly mode: "memory" | "supabase";

  /**
   * Cria a conta. `needsVerification`: o e-mail de confirmação foi enviado e a
   * pessoa só entra depois de clicar no link. Se o e-mail já tem conta e a
   * confirmação é exigida, responde como se fosse nova (não revela quem tem
   * conta): `user` vem null.
   */
  signUp(input: {
    email: string;
    password: string;
    name?: string;
    redirectTo: string;
  }): Promise<{ user: AuthUser | null; needsVerification: boolean }>;

  /** Confere e-mail e senha. Lança AuthError. */
  signIn(input: { email: string; password: string }): Promise<AuthUser>;

  /** Envia o e-mail de recuperação. Nunca diz se o e-mail existe. */
  recover(input: { email: string; redirectTo: string }): Promise<void>;

  /** Reenvia o e-mail de confirmação. Nunca diz se o e-mail existe. */
  resend(input: { email: string; redirectTo: string }): Promise<void>;

  /**
   * Troca o token que veio no link do e-mail (ou do login com Google) por quem a
   * pessoa é. Confirma o e-mail, se ainda não estava.
   */
  userFromAccessToken(accessToken: string): Promise<AuthUser>;

  /** Define a nova senha usando o token do link de recuperação. */
  updatePassword(accessToken: string, password: string): Promise<AuthUser>;
}
