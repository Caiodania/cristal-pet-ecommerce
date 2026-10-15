# Backend: guia de uso, publicação e plugues de IA

O site é **estático** (pasta `out/`) e toda a parte dinâmica é **uma Netlify Function** que atende `/api/*` (`netlify/functions/api.ts` → `server/router.ts`), com **Supabase** (Postgres + Storage privado) como banco e **dois provedores de IA** plugáveis.

```
Navegador (site estático)
   │  fetch /api/*
   ▼
Netlify Function ──► Supabase: Postgres (pedidos, prévias) + Storage privado (fotos, imagens, STL)
   ├──► IA de imagem   (foto do pet → imagem da escultura)        server/providers/
   └──► IA 3D          (imagem → STL pronto para a impressora)    server/providers/
```

## Rodar no seu computador

```bash
npm install
npm run build                       # gera o site estático em out/
ADMIN_PASSWORD=uma-senha npm run dev:full
# abre http://localhost:8888  (loja)  e  http://localhost:8888/admin  (painel)
```

Sem configurar mais nada, sobe com **dados em memória** (somem ao reiniciar) e **IA simulada** (`mock`): o site mostra a faixa "Modo demonstração". Dá para percorrer a loja inteira: enviar foto, ver a prévia, pedir, entrar no painel, gerar e baixar o STL de teste.

Para trabalhar no visual com recarga instantânea, rode `npm run dev` (porta 3000) e o `dev:full` (porta 8888) juntos, com `NEXT_PUBLIC_API_URL=http://localhost:8888` no `.env.local` do site e `ALLOWED_ORIGINS=http://localhost:3000` no servidor.

| Comando | O que faz |
|---|---|
| `npm test` | testes do servidor (64): fluxo da API, segurança, cotas, falhas, estados, preço |
| `npm run test:e2e` | teste de ponta a ponta em Chrome real, desktop e celular (veja o cabeçalho de `tests/e2e/loja.mjs`) |
| `npm run check:supabase` | roda o fluxo contra o **seu** projeto Supabase e apaga o que criou |
| `npm run typecheck`, `npm run lint` | verificações de código |

## Variáveis de ambiente

A lista completa, com comentários, está em [`.env.example`](../.env.example). As que importam:

| Variável | Para que serve |
|---|---|
| `ADMIN_PASSWORD` | senha do painel. Sem ela, o painel fica desligado |
| `ADMIN_SESSION_SECRET` | assina o cookie do painel e os links temporários. **Obrigatória em produção** |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | banco e arquivos. Em produção os dados **não podem** ficar em memória (o servidor recusa subir) |
| `IMAGE_PROVIDER`, `MODEL_PROVIDER` | qual IA usar (`mock` por padrão) |
| `MODEL_AUTO` | `never` (só pelo painel), `order` (ao receber o pedido) ou `confirmed` (ao confirmar) |
| `PREVIEWS_PER_DAY`, `PREVIEWS_PER_DAY_PER_IP`, `PREVIEW_DAILY_BUDGET_CENTS` | cotas e **teto de gasto com IA por dia**. Defina o teto antes de ligar uma IA paga |
| `TURNSTILE_SECRET`, `TURNSTILE_SITE_KEY` | captcha gratuito da Cloudflare (opcional) |

## Ligar o Supabase

1. Crie um projeto em supabase.com (região mais próxima: São Paulo).
2. **SQL Editor** → cole o conteúdo de [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) → Run. Isso cria as tabelas, as funções, liga o RLS (sem políticas) e cria o bucket privado `cristal-pet`.
3. **Project Settings > API**: copie a URL (`SUPABASE_URL`) e a chave **service_role** (`SUPABASE_SERVICE_KEY`). A service_role é um segredo: só no servidor, nunca em `NEXT_PUBLIC_`.
4. Rode a verificação:
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... npm run check:supabase
   ```
   Ela percorre o fluxo inteiro (foto, prévia, pedido, painel, STL) contra o seu banco e apaga os dados de teste. **O código do Supabase foi escrito conforme a migration (que foi validada num Postgres de verdade), mas só este comando prova que ele funciona com o projeto real.** Se algo falhar, a mensagem diz o passo.

## Publicar na Netlify

1. Suba o código para um repositório (GitHub) e conecte na Netlify. O `netlify.toml` já define o build (`npm run build`), a pasta publicada (`out`) e a função.
2. **Site configuration > Environment variables**: cadastre `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (e, depois, as chaves de IA).
3. Faça o deploy. Entre em `/admin` e confira o login. A faixa "Modo demonstração" some sozinha quando as duas IAs forem reais.
4. Os cabeçalhos de segurança vêm de `public/_headers`.

Pendente nesta etapa (não depende de código): domínio, `NEXT_PUBLIC_SITE_URL`, textos legais, preços (veja [`pendencias.md`](pendencias.md)).

## Como ligar uma IA de verdade

Cada IA é um **adaptador**: um arquivo em `server/providers/` que implementa uma interface de [`types.ts`](../server/providers/types.ts). O resto do sistema não conhece fornecedor nenhum.

