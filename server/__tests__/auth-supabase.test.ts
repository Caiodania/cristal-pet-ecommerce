// O adaptador do Supabase Auth, testado contra um servidor de mentira que imita as
// respostas do GoTrue (a API de login do Supabase). Prova que montamos os pedidos
// certos e que traduzimos cada resposta e erro. NÃO prova que o Supabase de
// verdade responde assim: isso é o `npm run check:supabase` com um projeto real.

import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { createSupabaseAuth } from "../accounts/supabase";
import { AuthError, type AuthProvider } from "../accounts/types";

type Seen = { method: string; path: string; query: URLSearchParams; headers: IncomingMessage["headers"]; body: Record<string, unknown> };

const verifiedUser = (email: string, name?: string) => ({
  id: "11111111-1111-4111-8111-111111111111",
  email,
  email_confirmed_at: "2026-10-01T10:00:00Z",
  identities: [{ provider: "email" }],
  user_metadata: name ? { name } : {},
});

let server: Server;
let auth: AuthProvider;
let seen: Seen[] = [];

before(async () => {
  server = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      const url = new URL(req.url ?? "/", "http://localhost");
      const body = chunks.length ? (JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>) : {};
      seen.push({ method: req.method ?? "", path: url.pathname, query: url.searchParams, headers: req.headers, body });
      const send = (status: number, payload: unknown) => {
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(payload));
      };
      const email = String(body.email ?? "");
      const bearer = String(req.headers.authorization ?? "").replace("Bearer ", "");

      if (url.pathname === "/auth/v1/signup") {
        if (email === "fraca@x.com") return send(422, { code: 422, error_code: "weak_password", msg: "Password should be at least 6 characters." });
        if (email === "invalido@x.com") return send(422, { code: 422, error_code: "email_address_invalid", msg: "Email address is invalid" });
        if (email === "limite@x.com") return send(429, { code: 429, error_code: "over_email_send_rate_limit", msg: "email rate limit exceeded" });
        if (email === "fechado@x.com") return send(422, { code: 422, error_code: "signup_disabled", msg: "Signups not allowed for this instance" });
        if (email === "jaexiste@x.com") return send(422, { code: 422, error_code: "user_already_exists", msg: "User already registered" });
        // confirmação ligada, e-mail que já tem conta: usuário "de mentira", sem identidades
        if (email === "existente@x.com") return send(200, { id: "22222222-2222-4222-8222-222222222222", email, identities: [] });
        // confirmação desligada: já vem a sessão
        if (email === "auto@x.com") {
          return send(200, { access_token: "tok", refresh_token: "r", user: verifiedUser(email, "Auto") });
        }
        // confirmação ligada: usuário criado, sem sessão e sem e-mail confirmado
        return send(200, {
          id: "33333333-3333-4333-8333-333333333333",
          email,
          confirmation_sent_at: "2026-10-21T10:00:00Z",
          identities: [{ provider: "email" }],
          user_metadata: body.data ?? {},
        });
      }

      if (url.pathname === "/auth/v1/token") {
        if (email === "ok@x.com" && body.password === "senha-certa-1") {
          return send(200, { access_token: "tok", refresh_token: "r", user: verifiedUser(email, "Ok Silva") });
        }
        if (email === "naoconf@x.com") return send(400, { code: 400, error_code: "email_not_confirmed", msg: "Email not confirmed" });
        if (email === "legado@x.com") return send(400, { error: "invalid_grant", error_description: "Invalid login credentials" });
        return send(400, { code: 400, error_code: "invalid_credentials", msg: "Invalid login credentials" });
      }

      if (url.pathname === "/auth/v1/recover") {
        if (email === "limite@x.com") return send(429, { code: 429, error_code: "over_email_send_rate_limit", msg: "rate limit" });
        // para e-mail que não existe o Supabase também responde 200
        return send(200, {});
      }

      if (url.pathname === "/auth/v1/resend") return send(200, { message_id: "m1" });

      if (url.pathname === "/auth/v1/user" && req.method === "GET") {
        if (bearer === "tok-ok") return send(200, verifiedUser("pessoa@x.com", "Pessoa"));
        if (bearer === "tok-google") {
          return send(200, { ...verifiedUser("g@x.com"), user_metadata: { full_name: "Google Pessoa" } });
        }
        if (bearer === "tok-pendente") return send(200, { id: "4", email: "p@x.com", identities: [{}] });
        return send(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT: unable to parse or verify signature" });
      }

      if (url.pathname === "/auth/v1/user" && req.method === "PUT") {
        if (bearer !== "tok-recuperacao") return send(401, { code: 401, error_code: "bad_jwt", msg: "invalid JWT" });
        if (body.password === "fraca") return send(422, { code: 422, error_code: "weak_password", msg: "Password should be..." });
        if (body.password === "mesma-senha-1") return send(422, { code: 422, error_code: "same_password", msg: "New password should be different" });
        return send(200, verifiedUser("pessoa@x.com", "Pessoa"));
      }

      send(404, { msg: "rota desconhecida" });
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  auth = createSupabaseAuth(`http://127.0.0.1:${port}`, "chave-anon-de-teste");
});

after(() => new Promise<void>((resolve) => server.close(() => resolve())));

const lastCall = () => seen[seen.length - 1];
const rejects = (promise: Promise<unknown>, code: AuthError["code"]) =>
  assert.rejects(promise, (error: unknown) => error instanceof AuthError && error.code === code);

