# Backend: guia de uso, publicação e plugues de IA

O site é **estático** (pasta `out/`) e toda a parte dinâmica é **uma Netlify Function** que   atende `/api/*` (`netlify/functions/api.ts` → `server/router.ts`), com **Supabase** (Postgres + Storage privado) como banco e **dois provedores de IA** plugáveis.

```
Navegador (site estático)
   │  fetch /api/*  (cookie HttpOnly da sessão)
   ▼
Netlify Function ──► Supabase: Postgres (contas, pedidos, prévias) + Storage privado (fotos, imagens, STL)
   ├──► Supabase Auth  (cadastro, senha, confirmação e recuperação por e-mail, Google)  server/accounts/
   ├──► IA de imagem   (foto do pet → imagem da escultura)        server/providers/
   └──► IA 3D          (imagem → STL pronto para a impressora)    server/providers/
```

## Rodar no seu computador

```bash
npm install
npm run build                       # gera o site estático em out/
ADMIN_EMAILS=voce@exemplo.com npm run dev:full
# abre http://localhost:8888 (loja). O painel só aparece na conta com o e-mail acima: crie
# essa conta pelo site ("Faça login" > "Criar conta"); o menu da conta ganha "Painel do dono".
```

Sem configurar mais nada, sobe com **dados em memória** (somem ao reiniciar) e **IA simulada** (`mock`): o site mostra a faixa "Modo demonstração". Dá para percorrer a loja inteira: enviar foto, ver a prévia, pedir (com endereço), entrar no painel com a conta do dono, gerar e baixar o STL de teste.

> **Cuidado com o `.env.local`.** Se ele tiver `SUPABASE_URL`, o servidor local passa a usar o Supabase **de verdade** (e avisa no terminal): contas, pedidos e arquivos de teste ficam no seu projeto. Para testar sem gravar nada, suba com os provedores em memória: `STORE=memory FILES=memory AUTH_PROVIDER=memory SUPABASE_URL= npm run dev:full` (no PowerShell, defina antes cada variável com `$env:STORE="memory"` e as demais, e deixe `$env:SUPABASE_URL=""`). O teste `npm run test:e2e` cria contas e pedidos: rode-o sempre assim.

Para trabalhar no visual com recarga instantânea, rode `npm run dev` (porta 3000) e o `dev:full` (porta 8888) juntos, com `NEXT_PUBLIC_API_URL=http://localhost:8888` no `.env.local` do site e `ALLOWED_ORIGINS=http://localhost:3000` no servidor.

| Comando | O que faz |
|---|---|
| `npm test` | testes do servidor (143): API, contas e sessões, painel do dono (invisível a quem não é dono), endereço de entrega e CEP, arquivo 3D, cota de prévias, segurança, falhas, estados, preço, prompts, adaptador do Supabase Auth |
| `npm run test:sql` | valida as migrations do Supabase num Postgres de verdade (PGlite, sem projeto nem internet): gatilho do Auth, cota, pedido com conta, cascatas, RLS |
| `npm run test:e2e` | teste de ponta a ponta em Chrome real, desktop e celular (veja o cabeçalho de `tests/e2e/loja.mjs`) |
| `npm run check:supabase` | roda o fluxo contra o **seu** projeto Supabase e apaga o que criou |
| `npm run typecheck`, `npm run lint` | verificações de código |

## Variáveis de ambiente

A lista completa, com comentários, está em [`.env.example`](../.env.example). As que importam:

