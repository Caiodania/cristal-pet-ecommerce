# Guia: ligar o banco (Supabase) ao site da Netlify e rodar os testes

Ponto de partida: o site já está publicado na Netlify (`cristal-pet-ecommerce.netlify.app`) com o código que tem a loja e o login. Falta o **banco**. O banco é o **Supabase** (não é o "Dados e armazenamento" da Netlify, e o login também não é o "Identidade" da Netlify: não use esses dois).

Enquanto as variáveis não existirem, o site abre normalmente, mas tudo o que usa a API (login, prévia, pedido) responde erro. Isso é esperado: em produção o servidor se recusa a subir com dados em memória.

Tempo: uns 30 a 40 minutos.

---

## Passo 1. Criar o projeto no Supabase

1. Entre em **supabase.com** (pode ser com o GitHub) e clique em **New project**.
2. Nome: `cristal-pet`. **Database password**: clique em *Generate* e guarde numa senha segura (você quase não vai usar, mas não dá para ver de novo).
3. **Region**: *South America (São Paulo)*. Plano: *Free*.
4. Espere uns 2 minutos até o projeto ficar pronto.

## Passo 2. Criar as tabelas (as duas migrations, **nesta ordem**)

1. No menu da esquerda: **SQL Editor** → **New query**.
2. Abra no GitHub o arquivo `supabase/migrations/0001_init.sql` do seu repositório, clique em **Raw**, copie tudo e cole no editor. Clique **Run**. Deve aparecer *Success. No rows returned*.
3. Nova query, agora com o conteúdo de `supabase/migrations/0002_contas.sql`. **Run**.
4. Confira: **Table Editor** deve listar `previews`, `orders`, `order_items`, `order_events`, `profiles` e `customer_sessions`; **Storage** deve ter o bucket `cristal-pet` (privado).

Se der erro dizendo que algo "already exists", você rodou o mesmo arquivo duas vezes: ignore. Os avisos de "RLS enabled, no policy" são esperados: é de propósito (só o servidor acessa as tabelas).

## Passo 3. Pegar as 3 informações do projeto

**Project Settings** (engrenagem) → **API Keys** (em alguns projetos aparece só **API**):

| O que copiar | Nome nas variáveis |
|---|---|
| **Project URL** (`https://xxxx.supabase.co`) | `SUPABASE_URL` |
| chave **anon** (ou *Publishable key*) | `SUPABASE_ANON_KEY` |
| chave **service_role** (ou *Secret key*; clique em *Reveal*) | `SUPABASE_SERVICE_KEY` |

A `service_role` é um **segredo**: dá acesso total ao banco. Nunca cole em chat, GitHub ou no navegador. Só vai para a Netlify e para o seu `.env.local`.

**Chaves novas (a tela padrão hoje).** Na aba *Publishable and secret API keys* aparecem `sb_publishable_...` (vale como `SUPABASE_ANON_KEY`) e `sb_secret_...` (vale como `SUPABASE_SERVICE_KEY`; clique no olho para revelar e depois em copiar). O **Project URL** não está nessa tela: é `https://` + o código do projeto (o trecho depois de `/project/` no endereço do navegador) + `.supabase.co`; também aparece em *Project Settings → Data API* e no botão verde **Connect**. As chaves antigas (aba *Legacy anon, service_role API keys*) também servem: se o `npm run check:supabase` reclamar de chave inválida com as novas, troque pelas dessa aba.

## Passo 4. Configurar o login (Authentication)

1. **Authentication → Sign In / Providers → Email**: ligado, com **Confirm email** ligado.
2. **Authentication → URL Configuration**:
   - **Site URL**: `https://cristal-pet-ecommerce.netlify.app`
   - **Redirect URLs** (Add URL): `https://cristal-pet-ecommerce.netlify.app/**` e `http://localhost:8888/**`
3. **E-mails na fase de teste.** O envio padrão do Supabase só entrega para e-mails **da sua equipe no Supabase** e tem limite baixo por hora. Por isso, nos testes:
   - crie a conta no site com o **mesmo e-mail da sua conta do Supabase**, ou
   - crie o usuário na mão: **Authentication → Users → Add user → Create new user**, e-mail e senha, marcando **Auto Confirm User**; depois entre no site com ele (não precisa de e-mail).
4. **Antes de abrir ao público** é preciso configurar um **SMTP próprio** (Authentication → SMTP Settings; serviços como Resend, Brevo ou Amazon SES; o Resend e o SES pedem um domínio seu verificado). Sem isso, clientes de fora não recebem o e-mail de confirmação.

## Passo 5. Variáveis na Netlify

No projeto da Netlify (a tela do seu print): **Variáveis ambientais** → **Adicionar variável** (*Add a variable → Add a single variable*). Escopo: todos (ou só *Production*). Para as marcadas com 🔒, ligue **Contains secret values**.

| Chave | Valor |
|---|---|
| `SUPABASE_URL` | o Project URL |
| `SUPABASE_ANON_KEY` | a chave anon |
| `SUPABASE_SERVICE_KEY` 🔒 | a chave service_role |
| `SITE_URL` | `https://cristal-pet-ecommerce.netlify.app` (sem barra no fim) |
| `ADMIN_PASSWORD` 🔒 | uma senha forte, para entrar em `/admin` |
| `ADMIN_SESSION_SECRET` 🔒 | um texto aleatório longo (veja abaixo) |
| `IP_HASH_SALT` 🔒 | outro texto aleatório (opcional, mas recomendado) |
| `PREVIEW_DAILY_BUDGET_CENTS` | `500` (opcional: teto de gasto por dia; com a IA simulada nada é cobrado) |

