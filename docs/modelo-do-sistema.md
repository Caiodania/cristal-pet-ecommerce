# Modelo do sistema: loja de esculturas 3D do pet

**Status: revisado com as respostas do cliente.** A estátua é impressa em **impressora 3D pelo próprio dono da Cristal Pet**, e o **pagamento e o fechamento são feitos pelo WhatsApp**, direto com o cliente. Isto é o contrato que o configurador, o carrinho e as funções de servidor vão seguir. Complementa o [`mapa-equivalencia.md`](mapa-equivalencia.md) (estrutura das páginas) e usa o que foi observado em [`analise-nobre-pata.md`](analise-nobre-pata.md) (seção 11, configurador).

## 1. A ideia em uma linha

O cliente **faz a prévia no site, monta o carrinho e envia o pedido para o WhatsApp**; a negociação, o pagamento, o frete e a entrega são resolvidos na conversa. O site existe para entregar ao dono um pedido **completo e pronto para imprimir**: foto original, prévia aprovada, tamanho, cor e nome do pet.

```
Esculturas ──► Personalizar ──► Carrinho ──► Revisar e enviar ──► WhatsApp (acerto, pagamento, entrega)
                 foto→prévia      N pets        resumo + código         │
                 tamanho/pose/cor                                       └─► Atelier: o dono baixa os arquivos
```

Consequências diretas:

| Some | Fica | Entra |
|---|---|---|
| gateway de pagamento, webhooks, cálculo de frete, CPF, endereço, e-mail transacional | **carrinho**, configurador, resumo com preço, "Meus pedidos", barra de abas, prévia | **mensagem de WhatsApp** montada com o pedido; **Atelier**, área do dono para ver pedidos e baixar os arquivos de impressão |

## 2. Jornada do cliente (sem login)

**Personalizar** (`/personalizar`, rota própria). Foto primeiro: a prévia gera em segundo plano enquanto o cliente escolhe o resto.

| # | Passo | Observação |
|---|---|---|
| 1 | **Foto** | upload; dicas (um pet por foto, corpo inteiro, boa luz, fundo simples). A prévia começa a gerar ao enviar |
| 2 | Tamanho | preço na barra de resumo; limitado ao que a impressora do dono imprime (`TODO-CLIENTE`) |
| 3 | Tipo (pose) | `TODO-CLIENTE` |
| 4 | Cor | cor do material impresso; troca a cor da prévia na hora |
| 5 | Nome do pet | opcional (`TODO-CLIENTE`: vai em plaquinha?) |
| 6 | **Prévia 3D** | modelo que gira; aviso de que o lado que a foto não mostra é estimado |
| 7 | Adicionar ao carrinho | ou "Personalizar outro pet" |

**Carrinho** (`/carrinho`, `noindex`): cada item com a sua prévia; remover; editar (volta ao configurador com o estado); oferta de 2ª peça se existir (`TODO-CLIENTE`); total **estimado** (o valor final é combinado no WhatsApp); entrega "a combinar", com a entrega local pela equipe nas 4 cidades como diferencial.

**Revisar e enviar** (dentro do carrinho, sem página separada de checkout): nome (opcional), cidade (4 cidades ou "outra"), observações, aceite da política de privacidade. O botão **"Enviar pedido pelo WhatsApp"** grava o pedido, gera o código e abre o WhatsApp com a mensagem pronta:

```
Olá! Quero fazer este pedido de escultura pelo site.
Pedido CP-7K3M9Q
1x Escultura 20 cm · sentado · branco · "Thor"
Total estimado: R$ ___ (valor final a combinar)
Ver prévia: https://<domínio>/pedido?c=CP-7K3M9Q&t=<token>
```

Se o servidor estiver fora do ar ou a cota de prévias acabar, o botão **continua funcionando** com a mensagem sem o link, e o cliente envia a foto pelo próprio WhatsApp. O WhatsApp nunca depende do backend.

**Meus pedidos** (`/meus-pedidos`): sem login, é o histórico **deste aparelho** (códigos guardados no navegador) com o resumo de cada pedido e "Reenviar pelo WhatsApp". Quem trocar de aparelho acha o pedido pelo código + o link recebido na mensagem. O andamento da produção é tratado no WhatsApp.

## 3. Rotas