1. **Escolha o fornecedor** e pegue a chave de API. Os preços e as APIs mudam: confirme na documentação do fornecedor antes de decidir. Para a **etapa 1** (foto → imagem da escultura) servem modelos de edição de imagem com entrada de foto; para a **etapa 2** (imagem → 3D) há APIs de imagem→3D que exportam malha (GLB/STL). A malha de IA costuma precisar de reparo (fechada, base plana, escala): isso fica **dentro do adaptador** (uma API só, ou várias encadeadas).
2. **Crie o adaptador.** Modelo (os endereços e campos são fictícios; copie a forma, não os nomes):

   ```ts
   // server/providers/meu-fornecedor-imagem.ts
   import type { ImageProvider } from "./types";

   export function createMeuFornecedorImagem(apiKey: string): ImageProvider {
     return {
       name: "meu-fornecedor",
       mode: "live",

       // dispara o trabalho e devolve um jobId
       async submit({ photo, prompt, options }) {
         const res = await fetch("https://api.fornecedor.example/v1/jobs", {
           method: "POST",
           headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
           body: JSON.stringify({ image_url: photo.url, prompt }),
         });
         if (!res.ok) throw new Error(`fornecedor respondeu ${res.status}`);
         const job = await res.json();
         return { jobId: job.id, costCents: 4 /* custo real, para o teto de gasto */ };
       },

       // consulta o andamento
       async poll(jobId) {
         const res = await fetch(`https://api.fornecedor.example/v1/jobs/${jobId}`, {
           headers: { Authorization: `Bearer ${apiKey}` },
         });
         const job = await res.json();
         if (job.status === "running") return { status: "processing" };
         if (job.status === "failed") {
           // "rejected" = a FOTO não serve (sem pet, vários pets); qualquer outro código = tentar de novo
           return { status: "failed", code: job.reason === "no_pet" ? "rejected" : "provider_error", message: "…" };
         }
         return { status: "succeeded", image: { url: job.result_url, contentType: "image/png" } };
       },
     };
   }
   ```

3. **Registre** em [`server/providers/index.ts`](../server/providers/index.ts) (`imageProviders["meu-fornecedor"] = (config) => createMeuFornecedorImagem(process.env.MEU_FORNECEDOR_API_KEY!)`).
4. **Configure** na Netlify: `IMAGE_PROVIDER=meu-fornecedor` e a chave. O mesmo vale para `MODEL_PROVIDER` e a etapa 2 (o adaptador devolve um `stl`, e opcionalmente um `glb`).
5. **Defina o teto de gasto** (`PREVIEW_DAILY_BUDGET_CENTS`) e informe o `costCents` real em `submit`/`poll`: é o que alimenta o teto.
6. **Teste com 10 fotos reais** (porte, pelo e qualidade variados), conferindo: a imagem se parece com o pet? O prompt precisa de ajuste? Quanto custa e quanto demora de verdade? Para a etapa 2, **imprima pelo menos 2 peças**: malha furada, partes finas (orelha, cauda) e lado de trás inventado só aparecem na impressora.
7. Quando as duas IAs forem reais, o aviso "Modo demonstração" some sozinho.

**Afinando o prompt.** O texto enviado à IA de imagem está em [`server/providers/prompts.ts`](../server/providers/prompts.ts): é o lugar de ajustar o resultado (estilo, ângulo, fundo). Ele recebe o tipo e a cor escolhidos pelo cliente.

**Falhas.** Lance um erro em `submit` e o cliente vê "tente de novo". Devolva `failed` com `code: "rejected"` em `poll` quando a foto não serve: o site pede outra foto e não deixa repetir a mesma. Se o provedor demorar mais que `GENERATION_TIMEOUT_MS`, a prévia é encerrada como falha.

## O painel do dono

`/admin`, com a senha de `ADMIN_PASSWORD`. Lista os pedidos (contagem por status, busca por código/nome/cidade/telefone), abre o detalhe (foto original e prévia aprovada lado a lado, dados do cliente, WhatsApp do cliente), muda o status com um recado opcional que o cliente vê, guarda anotações internas e **gera/baixa o arquivo 3D** de cada escultura. A lista de pedidos atualiza sozinha a cada 30 s.

Os status são `Novo → Confirmado → Em produção → Pronto → Entregue` (ou `Cancelado`, que dá para reabrir). Por design o dono confirma o pedido depois de combinar e receber no WhatsApp.

## Segurança: o que está protegido e os limites conhecidos

- O navegador nunca recebe chave nenhuma nem fala com o banco; fotos e arquivos só saem por links temporários.
- O **limite de tentativas** (login, criação de prévias) fica em memória de cada instância da função: serve contra abuso simples, mas não é global. A cota **por dia** (visitante, rede e gasto) fica no banco e é global.
- O painel usa **uma senha única**. Com mais de uma pessoa, troque por Supabase Auth: só `server/auth.ts` muda.
- A política de conteúdo (`public/_headers`) usa `'unsafe-inline'` em scripts porque o export estático do Next grava scripts na página.
- Cada prévia guarda `expires_at` (30 dias), mas **nada ainda usa esse campo nem apaga os arquivos**. Antes do lançamento, decidir a retenção das fotos e agendar a limpeza (`TODO-CLIENTE`).
- A lista de pedidos busca a miniatura de cada linha com uma consulta (N consultas por página): suficiente para centenas de pedidos, otimizar se crescer.