| Variável | Para que serve |
|---|---|
| `ADMIN_EMAILS` | e-mail da conta do dono (vários, separados por vírgula). Só essa conta vê o painel; **não há senha do painel**. Sem a variável, o painel fica desligado |
| `ADMIN_SESSION_SECRET` | assina os links temporários dos arquivos. **Obrigatória em produção** |
| `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` | banco e arquivos. Em produção os dados **não podem** ficar em memória (o servidor recusa subir) |
| `SUPABASE_ANON_KEY` | chave pública do Supabase, usada **só pelo servidor** para falar com o Supabase Auth (cadastro e login). Em produção o login **não pode** ser o simulado |
| `SITE_URL` | endereço da loja: para onde os e-mails de confirmação e recuperação levam a pessoa. Na Netlify, se vazio, usa `URL` |
| `PREVIEWS_PER_ACCOUNT` | prévias que cada conta pode gerar (padrão 3; o dono libera mais a quem quiser). O padrão e os textos do site estão em `content/estatua.ts` |
| `AUTH_GOOGLE` | `1` mostra o botão "Continuar com Google" (exige o Google ligado no Supabase) |
| `IMAGE_PROVIDER`, `MODEL_PROVIDER` | qual IA usar (`mock` por padrão) |
| `MODEL_AUTO` | `never` (só pelo painel), `order` (ao receber o pedido) ou `confirmed` (ao confirmar) |
| `PREVIEWS_PER_DAY_PER_IP`, `PREVIEW_DAILY_BUDGET_CENTS` | limite por rede por dia e **teto de gasto com IA por dia**. Defina o teto antes de ligar uma IA paga |
| `TURNSTILE_SECRET`, `TURNSTILE_SITE_KEY` | captcha gratuito da Cloudflare, no cadastro e na recuperação de senha (recomendado em produção) |

## Ligar o Supabase

> Passo a passo ilustrado para quem já publicou na Netlify: [`guia-supabase-netlify.md`](guia-supabase-netlify.md).