| Rota | Fase | Indexa? | Conteúdo |
|---|---|---|---|
| `/esculturas` | 1 | sim | landing de venda (estática); o CTA leva a `/personalizar` |
| `/personalizar` | 1B | não | configurador em tela focada |
| `/carrinho` | 1B | não | carrinho + revisar e enviar |
| `/meus-pedidos` | 1B | não | histórico do aparelho |
| `/pedido?c=…&t=…` | 2 | não | página do pedido (prévia, itens, status) para o cliente |
| `/atelier` | 2 | não | área do dono: lista de pedidos, arquivos de impressão |
| páginas legais | 1 | sim | privacidade, termos, trocas, entrega: `TODO-CLIENTE` |

Páginas de pedido dependem de dados, então usam **query string** e leem por fetch: no export estático não dá para gerar uma página por pedido.

## 4. Pipeline da prévia (foto → estátua imprimível)

Com a impressão 3D, a prévia tem de ser uma **malha 3D** (arquivo `.glb`), não uma imagem: a mesma malha, reparada e escalonada pelo dono, vira o arquivo de impressão. Isso elimina a opção "imagem → imagem".

O que importa na escolha do provedor (critérios da prova de conceito):

| Critério | Por quê |
|---|---|
| **Malha fechada** (sem buracos) e com base plana | a impressora precisa de um sólido; reparo manual custa tempo do dono |
| Fidelidade do rosto, orelhas, cauda e pelagem | é o que o cliente reconhece |
| Lado de trás | a foto não mostra; o provedor inventa. A interface avisa |
| Espessura em 15 a 25 cm | partes finas (orelha, cauda) quebram |
| Tempo e custo por prévia | define cotas e teto diário |
| Forma de entrega | `.glb`/`.obj`/`.stl`; textura não importa, a peça é de uma cor só |

**Cor:** como a estátua é monocromática, a prévia aparece sem textura, com o material na cor escolhida. Trocar a cor é só mudar o material no visualizador, sem gerar de novo.

**Recomendação:** isolar o provedor atrás de uma interface `PreviewProvider` (`submit`, `getStatus`, `parseWebhook`) e fazer uma **prova de conceito** com 10 fotos reais (porte, pelo e qualidade variados) em 2 ou 3 provedores, **imprimindo ao menos 2 malhas** na impressora do dono. Precisa de chaves de API dos provedores (custo do dono, estimado em centavos a poucos dólares por geração; fontes divergem). A interface permite construir toda a loja antes com um provedor **simulado** (`mock`), que devolve uma estátua de exemplo.

**Proteção contra custo e abuso** (cada prévia é um custo por visitante):

- Cloudflare Turnstile (gratuito) antes de criar a prévia.
- Cota por sessão e por `ip_hash` por dia (sugestão: 3).
- **Teto diário de gasto** (`PREVIEW_DAILY_BUDGET_CENTS`): ao estourar, o botão vira "Falar no WhatsApp" e o cliente envia a foto lá.
- O navegador redimensiona a foto (lado maior ≤ 2048 px) e reencoda antes de enviar: menos bytes e o **EXIF** (que pode trazer a localização da casa) sai.
- Validação no servidor: tipo real do arquivo, tamanho, resolução mínima.
- Um pet por foto: triagem automática se o provedor oferecer; senão, conferência do dono ao receber o pedido.

## 5. Modelo de dados

Entidades: **Prévia**, **Pedido**, **Item do pedido**, **Evento do pedido**. O **catálogo** (tamanhos, poses, cores, preços) fica em código versionado (`content/estatua.ts`), importado pelo site e pelas funções.

```
Preview 1───* OrderItem *───1 Order 1───* OrderEvent
```

```ts
type Size  = { id: string; cm: number; priceCents: number | null }  // null = TODO-CLIENTE
type Pose  = { id: string; label: string; priceDeltaCents: number }
type Color = { id: string; label: string; swatch: string }
type ItemConfig = { sizeId: string; poseId: string; colorId: string; petName?: string; previewId: string }
// estimate(config, catalogVersion) -> { unitCents } | erro. Função pura, com teste unitário.
```

Esquema (rascunho, **não aplicado**). RLS ligado em todas as tabelas, sem política pública: só as Functions (chave de serviço) acessam.