Para gerar um texto aleatório, no terminal do seu computador:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Não** crie `IMAGE_PROVIDER`/`MODEL_PROVIDER`: sem elas a IA continua simulada e o site mostra a faixa "Modo demonstração" (o que é o certo por enquanto).

Depois de salvar, **as variáveis só valem num deploy novo**: **Implanta** (Deploys) → **Trigger deploy** → **Clear cache and deploy site**.

## Passo 6. Conferir o site publicado

1. Abra `https://cristal-pet-ecommerce.netlify.app/api/health`. Deve mostrar `{"ok":true}`.
2. Abra `.../api/config`. Deve mostrar um JSON com `"mode":"demo"` e `"previewsPerAccount":3`. Se aparecer erro, veja **Logs → Functions** na Netlify: a mensagem diz qual variável falta.
3. Teste de usuário, pela ordem:
   1. Crie uma conta (e-mail da sua conta Supabase), confirme no e-mail e veja o avatar no cabeçalho.
   2. Crie uma escultura, gere a prévia (será a imagem de demonstração), adicione ao carrinho e envie o pedido.
   3. Veja o pedido em **Meus pedidos**.
   4. Entre em `/admin` com a `ADMIN_PASSWORD`: o pedido deve estar na lista; teste **Gerar arquivo 3D** e **/admin/contas** (liberar prévias extras).
4. No Supabase confira: **Authentication → Users** (sua conta), **Table Editor** (`profiles`, `previews`, `orders` com linhas) e **Storage → cristal-pet** (foto e imagem da prévia).

## Passo 7. Rodar os testes automáticos contra o seu banco

Este é o teste que prova que o código funciona com o **Supabase de verdade** (cria uma conta de teste, entra, gera prévia, faz a cota com 8 pedidos ao mesmo tempo, cria pedido, usa o painel, gera e baixa o STL, e **apaga tudo** no fim). Não mexe no site da Netlify e não manda e-mail.

1. Na pasta do projeto, crie o arquivo `.env.local` (ele já é ignorado pelo Git; **nunca** o envie ao GitHub):

   ```
   SUPABASE_URL=https://xxxx.supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_KEY=...
   ```

2. Rode:

   ```bash
   npm run check:supabase
   ```

3. Resultado esperado: uma lista de `OK ...` e, no fim, `Tudo certo: o Supabase está pronto para a loja.`

Se algo marcar `FALHA`, a mensagem diz o passo. Causas mais comuns:

| Passo que falhou | Causa provável |
|---|---|
| "auth: cria a conta de teste" | chave `service_role` errada (ou colou a anon no lugar) |
| "o gatilho do Auth criou o perfil" | a migration `0002` não foi rodada (ou deu erro) |
| "reserva a prévia" / "reserve_preview" | idem: falta a `0002` |
| "storage: grava a foto no bucket" | falta o bucket `cristal-pet` (a `0001` cria; confira em Storage) |
| "login: e-mail e senha certos entram" | `SUPABASE_ANON_KEY` errada |
| "cota: 8 pedidos ao mesmo tempo" | me mande a saída completa: é o ponto mais importante |

Os outros testes não precisam de banco e já passam: `npm test` (124) e `npm run test:sql` (valida as migrations num Postgres local).

> Se precisar de ajuda, cole aqui só a **saída** do comando. Nunca cole as chaves.

## Se algo der errado

- **`/api/...` dá erro 500:** falta variável. Veja o log da função (Netlify → **Logs → Functions**). Mensagens comuns: *"Em produção os dados não podem ficar em memória"* (faltam `SUPABASE_URL`/`SUPABASE_SERVICE_KEY`), *"o login não pode ser o simulado"* (falta `SUPABASE_ANON_KEY`), *"Configure ADMIN_SESSION_SECRET em produção"*.
- **Alterei uma variável e nada mudou:** faça um deploy novo (Passo 5).
- **O e-mail de confirmação não chega:** é o envio padrão do Supabase (Passo 4, item 3). Use o e-mail da sua conta Supabase ou crie o usuário na mão.
- **O link do e-mail abre uma página de erro ou volta para `localhost`:** confira *Site URL* e *Redirect URLs* (Passo 4, item 2) e a variável `SITE_URL`.
- **O deploy falhou com `SecurityFatalError` no log do build:** é o `next build` parando na primeira tentativa por um aviso de segurança da versão do Next; ele passa na segunda. Em **Implanta**, use *Retry deploy*. (A atualização do Next é um assunto à parte.)

## O que vem depois

1. SMTP próprio e domínio da loja (Passo 4, item 4).
2. Cloudflare Turnstile no cadastro (`TURNSTILE_SECRET` e `TURNSTILE_SITE_KEY`).
3. Ligar a IA real (Gemini para a prévia, Meshy para o STL): [`backend.md`](backend.md#como-ligar-uma-ia-de-verdade).
4. Textos legais com revisão jurídica e a lista de [`pendencias.md`](pendencias.md).
