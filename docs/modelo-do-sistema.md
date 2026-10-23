# Modelo do sistema: loja de esculturas 3D do pet

**Status: implementado com IA simulada.** O projeto é uma **loja** (comercial), não um site institucional. O banho e tosa e tudo o que é institucional da Cristal Pet vivem no outro site. Aqui só há o necessário para vender esculturas de pets impressas em 3D pelo dono.

**Decisões do cliente:** a estátua é impressa na impressora 3D do próprio dono; **pagamento e fechamento pelo WhatsApp**; o visitante navega sem conta, mas **gerar a prévia exige conta** (cada conta tem 3 prévias grátis, para limitar o gasto com a IA); carrinho e "Meus pedidos" como no Nobre Pata; painel para o dono ver e tocar os pedidos; uma IA gera a imagem da escultura e outra IA (ou sistema) transforma essa imagem em arquivo pronto para a impressora.

## 1. Como a compra funciona

```
Vitrine ─► Criar (6 passos) ─► Carrinho ─► Enviar pedido ─► WhatsApp (pagamento, entrega)
              │                    │             │
   tamanho·tipo·cor·nome·foto·prévia             └─► Painel do dono: vê o pedido, gera o arquivo 3D,
                                                      baixa o STL, muda o status
```

1. **Vitrine** (`/`): hero com um CTA, exemplos, como funciona, tamanhos com preço, benefícios, FAQ.
2. **Criar** (`/personalizar`): tamanho → tipo → cor → nome → **foto** → **prévia**. Na ordem da loja de referência. A foto é reduzida e recodificada no navegador (remove o EXIF); a prévia é gerada no servidor pela IA de imagem. O cliente pode **gerar outra** (mesma foto, sem reenviar) dentro do limite diário.
3. **Carrinho** (`/carrinho`): esculturas, valor estimado e formulário (nome, WhatsApp opcional, cidade, observações, aceite da privacidade). "Enviar pedido" grava o pedido, devolve o **código `CP-XXXXXX`** e abre o WhatsApp com a nota do pedido pronta.
4. **Conta** (`/entrar`, `/criar-conta`, `/minha-conta`, `/esqueci-a-senha`, `/redefinir-senha`, `/confirmar`): botão "Faça login" no cabeçalho e, logado, o menu "Minha conta" com as prévias que sobram. Ao tentar gerar a prévia sem login, abre um diálogo de entrar/criar conta sem sair da página. Detalhes em [`backend.md`](backend.md#contas-e-login).
5. **Acompanhar** (`/pedido?c=…&t=…`) e **Meus pedidos** (`/meus-pedidos`): o link do WhatsApp (com token longo) abre sem login; "Meus pedidos" lista os pedidos **da conta**, em qualquer aparelho.
6. **Painel** (`/admin`): login com senha, lista com busca e filtros por status, detalhe do pedido, arquivo 3D, anotações, e `/admin/contas` (contas, prévias usadas, prévias extras).

Se o servidor estiver fora do ar na hora de enviar, o botão **continua funcionando** com a mensagem sem o link (plano B): o WhatsApp nunca depende do backend.

## 2. A cadeia de IA (dois encaixes)

| Etapa | Entrada → saída | Quando roda | Custo |
|---|---|---|---|
| **1. IA de imagem** | foto do pet → imagem da escultura | a cada prévia (o cliente repete à vontade, com cota) | baixo |
| **2. IA 3D / preparo de impressão** | imagem da escultura → **STL** pronto para a impressora | só **sob comando do dono** (botão no painel) ou, se configurado, ao receber/confirmar o pedido | alto |

Separar assim protege o dinheiro: o cliente brinca com a etapa barata; a cara roda uma vez por escultura **realmente pedida**.

Cada etapa é um **provedor** atrás de uma interface (`server/providers/types.ts`). Hoje os dois são `mock` (simulados). Para ligar uma IA de verdade, escreve-se um arquivo adaptador e muda-se uma variável de ambiente: passo a passo em [`backend.md`](backend.md#como-ligar-uma-ia-de-verdade). O encaixe 2 pode ser **uma** API (imagem → 3D com exportação STL) ou **várias encadeadas dentro do adaptador** (imagem → malha, reparo/fechamento da malha, base plana e escala pela altura): o servidor só espera um STL no final.

**Proteção contra custo e abuso** (cada prévia é um custo): **cota por conta** (3 prévias, contada no banco de forma atômica), limite por rede (IP) por dia, teto diário de gasto com IA (`PREVIEW_DAILY_BUDGET_CENTS`), e-mail confirmado e Turnstile no cadastro, foto validada pelos bytes (JPG/PNG/WebP, até 5 MB) e limite de tentativas. Ao estourar a cota ou o teto, o site oferece o WhatsApp (o dono pode liberar prévias extras no painel).

## 3. Rotas

| Rota | Indexa? | O que é |
|---|---|---|
| `/` | sim | vitrine |
| `/contato`, 4 páginas legais | sim (legais só quando houver texto) | ajuda e políticas (`TODO-CLIENTE`) |
| `/personalizar` | não | configurador |
| `/carrinho`, `/meus-pedidos`, `/pedido` | não | compra e acompanhamento |
| `/entrar`, `/criar-conta`, `/minha-conta`, `/esqueci-a-senha`, `/redefinir-senha`, `/confirmar` | não | conta do cliente (as duas últimas recebem o link do e-mail) |
| `/admin`, `/admin/pedido?id=…`, `/admin/contas` | não | painel do dono |
| `/styleguide` | não | página de trabalho (**remover antes do lançamento**) |
| `/api/*` | n/a | uma Netlify Function (server/router.ts) |

Páginas de pedido usam **query string** e leem por fetch: no export estático não dá para gerar uma página por pedido.

## 4. Dados

Seis tabelas (`supabase/migrations/0001_init.sql` e `0002_contas.sql`, validadas num Postgres de verdade com `npm run test:sql`): **`profiles`** (a conta: e-mail, nome, prévias extras; criada por gatilho para cada usuário do Supabase Auth), **`customer_sessions`** (só o hash do token do cookie), **`previews`** (foto, imagem, arquivo 3D, custos, estados das duas etapas), **`orders`**, **`order_items`** (uma prévia vale em um pedido só: `unique`) e **`order_events`** (linha do tempo). Prévias e pedidos têm `user_id`. A prévia é reservada por uma função SQL (`reserve_preview`) que trava a conta e confere a cota; o pedido é criado por outra (`create_order`), numa transação só. **RLS ligado e sem políticas**: o navegador nunca fala com o banco; só o servidor, com a chave de serviço. Fotos, imagens e STL ficam num **bucket privado** e só saem por links assinados e temporários.

O **catálogo** (tamanhos, tipos, cores, preços) fica em código versionado (`content/estatua.ts`), importado pelo site e pelo servidor. O preço é **sempre recalculado no servidor**; o valor que o navegador mande é ignorado. Enquanto algum preço for `null` ("a definir"), o total aparece como "A combinar".

**Estados.** Prévia: `queued → generating → ready | failed | rejected`. Arquivo 3D: `none → processing → ready | failed`. Pedido (só o dono muda): `new → confirmed → in_production → ready → delivered`, com `canceled` (reabrível) em qualquer ponto antes de entregue.

## 5. API

Públicas: `GET /api/config`, `GET /api/orders/:code?t=token`. Da conta (cookie `cp_user`; sem login: 401 `login_required`): `POST /api/auth/signup|login|logout|forgot|resend|confirm|reset`, `GET /api/auth/me`, `GET /api/me/orders`, `POST /api/previews`, `PUT /api/previews/:id/photo`, `POST /api/previews/:id/start`, `GET /api/previews/:id`, `POST /api/previews/:id/regenerate`, `POST /api/orders`. Do painel (cookie de sessão): `POST /api/admin/login|logout`, `GET /api/admin/me|stats|orders|orders/:id|users`, `PATCH /api/admin/orders/:id|users/:id`, `POST|GET /api/admin/orders/:id/items/:itemId/model`.

As etapas de IA são **jobs assíncronos** consultados por polling: o site pergunta ao servidor a cada 2 s e o servidor pergunta ao provedor. Sem fila nem webhook (dá para acrescentar depois sem mudar o site).

## 6. Segurança, LGPD e acessibilidade

- Nenhuma chave no navegador. Painel: senha em variável de ambiente, cookie assinado `HttpOnly` + `SameSite=Strict` + `Secure`, checagem de origem (CSRF), tentativas limitadas.
- Conta do cliente: senha no Supabase Auth, sessão em cookie `HttpOnly` + `SameSite=Strict` (token só como hash no banco), e-mail confirmado, respostas que não revelam quem tem conta, cota atômica no banco. Detalhes em [`backend.md`](backend.md#contas-e-login).
- Pedido do cliente só abre com o **token** do link (comparação em tempo constante; "não existe" e "token errado" dão a mesma resposta).
- Cabeçalhos de segurança e CSP em `public/_headers` (testados no servidor local).
- LGPD: aceite registrado (`consent_at`), foto reduzida e sem EXIF, só nome/cidade/WhatsApp (os dois últimos opcionais). Política de privacidade e retenção das fotos: `TODO-CLIENTE`.
- Acessibilidade verificada em cada estado da loja e do painel (contraste AA, nomes acessíveis, teclado, alvos de toque).

## 7. Roadmap

| Fase | O que | Estado |
|---|---|---|
| **A. Estrutura da loja + backend com IA simulada** | tudo acima, com testes | **feito** |
| **B. Colocar no ar com dados reais** | projeto Supabase, migration, variáveis, deploy na Netlify, `npm run check:supabase` | falta (precisa das suas contas) |
| **C. IA de imagem de verdade** | adaptador + afinar o prompt com fotos reais | falta (precisa de chave) |
| **D. IA 3D de verdade** | adaptador imagem → STL imprimível; testar imprimindo 2 peças | falta (chave + impressora) |
| **E. Conteúdo e lançamento** | preços, tamanhos, cores, fotos de esculturas, textos legais, SEO, Lighthouse | falta (`docs/pendencias.md`) |
| **F. Evoluções** | catálogo editável no painel, métricas de funil, login de equipe (Supabase Auth) | futuro |