```sql
create type preview_status as enum ('queued','processing','ready','failed','rejected','expired');
create type order_status   as enum ('new','confirmed','in_production','ready','delivered','canceled');

create table previews (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,            -- id opaco da URL e do polling
  session_id text not null,                  -- visitante anônimo (guardado no navegador)
  status preview_status not null default 'queued',
  photo_path text not null,                  -- bucket PRIVADO
  model_path text,                           -- .glb gerado
  image_path text,                           -- captura estática (miniatura, fallback)
  provider text not null, provider_job_id text, error_code text,
  cost_cents integer,                        -- custo real: alimenta o teto de orçamento
  ip_hash text not null,                     -- hash, nunca o IP
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                 -- ex.: CP-7K3M9Q
  view_token text not null,                  -- longo e aleatório; vai no link da mensagem
  status order_status not null default 'new',
  customer_name text, city text, notes text,
  estimate_cents integer,                    -- só estimativa; o valor final é do WhatsApp
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders on delete cascade,
  preview_id uuid not null references previews,
  size_id text not null, pose_id text not null, color_id text not null,
  pet_name text,
  unit_price_cents integer,                  -- estimativa congelada
  catalog_version text not null
);

create table order_events (
  id bigint generated always as identity primary key,
  order_id uuid not null references orders on delete cascade,
  from_status order_status, to_status order_status not null,
  note text, created_at timestamptz not null default now()
);
```

O **carrinho não vai ao banco**: fica no navegador (`localStorage`) com a configuração e o `public_id` da prévia de cada item. O pedido só é gravado ao enviar pelo WhatsApp.

## 6. Estados

**Prévia:** `queued → processing → ready`; `processing → failed` (uma nova tentativa, depois pede outra foto) ou `rejected` (sem pet, mais de um pet, imagem imprópria, baixa resolução); `→ expired` após 30 dias, quando a foto original é apagada, salvo se ligada a um pedido.

**Pedido** (mudado só pelo dono, no Atelier): `new → confirmed → in_production → ready → delivered`; `canceled` a qualquer momento. `confirmed` significa "combinado e pago no WhatsApp".

## 7. Arquitetura e API

```
Navegador (Next estático) ──fetch /api/*──► Netlify Functions ──► Supabase (Postgres + Storage privado)
                                                 └──► Provedor de prévia (foto → malha 3D), por webhook
```

`netlify.toml` encaminha `/api/*` para as funções. Cada função valida a entrada e responde JSON.

| Método e rota | O que faz |
|---|---|
| `POST /api/previews` | confere Turnstile e cotas, cria a prévia `queued` e devolve uma **URL assinada de upload** (a foto vai direto ao Storage, sem passar pela função, que tem limite de ~6 MB por requisição) |
| `POST /api/previews/{id}/start` | depois do upload, dispara o provedor numa função em background |
| `GET /api/previews/{id}` | status + URLs assinadas do resultado (consulta a cada 2 a 3 s) |
| `POST /api/webhooks/preview` | o provedor avisa que terminou; grava malha, captura e custo |
| `POST /api/orders` | **recalcula a estimativa no servidor**, confere que cada prévia existe e está `ready`, grava o pedido e devolve `code` + `view_token` |
| `GET /api/orders/{code}?t=…` | dados do pedido para o cliente (primeiro nome, itens, status, prévia) |
| `GET/PATCH /api/atelier/orders…` | lista, detalha (com URLs assinadas da **foto original e da malha**) e muda o status; exige `ATELIER_SECRET` |

Limites e preços das plataformas devem ser conferidos na documentação vigente antes de implementar.

**Atelier** (`/atelier`): sem contas de usuário. O dono informa uma senha, guardada só na sessão do navegador e conferida pela função em comparação de tempo constante, com limite de tentativas. Mostra os pedidos, o status e os botões para baixar a foto original e a malha. O arquivo de impressão fica **só aqui**: o link do cliente mostra a prévia, não o `.stl`. Se o dono quiser, a senha vira login do Supabase depois.

## 8. Revisão do código atual

| Peça | Situação |
|---|---|
| Tokens, tipografia, `Section`, `Card`, `Accordion`, `Lightbox`, `LightboxGallery` | **reaproveita sem mudança** |
| `Button` | **adapta**: estados `loading` (`aria-busy`) e `disabled` |
| `WhatsAppFloat` | **adapta**: esconder onde há a barra de abas (mobile) e em `/personalizar` |
| `content/site.ts` | **adapta**: `nav` ganha carrinho e "Meus pedidos"; slogan cobre as duas linhas |
| `lib/whatsapp.ts` | **adapta**: monta a mensagem do pedido |
| Header, **barra de abas inferior** (Início · Esculturas · Banho e tosa · Pedidos · Carrinho), contador do carrinho | **novo** (Etapa 3); a barra e o contador seguem o Nobre Pata |
| `Stepper`, `OptionCard` (radio nativo), `SummaryBar`, `PhotoDropzone`, `PreviewStage`, `FormField`, `CartItem`, `Alert` (aria-live), `Skeleton` | **novo** (Etapa 3B) |
| `content/estatua.ts`, `lib/loja/estimativa.ts`, `lib/loja/carrinho.ts` | **novo**: funções puras, com teste unitário |
| `netlify/functions/*`, `netlify.toml`, esquema do banco | **novo** (Fase 2) |

