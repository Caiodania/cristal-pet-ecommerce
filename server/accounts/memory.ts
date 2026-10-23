// Login em memória: para desenvolvimento e testes. Não envia e-mail de verdade:
// cada "e-mail" vai para `outbox` (os testes leem) e o link aparece no log do
// servidor, para quem está desenvolvendo clicar. Os dados somem ao reiniciar.
// A configuração recusa este provedor em produção.

import { randomToken, uuid } from "../crypto";
import { hashPassword, verifyPassword } from "./password";
import { AuthError, type AuthProvider, type AuthUser } from "./types";

export type OutboxEmail = {
  to: string;
  kind: "signup" | "recovery";
  /** O link que a pessoa clicaria; leva o token no # como o Supabase faz. */
  link: string;
  token: string;
};

type Account = {
  id: string;
  email: string;
  name?: string;
  passwordHash: string;
  verified: boolean;
};

type TokenRecord = { userId: string; kind: "signup" | "recovery"; expiresAt: number };

export type MemoryAuth = AuthProvider & { outbox: OutboxEmail[] };

const TOKEN_TTL_MS = 60 * 60 * 1000;

export function createMemoryAuth(options: {
  /** Exigir confirmação de e-mail (como o Supabase em produção). Padrão: não, para facilitar o desenvolvimento. */
  requireVerification: boolean;
  now?: () => Date;
  /** Onde mostrar os links dos "e-mails". Padrão: console. */
  log?: (message: string) => void;
}): MemoryAuth {
  const now = options.now ?? (() => new Date());
  const log = options.log ?? ((message: string) => console.log(message));
  const accounts = new Map<string, Account>(); // por e-mail
  const tokens = new Map<string, TokenRecord>();
  const outbox: OutboxEmail[] = [];

  const view = (a: Account): AuthUser => ({ id: a.id, email: a.email, name: a.name, emailVerified: a.verified });

  function send(account: Account, kind: OutboxEmail["kind"], redirectTo: string) {
    const token = randomToken(24);
    tokens.set(token, { userId: account.id, kind, expiresAt: now().getTime() + TOKEN_TTL_MS });
    const link = `${redirectTo}#access_token=${token}&type=${kind}`;
    outbox.push({ to: account.email, kind, link, token });
    log(`[auth:memory] e-mail de ${kind === "signup" ? "confirmação" : "recuperação"} para ${account.email}: ${link}`);
  }

  function byToken(accessToken: string, kind?: TokenRecord["kind"]): { account: Account; record: TokenRecord } {
    const record = tokens.get(accessToken);
    if (!record || record.expiresAt < now().getTime() || (kind && record.kind !== kind)) {
      throw new AuthError("invalid_token", "Este link é inválido ou venceu. Peça um novo.");
    }
    const account = [...accounts.values()].find((a) => a.id === record.userId);
    if (!account) throw new AuthError("invalid_token", "Este link é inválido ou venceu. Peça um novo.");
    return { account, record };
  }

  return {
    name: "memory",
    mode: "memory",
    outbox,

    async signUp({ email, password, name, redirectTo }) {
      const existing = accounts.get(email);
      if (existing) {
        // com confirmação por e-mail não revelamos quem já tem conta (o dono do
        // e-mail recebe o aviso na caixa de entrada); sem ela, avisar é o único jeito
        if (!options.requireVerification) {
          throw new AuthError("email_taken", "Já existe uma conta com este e-mail. Entre ou redefina a senha.");
        }
        return { user: null, needsVerification: true };
      }
      const account: Account = {
        id: uuid(),
        email,
        name,
        passwordHash: await hashPassword(password),
        verified: !options.requireVerification,
      };
      accounts.set(email, account);
      if (options.requireVerification) {
        send(account, "signup", redirectTo);
        return { user: null, needsVerification: true };
      }
      return { user: view(account), needsVerification: false };
    },

    async signIn({ email, password }) {
      const account = accounts.get(email);
      // gasta o mesmo tempo com e-mail inexistente (não revela quem tem conta pelo tempo de resposta)
      const ok = await verifyPassword(password, account?.passwordHash ?? "scrypt$AAAA$AAAA");
      if (!account || !ok) throw new AuthError("invalid_credentials", "E-mail ou senha incorretos.");
      if (!account.verified) {
        throw new AuthError("email_not_verified", "Confirme o seu e-mail para entrar. Enviamos um link para a sua caixa de entrada.");
      }
      return view(account);
    },

    async recover({ email, redirectTo }) {
      const account = accounts.get(email);
      if (account) send(account, "recovery", redirectTo);
    },

    async resend({ email, redirectTo }) {
      const account = accounts.get(email);
      if (account && !account.verified) send(account, "signup", redirectTo);
    },

    async userFromAccessToken(accessToken) {
      const { account, record } = byToken(accessToken);
      if (record.kind === "signup") account.verified = true;
      return view(account);
    },

    async updatePassword(accessToken, password) {
      const { account } = byToken(accessToken, "recovery");
      account.passwordHash = await hashPassword(password);
      account.verified = true; // quem recebeu o e-mail provou que é dono dele
      tokens.delete(accessToken);
      return view(account);
    },
  };
}
