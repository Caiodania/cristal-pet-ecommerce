// Servidor local: serve o site exportado (pasta out/) e a API (/api/*) juntos,
// como a Netlify faz. Substitui o `netlify dev` para testar a loja inteira sem
// instalar mais nada.
//
//   npm run build && npm run dev:full      → http://localhost:8888
//
// Variáveis: leia `.env.example`. Se existir `.env.local`, é carregado. Sem
// nenhuma configuração, sobe com dados em memória e provedores simulados.
//
// Para trabalhar no visual com recarga instantânea, rode `npm run dev` (porta
// 3000) e este servidor só como API, com ALLOWED_ORIGINS=http://localhost:3000 e
// NEXT_PUBLIC_API_URL=http://localhost:8888 (veja docs/backend.md).

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { Readable } from "node:stream";
import { handle } from "../server/router";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* sem .env.local: usa o ambiente do processo */
}

const root = resolve("out");
const port = Number(process.env.PORT ?? 8888);

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".map": "application/json",
};

// Aplica o arquivo _headers da Netlify (gerado em out/_headers): o que se testa
// aqui é o que vai ao ar, inclusive a política de segurança de conteúdo (CSP).
type HeaderRule = { pattern: RegExp; headers: Record<string, string> };

function loadHeaderRules(): HeaderRule[] {
  const file = join(root, "_headers");
  if (!existsSync(file)) return [];
  const rules: HeaderRule[] = [];
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (!raw.trim() || raw.trim().startsWith("#")) continue;
    if (!/^\s/.test(raw)) {
      // linha de caminho: "*" vira "qualquer coisa"
      const source = raw
        .trim()
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      rules.push({ pattern: new RegExp(`^${source}$`), headers: {} });
    } else {
      const index = raw.indexOf(":");
      if (index > 0 && rules.length) {
        rules[rules.length - 1].headers[raw.slice(0, index).trim()] = raw.slice(index + 1).trim();
      }
    }
  }
  return rules;
}

const headerRules = loadHeaderRules();
const headersFor = (pathname: string): Record<string, string> =>
  Object.assign({}, ...headerRules.filter((rule) => rule.pattern.test(pathname)).map((rule) => rule.headers));

function findFile(pathname: string): string | null {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const base = join(root, clean);
  if (!base.startsWith(root)) return null;
  const candidates = [base, `${base}.html`, join(base, "index.html")];
  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

async function toRequest(req: IncomingMessage): Promise<Request> {
  const url = `http://${req.headers.host ?? `localhost:${port}`}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) for (const v of value) headers.append(key, v);
    else if (value !== undefined) headers.set(key, value);
  }
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? (Readable.toWeb(req) as ReadableStream) : undefined,
    // @ts-expect-error: necessário para enviar corpo em streaming no Node
    duplex: "half",
  });
}

async function sendResponse(res: ServerResponse, response: Response) {
  const headers: Record<string, string | string[]> = {};
  response.headers.forEach((value, key) => {
    if (key !== "set-cookie") headers[key] = value;
  });
  const cookies = response.headers.getSetCookie();
  if (cookies.length) headers["set-cookie"] = cookies;
  res.writeHead(response.status, headers);
  if (!response.body) return res.end();
  Readable.fromWeb(response.body as never).pipe(res);
}

const server = createServer(async (req, res) => {
  try {
    const { pathname } = new URL(req.url ?? "/", "http://localhost");

    if (pathname.startsWith("/api/")) {
      return await sendResponse(res, await handle(await toRequest(req)));
    }

    const file = findFile(pathname);
    if (file) {
      res.writeHead(200, {
        "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-cache",
        ...headersFor(pathname),
      });
      return res.end(readFileSync(file));
    }

    const notFound = join(root, "404.html");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8", ...headersFor(pathname) });
    res.end(existsSync(notFound) ? readFileSync(notFound) : "Página não encontrada");
  } catch (error) {
    console.error("[dev-server]", error);
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Erro interno do servidor local.");
  }
});

if (!existsSync(root)) {
  console.warn(`Aviso: a pasta out/ não existe. Rode "npm run build" para servir o site (a API funciona assim mesmo).`);
}

server.listen(port, () => {
  console.log(`Loja local em http://localhost:${port}   (API em /api, painel em /admin)`);
  console.log(
    `Dados: ${process.env.STORE ?? (process.env.SUPABASE_URL ? "supabase" : "memória")} · ` +
      `IA de imagem: ${process.env.IMAGE_PROVIDER ?? "mock"} · IA 3D: ${process.env.MODEL_PROVIDER ?? "mock"}` +
      (process.env.ADMIN_PASSWORD ? "" : "  ·  ADMIN_PASSWORD não definida: o painel fica desligado"),
  );
});