Estado do cliente: `useReducer` no configurador; carrinho em `localStorage` lido por `useSyncExternalStore` (evita erro de hidratação no export estático). O visualizador 3D carrega por `import()` dinâmico só na etapa da prévia e tem alternativa em imagem estática.

## 9. Segurança, LGPD, acessibilidade e desempenho

- **Segredos** (chaves do Supabase e do provedor, senha do Atelier) só em variáveis de ambiente das Functions; nada com prefixo `NEXT_PUBLIC_`.
- **Nunca confiar no navegador:** a estimativa e a existência da prévia são decididas no servidor.
- **Foto em bucket privado**; o navegador só recebe URLs assinadas de curta duração. Retenção: 30 dias para prévia sem pedido; com pedido, enquanto durar a produção e a garantia (`TODO-CLIENTE`).
- **LGPD:** política de privacidade com finalidade, retenção e contato; aceite registrado em `consent_at`; só coletar nome e cidade (opcionais); apagar por pedido pelo WhatsApp ou e-mail. Textos legais com revisão jurídica, principalmente trocas e devoluções de produto sob medida.
- **Cabeçalhos** de segurança (CSP, `X-Content-Type-Options`, `Referrer-Policy`) no `netlify.toml`.
- **Acessibilidade do fluxo:** opções são `<input type="radio">` reais; erros ligados por `aria-describedby` e anunciados; progresso da geração por `aria-live`; tudo operável pelo teclado; o visualizador 3D respeita `prefers-reduced-motion` (sem giro automático) e tem alternativa em imagem.
- **Desempenho:** a landing segue estática e leve; `/personalizar`, `/carrinho`, `/meus-pedidos`, `/pedido` e `/atelier` levam `noindex`. A meta de Lighthouse mobile ≥ 90 vale para as páginas públicas; no configurador, medir e registrar.

## 10. Roadmap por fase

| Fase | Entrega | Depende de |
|---|---|---|
| **1. Páginas públicas** (Etapas 3 a 5 do prompt) | cabeçalho, barra de abas, home, `/banho-e-tosa`, `/esculturas`, `/franquias`, `/contato`, páginas legais, SEO, formulários | aprovação da Etapa 2 |
| **1B. Loja completa no navegador** (Etapa 3B, inserida) | `/personalizar`, `/carrinho`, `/meus-pedidos` funcionando de ponta a ponta com **prévia simulada** e envio pelo WhatsApp (com resumo, sem link) | Etapa 3 e catálogo (pode ser provisório) |
| **2A. Prova de conceito da prévia** | 10 fotos reais, 2 a 3 provedores, 2 malhas impressas; relatório de tempo, custo, fidelidade e "imprimibilidade" | chaves de API e a impressora do dono |
| **2B. Backend real** | upload seguro, prévia real, cotas e teto, pedido gravado com link, `/pedido` e `/atelier` | 2A, projeto Supabase |
| **2C. Operação** | métricas de funil (prévia → carrinho → envio ao WhatsApp), ajustes de custo | 2B |

A 1B existe para você ver **toda a estrutura da loja** (como no Nobre Pata) antes de gastar com a geração real; trocar o provedor `mock` pelo real é trocar um adaptador.

## 11. Decisões

**Resolvidas pelo cliente:** (1) a estátua é impressa em impressora 3D pelo dono → prévia em **malha 3D**; (2) pagamento e fechamento **pelo WhatsApp**, sem gateway; o carrinho continua.

**Adotadas pela recomendação (revisáveis):** (3) configurador em rota própria `/personalizar`; (4) foto como primeiro passo, com a prévia gerando em segundo plano; (5) prévia grátis com cota (3 por visitante por dia) e teto diário baixo no começo.

**Pendências do cliente (`TODO-CLIENTE`):** impressora (volume de impressão máximo e tipo: resina ou filamento), para validar os tamanhos; tamanhos, poses, cores, material, preços e oferta de 2ª peça; prazo de produção; plaquinha com nome; política de troca e garantia; retenção de fotos; se a entrega local pela equipe é oferecida e em quais cidades; **terceiro prêmio** do inventário.