1. Crie um projeto em supabase.com (região mais próxima: São Paulo).
2. **SQL Editor** → cole **na ordem** e rode (Run) cada arquivo:
   1. [`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql): tabelas de prévias e pedidos, funções, RLS (sem políticas) e o bucket privado `cristal-pet`;
   2. [`supabase/migrations/0002_contas.sql`](../supabase/migrations/0002_contas.sql): contas (`profiles`, criada sozinha para cada usuário novo do Auth por um gatilho), sessões, a função `reserve_preview` (cota de prévias) e a ligação de prévias e pedidos à conta;
   3. [`supabase/migrations/0003_envio.sql`](../supabase/migrations/0003_envio.sql): forma de receber (`entrega` ou `retirada`) e endereço de entrega no pedido (`delivery_method`, `shipping_address`), e a função `create_order` atualizada para gravá-los. **Quem já rodou a 0001 e a 0002 só precisa rodar esta.**
3. **Project Settings > API**: copie a URL (`SUPABASE_URL`), a chave **anon** (`SUPABASE_ANON_KEY`) e a chave **service_role** (`SUPABASE_SERVICE_KEY`). A service_role é um segredo: só no servidor, nunca em `NEXT_PUBLIC_`.
4. Configure o **login** (próxima seção, "Contas e login").
5. Rode a verificação:
   ```bash
   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... SUPABASE_ANON_KEY=... npm run check:supabase
   ```
   Ela cria uma conta de teste, entra, percorre o fluxo inteiro (prévia, cota, pedido, painel, STL) contra o seu banco, **prova a cota com 8 pedidos ao mesmo tempo (só os que cabem passam)** e apaga tudo o que criou. **O código do Supabase foi escrito conforme as migrations (validadas num Postgres de verdade com `npm run test:sql`) e a API do Supabase Auth (testada contra um servidor de mentira), mas só este comando prova que funciona com o projeto real.** Se algo falhar, a mensagem diz o passo.

## Contas e login

**Regra do produto:** o visitante navega pelo site inteiro **sem conta**. Para **gerar a prévia** (e para enviar o pedido) é preciso ter conta; cada conta gera até **3 prévias grátis** (`PREVIEWS_PER_ACCOUNT`), o que limita o gasto com a IA de imagem. Sem login, "Gerar a prévia" abre um diálogo ("Faça login ou crie a sua conta para poder gerar a sua prévia") **sem sair da página**, então as escolhas e a foto não se perdem; ao entrar, a geração continua sozinha.

**Como funciona por dentro**

- **Quem é a pessoa** (e-mail, senha, e-mail de confirmação, recuperação de senha, Google) é o **Supabase Auth**; o adaptador está em `server/accounts/supabase.ts`. Em desenvolvimento há um provedor em memória (`AUTH_PROVIDER=memory`), sem e-mail de verdade: os links dos "e-mails" saem no log do servidor.
- **A sessão é nossa.** Depois de conferir quem é a pessoa, o servidor gera um token aleatório, guarda só o **hash** dele (`customer_sessions`) e o manda num cookie `cp_user` (`HttpOnly`, `SameSite=Strict`, `Secure` em https, 30 dias). Os tokens do Supabase nunca chegam ao navegador. Sair, trocar a senha ou apagar a conta derruba a sessão na hora.
- **A cota é do banco, não do navegador.** A função SQL `reserve_preview` trava a linha da conta, conta as prévias (prontas, em geração, expiradas e as criadas há menos de 1 h que ainda esperam a foto) e só cria a nova se couber: **dois pedidos ao mesmo tempo nunca passam do limite**. **Falha do provedor e foto recusada não gastam a cota.** Tentar de novo uma prévia que falhou volta a contá-la (e respeita o limite).
- Há ainda o limite **por rede por dia** (`PREVIEWS_PER_DAY_PER_IP`), que corta quem abre várias contas na mesma conexão, e o teto diário de gasto.
- **Prévias e pedidos têm dono.** Outra conta recebe 404 ao mexer na prévia de alguém. O pedido leva a conta; "Meus pedidos" lista os da conta em qualquer aparelho, e o link do WhatsApp (`/pedido?c=…&t=…`) continua abrindo sem login.
- **Painel do dono:** `/admin/contas` lista as contas (prévias usadas, pedidos) e **libera prévias extras** a uma conta (`PATCH /api/admin/users/:id`). O pedido no painel mostra o e-mail da conta.

**Rotas da API**

| Rota | O que faz |
|---|---|
| `POST /api/auth/signup` | cria a conta (201 já logado, ou 202 "confirme o e-mail") |
| `POST /api/auth/login`, `POST /api/auth/logout` | entrar e sair |
| `GET /api/auth/me` | quem está logado e a cota (sempre 200; `user: null` para visitante) |
| `POST /api/auth/forgot`, `POST /api/auth/reset` | pedir o link e definir a nova senha (resposta neutra: não revela se o e-mail tem conta) |
| `POST /api/auth/resend`, `POST /api/auth/confirm` | reenviar a confirmação; trocar o token do link do e-mail (ou do Google) por login |
| `GET /api/me/orders` | pedidos da conta |

**Configurar o Supabase Auth** (Dashboard do projeto)

1. **Authentication > Providers > Email**: ligado, com **Confirm email ligado** (é o que impede criar contas com e-mails falsos para ganhar prévias) e **Secure password change** ligado.
2. **Authentication > URL Configuration**: *Site URL* = o endereço da loja (ex.: `https://loja.cristalpet.com.br`); em *Redirect URLs* acrescente `https://SEU-DOMINIO/confirmar` e `https://SEU-DOMINIO/redefinir-senha` (e, para testar, a versão `http://localhost:8888/...`). Sem isso o Supabase recusa os links.
3. **Authentication > SMTP Settings**: configure um **SMTP próprio** (Resend, Brevo, Amazon SES…). O envio padrão do Supabase serve só para testar: tem limite de poucos e-mails por hora e entrega ruim (cai no spam). Sem SMTP próprio, o cadastro trava na hora em que mais gente chegar.
4. **Authentication > Email Templates**: traduza "Confirm signup" e "Reset password" para português e mantenha o botão/link (`{{ .ConfirmationURL }}`). Sugestão de assunto: "Confirme o seu e-mail na AUmor de Patas".
5. **Authentication > Rate Limits**: confira os limites de e-mail e de cadastro (o site também limita por rede).
6. **Senha**: o Supabase aceita 6+ caracteres; o site exige 8+ com letra e recusa as mais comuns. Se quiser o mesmo no Supabase, ajuste em Authentication > Sign In / Providers > Email > Minimum password length.
7. **Google (opcional)**: em Google Cloud Console crie um *OAuth client ID* (tipo Web), com a *Authorized redirect URI* que o Supabase mostra em Authentication > Providers > Google; cole *Client ID* e *Secret* ali e ligue. Depois defina `AUTH_GOOGLE=1` na Netlify: o botão "Continuar com Google" aparece. O retorno cai em `/confirmar`, o mesmo caminho do link de e-mail.
8. **Netlify**: cadastre `SUPABASE_ANON_KEY` e `SITE_URL` (além das variáveis do Supabase que já existiam). Sem `SUPABASE_ANON_KEY` o servidor, em produção, **recusa subir** (não deixa o login simulado ir ao ar).

**Antes de abrir ao público**

- [ ] `npm run check:supabase` passou contra o projeto real.
- [ ] SMTP próprio configurado e testado (crie uma conta de verdade e receba o e-mail).
- [ ] Turnstile ligado (`TURNSTILE_SECRET` e `TURNSTILE_SITE_KEY`) no cadastro e na recuperação.
- [ ] Política de privacidade e termos atualizados: agora há **conta, e-mail e senha** (a senha fica com o Supabase) e a foto fica ligada à conta.
- [ ] Decidido o prazo de guarda das fotos e das contas inativas, e como atender **pedido de exclusão de conta** (LGPD): hoje a exclusão é feita à mão (apagar o usuário em Authentication > Users leva o perfil e as sessões junto; as prévias e os pedidos ficam sem dono).

**Limites conhecidos**: o limite de tentativas de login/cadastro fica na memória de cada instância da função (serve contra abuso simples, não é global); o que é global é a cota por conta e por rede, que vive no banco. Não há ainda autoatendimento para excluir a conta, trocar e-mail ou trocar nome.

## Publicar na Netlify

1. Suba o código para um repositório (GitHub) e conecte na Netlify. O `netlify.toml` já define o build (`npm run build`), a pasta publicada (`out`) e a função.
2. **Site configuration > Environment variables**: cadastre `ADMIN_EMAILS` (o e-mail do dono), `ADMIN_SESSION_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `SITE_URL` (e, depois, as chaves de IA e do Turnstile).
3. Faça o deploy. Entre no site com a conta do dono: o menu da conta mostra **Painel do dono**. A faixa "Modo demonstração" some sozinha quando as duas IAs forem reais.
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
       async submit({ photo, prompt, styleReferences, options }) {
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

### Como a prévia sai no padrão da loja (e no que o cliente escolheu)

A IA de imagem recebe **a foto do cliente** e o que mandamos junto. Quatro alavancas, da mais forte à mais fraca (tudo em [`server/providers/prompts.ts`](../server/providers/prompts.ts)):

1. **Imagem de referência de estilo.** A escultura da Mel (`public/images/esculturas/mel.webp`) vai como **segunda imagem**, e o prompt diz "só o estilo, não copie o cão". É o que mais uniformiza acabamento, base, luz e enquadramento. Configurável em `STYLE_REFERENCE_FILES` (lista de caminhos; `none` desliga). Na Netlify o arquivo precisa estar em `included_files` ([`netlify.toml`](../netlify.toml), já configurado para a Mel).
2. **Bloco de estilo fixo.** Resina fosca de acabamento "porcelana", base octogonal baixa, cena de interior desfocada, luz natural, quadro 4:5.
3. **Uma frase por escolha do cliente.** Cada **pose** (`PROMPT_POSES`) e cada **cor** (`PROMPT_COLORS`) do catálogo tem a sua frase. Opção nova no catálogo = uma linha nova ali; um teste (`server/__tests__/prompts.test.ts`) falha se faltar, e sem a linha o sistema cai no nome da opção em vez de quebrar. Tamanho não entra: ele só muda a escala da peça impressa.
4. **O nome**, entre aspas, em relevo na frente da base. Ele é texto do usuário dentro de um prompt: `sanitizePetName` tira aspas, quebras de linha e símbolos, põe em maiúsculas e limita a 30 caracteres. Sem nome, o prompt manda a base lisa e sem texto.

`PROMPT_VERSION` identifica a versão do texto: mude-a a cada ajuste, para saber qual prompt gerou cada prévia.

**Ligando o Gemini.** No adaptador, a foto é a primeira parte da mensagem e `styleReferences` vêm depois, na mesma ordem em que o prompt as cita:

```ts
// server/providers/gemini-image.ts (esboço: confirme campos e modelo na documentação do Gemini)
async submit({ photo, prompt, styleReferences = [] }) {
  const parts = [
    { text: prompt },
    { inline_data: { mime_type: photo.contentType, data: Buffer.from(photo.bytes).toString("base64") } },
    ...styleReferences.map((r) => ({
      inline_data: { mime_type: r.contentType, data: Buffer.from(r.bytes).toString("base64") },
    })),
  ];
  // POST https://generativelanguage.googleapis.com/v1beta/models/<modelo>:generateContent
  //   cabeçalho x-goog-api-key; corpo { contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE"],
  //   imageConfig: { aspectRatio: "4:5" } } }; a imagem volta em candidates[0].content.parts[].inlineData
}
```

Dois cuidados que só aparecem com a API de verdade: (a) a geração costuma levar de 10 a 30 s, mais que o limite padrão de uma função síncrona da Netlify; rode a chamada numa **Background Function** (até 15 min) que grava o resultado no armazenamento de arquivos, e deixe o `poll` ler dali; (b) o modelo às vezes recusa a foto (segurança) ou devolve texto em vez de imagem: mapeie isso para `failed` com `code: "rejected"` (foto não serve) ou `provider_error` (tentar de novo).

**Afinando o prompt.** Gere com 10 fotos reais (porte e pelagem variados) em **todas as cores e poses** e olhe: o pet continua reconhecível? O nome saiu escrito certo? A cor obedeceu? Ajuste as frases e mude `PROMPT_VERSION`. Se uma cor sair errada de forma consistente, descreva-a melhor em `PROMPT_COLORS`.

**Falhas.** Lance um erro em `submit` e o cliente vê "tente de novo". Devolva `failed` com `code: "rejected"` em `poll` quando a foto não serve: o site pede outra foto e não deixa repetir a mesma. Se o provedor demorar mais que `GENERATION_TIMEOUT_MS`, a prévia é encerrada como falha.

## O painel do dono

**Quem entra.** Não existe senha nem tela de login do painel. O dono usa o login normal do site com a conta dele, e só a conta cujo e-mail está em `ADMIN_EMAILS` é reconhecida como dona. Ela vê "Painel do dono" no menu da conta (e em "Minha conta"); ninguém mais vê esse atalho. Para qualquer outra pessoa, visitante ou cliente, `/admin` mostra a mesma página "não encontrada" do site, e **toda** a API `/api/admin/*` (qualquer método e caminho) responde 404 igual a uma rota que não existe: nada revela que o painel existe. Se o e-mail sair de `ADMIN_EMAILS` (e o site for publicado de novo), o acesso acaba na hora.

**O que o dono faz.** `/admin` lista os pedidos (contagem por status, busca por código/nome/cidade/telefone, cidade e forma de entrega, quantos arquivos 3D estão prontos) e atualiza sozinha a cada 30 s. O detalhe do pedido tem:

- **Envio:** forma de receber (entrega ou retirada), destinatário, WhatsApp, **endereço completo** (rua, número, complemento, bairro, cidade/UF, CEP), e-mail da conta do cliente, observação do cliente, botões **Copiar dados de envio** (texto pronto para a etiqueta) e **Chamar no WhatsApp**.
- **Fotos:** a foto original do pet e a prévia aprovada, lado a lado, ampliáveis, cada uma com **Baixar** (o arquivo vem com nome bom, ex.: `CP-ABC123-Thor-foto.jpg`).
- **Arquivo 3D** de cada escultura (veja abaixo).
- Mudar o status com um recado opcional que o cliente vê, e anotações internas que só o dono vê.

Os status são `Novo → Confirmado → Em produção → Pronto → Entregue` (ou `Cancelado`, que dá para reabrir). Por design o dono confirma o pedido depois de combinar e receber no WhatsApp.

**Do pedido ao arquivo da impressora.** Em cada escultura, o botão **Gerar arquivo 3D** transforma a imagem que o cliente aprovou em um arquivo para imprimir. Como cada geração **custa dinheiro** no provedor, o painel pede confirmação antes (também em "Gerar de novo", que cobra outra vez e troca os arquivos), não gera para pedido cancelado, mostra o andamento (barra, quando o provedor informa) e o custo acumulado, e avisa se falhou ("Tentar de novo"). Pronto o arquivo, aparecem **Baixar STL** (vai para o fatiador e a impressora) e **Baixar GLB** (para girar e conferir o modelo), mais um lembrete do que conferir antes de imprimir (escala, malha fechada, base). Hoje o provedor é simulado (`mock`): o STL é de teste. A ligação com o **Meshy** está planejada em [`meshy.md`](meshy.md).

**Endereço no pedido.** O formulário do carrinho pede o nome de quem recebe, o **WhatsApp (obrigatório)** e como o cliente quer receber. Na **entrega** pede o endereço completo; ao digitar o CEP, o servidor consulta o ViaCEP (`GET /api/cep/:cep`, com limite por rede) e preenche rua, bairro, cidade e estado; se não achar, o cliente digita à mão. Na **retirada** não pede endereço. O endereço e o telefone só aparecem no painel: a página do pedido do cliente nunca os mostra.

## Segurança: o que está protegido e os limites conhecidos

- O navegador nunca recebe chave nenhuma nem fala com o banco; fotos e arquivos só saem por links temporários.
- O **limite de tentativas** (login, cadastro, recuperação de senha) fica em memória de cada instância da função: serve contra abuso simples, mas não é global. A cota **da conta** (3 prévias), a cota **por rede por dia** e o teto de gasto ficam no banco e são globais.
- **Contas:** senhas nunca passam pelo nosso banco (ficam no Supabase Auth); a sessão é um cookie `HttpOnly` cujo token só existe como hash no banco; a resposta de "e-mail ou senha incorretos", de "esqueci a senha" e de cadastro de e-mail repetido **não revela quem tem conta**; trocar a senha derruba as outras sessões.
- **Painel do dono:** não há senha própria; vale a conta do Supabase Auth cujo e-mail está em `ADMIN_EMAILS`, e o servidor confere isso em **toda** chamada a `/api/admin/*` (404 para os demais). Proteja essa conta: senha forte, e-mail do dono confirmado desde o início (crie o usuário pelo Dashboard do Supabase com *Auto Confirm* antes de divulgar o site, para ninguém se cadastrar antes com o e-mail do dono) e, quando possível, login com Google com verificação em duas etapas. Mais de um dono: liste os e-mails separados por vírgula.
- A política de conteúdo (`public/_headers`) usa `'unsafe-inline'` em scripts porque o export estático do Next grava scripts na página.
- Cada prévia guarda `expires_at` (30 dias), mas **nada ainda usa esse campo nem apaga os arquivos**. Antes do lançamento, decidir a retenção das fotos e agendar a limpeza (`TODO-CLIENTE`).
- A lista de pedidos busca a miniatura de cada linha com uma consulta (N consultas por página): suficiente para centenas de pedidos, otimizar se crescer.