describe("Supabase Auth: cadastro", () => {
  it("com confirmação por e-mail: não entra, envia o nome e o endereço de retorno", async () => {
    seen = [];
    const result = await auth.signUp({
      email: "novo@x.com",
      password: "senha-certa-1",
      name: "Novo Cliente",
      redirectTo: "https://loja.example/confirmar",
    });
    assert.deepEqual(result, { user: null, needsVerification: true });
    const call = lastCall();
    assert.equal(call.method, "POST");
    assert.equal(call.path, "/auth/v1/signup");
    assert.equal(call.headers.apikey, "chave-anon-de-teste");
    assert.equal(call.query.get("redirect_to"), "https://loja.example/confirmar");
    assert.deepEqual(call.body, { email: "novo@x.com", password: "senha-certa-1", data: { name: "Novo Cliente" } });
  });

  it("sem confirmação: já devolve o usuário", async () => {
    const result = await auth.signUp({ email: "auto@x.com", password: "senha-certa-1", name: "Auto", redirectTo: "x" });
    assert.equal(result.needsVerification, false);
    assert.equal(result.user?.email, "auto@x.com");
    assert.equal(result.user?.emailVerified, true);
  });

  it("e-mail que já tem conta (com confirmação ligada): responde como se fosse novo", async () => {
    const result = await auth.signUp({ email: "existente@x.com", password: "senha-certa-1", redirectTo: "x" });
    assert.deepEqual(result, { user: null, needsVerification: true });
  });

  it("traduz os erros do Supabase", async () => {
    const base = { password: "senha-certa-1", redirectTo: "x" };
    await rejects(auth.signUp({ ...base, email: "fraca@x.com" }), "weak_password");
    await rejects(auth.signUp({ ...base, email: "invalido@x.com" }), "invalid_email");
    await rejects(auth.signUp({ ...base, email: "limite@x.com" }), "rate_limited");
    await rejects(auth.signUp({ ...base, email: "fechado@x.com" }), "signup_disabled");
    await rejects(auth.signUp({ ...base, email: "jaexiste@x.com" }), "email_taken");
  });
});

describe("Supabase Auth: entrar", () => {
  it("devolve quem é a pessoa (e-mail em minúsculas, nome do cadastro)", async () => {
    seen = [];
    const user = await auth.signIn({ email: "ok@x.com", password: "senha-certa-1" });
    assert.deepEqual(user, { id: "11111111-1111-4111-8111-111111111111", email: "ok@x.com", name: "Ok Silva", emailVerified: true });
    assert.equal(lastCall().query.get("grant_type"), "password");
    assert.deepEqual(lastCall().body, { email: "ok@x.com", password: "senha-certa-1" });
  });

  it("senha errada, e-mail não confirmado e o formato antigo de erro", async () => {
    await rejects(auth.signIn({ email: "ok@x.com", password: "errada" }), "invalid_credentials");
    await rejects(auth.signIn({ email: "naoconf@x.com", password: "senha-certa-1" }), "email_not_verified");
    await rejects(auth.signIn({ email: "legado@x.com", password: "senha-certa-1" }), "invalid_credentials");
  });

  it("sem resposta do serviço: erro do provedor, não uma exceção solta", async () => {
    const dead = createSupabaseAuth("http://127.0.0.1:1", "x");
    await rejects(dead.signIn({ email: "ok@x.com", password: "senha-certa-1" }), "provider_error");
  });
});

describe("Supabase Auth: links de e-mail", () => {
  it("troca o token do link (ou do Google) por quem a pessoa é", async () => {
    seen = [];
    const user = await auth.userFromAccessToken("tok-ok");
    assert.equal(user.email, "pessoa@x.com");
    assert.equal(lastCall().headers.authorization, "Bearer tok-ok");
    const google = await auth.userFromAccessToken("tok-google");
    assert.equal(google.name, "Google Pessoa");
  });

  it("token inválido ou de conta sem e-mail confirmado não entra", async () => {
    await rejects(auth.userFromAccessToken("tok-qualquer"), "invalid_token");
    await rejects(auth.userFromAccessToken("tok-pendente"), "email_not_verified");
  });

  it("redefine a senha com o token do e-mail de recuperação", async () => {
    seen = [];
    const user = await auth.updatePassword("tok-recuperacao", "senha-nova-boa-1");
    assert.equal(user.email, "pessoa@x.com");
    assert.equal(lastCall().method, "PUT");
    assert.deepEqual(lastCall().body, { password: "senha-nova-boa-1" });
    await rejects(auth.updatePassword("tok-recuperacao", "fraca"), "weak_password");
    await rejects(auth.updatePassword("tok-recuperacao", "mesma-senha-1"), "weak_password");
    await rejects(auth.updatePassword("outro-token", "senha-nova-boa-1"), "invalid_token");
  });

  it("recuperar e reenviar: pedem o envio e não revelam se o e-mail existe", async () => {
    seen = [];
    await auth.recover({ email: "ninguem@x.com", redirectTo: "https://loja.example/redefinir-senha" });
    assert.equal(lastCall().path, "/auth/v1/recover");
    assert.equal(lastCall().query.get("redirect_to"), "https://loja.example/redefinir-senha");
    await auth.resend({ email: "ninguem@x.com", redirectTo: "https://loja.example/confirmar" });
    assert.equal(lastCall().path, "/auth/v1/resend");
    assert.deepEqual(lastCall().body, { type: "signup", email: "ninguem@x.com" });
    // só o limite de envio é dito à pessoa
    await rejects(auth.recover({ email: "limite@x.com", redirectTo: "x" }), "rate_limited");
  });
});
