# Análise do Nobre Pata (referência estrutural)

Análise feita em 10/10/2026 sobre `https://nobrepata.com/` e `https://nobrepata.com/esculturas`, em desktop (1366 px) e mobile (390 px). Os prints de página inteira estão em [`docs/referencia/`](referencia/).

**Método.** Chrome headless real controlado pelo DevTools Protocol (o Playwright não está instalado; o resultado é o mesmo): carga, rolagem completa como visitante, medição de estilos computados e captura de página inteira. O configurador foi percorrido até a etapa de upload de foto, sem enviar foto nem criar pedido.

## 0. Ressalvas

- **O site está em construção.** `/esculturas` se declara "versão teste" no `<title>`, tem canonical `/esculturas-teste` e description "Página de testes internos". A home tem canonical `/hibrida`. Por isso `/` é a referência principal e `/esculturas` é a referência do funil de escultura.
- **Não percorri** a etapa 7 (prévia 3D) nem o checkout: ambos exigem enviar uma foto ou criar um pedido.
- **Preços, prazos, doação a ONGs e nota 4,9/5 são dados comerciais deles.** Nada disso é reutilizado.
- O texto do Nobre Pata se contradiz sobre o material: a home diz "resina", `/esculturas` diz "bioplástico de origem vegetal".

## 1. Stack aparente

| Item | Observado |
|---|---|
| Front-end | Vite + React SPA (bundle `/assets/index-*.js`, sem `__NEXT_DATA__`), classes utilitárias no estilo Tailwind |
| Plataforma | Indícios de Lovable (`og:image` em `*.lovable.app`, scripts `/~flock.js` e `/__l5e/…`) |
| Backend | Supabase: tabela de eventos `portrait_events`, RPC `get_sculpture_showcase_teste_ranked`, edge function `log-showcase-impression` |
| Mídia | Imagens em Cloudflare R2; 148 imagens na home, 138 com `loading="lazy"`, todas com `alt` |
| Terceiros | GA4, Meta Pixel, Microsoft Clarity, Cloudflare Turnstile (anti-bot), selo Reclame Aqui |
| Renderização | **Só no cliente.** O HTML bruto tem 7,5 KB e **0 caracteres de texto** (`<div id="root"></div>`). O Google só vê o conteúdo depois de executar JavaScript |

## 2. Home `/` — seções em ordem (desktop 1366 px, altura total 8.445 px; mobile 8.915 px)

| # | Seção | y (px) | Altura | Layout | CTA |
|---|---|---|---|---|---|
| 1 | Nav `sticky` | 0 | 53 | barra | "Meus Pedidos", sacola |
| 2 | **Hero** `#upload` | 53 | 776 | split: texto à esquerda; carrossel de resultados à direita | pílula dourada "✦ Prévia grátis ✦ Pronta em 30 segundos" |
| 3 | Barra de abas inferior (fixa) | — | 61 | 5 abas | Quadros · Esculturas · Pedidos · Ajuda · Carrinho |
| 4 | **Esculturas artísticas em resina** + **Tamanhos & acabamentos** | 829 | 1.653 | carrossel de 3 cards; depois 3 tamanhos + 5 cores | botão preto "Criar escultura do meu pet" |
| 5 | **Estilos artísticos** `#galeria` | 2.482 | 1.145 | lista de 9 estilos à direita, preview grande em cenário à esquerda | — |
| 6 | **Estilo do mês** (faixa escura) | 3.627 | 896 | centrado, carrossel com miniaturas, selo "edição limitada" | — |
| 7 | **Composições de parede** | 4.523 | 800 | carrossel de duplas, fundo tonal | — |
| 8 | **Como funciona** `#como-funciona` | 5.324 | 883 | 3 cards com imagem de fundo e número | — |
| 9 | **Propósito** `#proposito` | 6.207 | 983 | banner com imagem e overlay, 3 benefícios | botão preto "Começar agora" |
| 10 | **Depoimentos** | 7.189 | 565 | 3 cards de texto | — |
| 11 | Footer | 7.754 | 627 | 4 colunas | — |

**Hero em detalhe.** Eyebrow, H1 (a última palavra em itálico dourado), subtítulo, "a partir de R$ 299" em itálico dourado, duas portas de entrada lado a lado ("Criar meu quadro" / "Criar minha escultura"), dica de foto ("Um pet por foto · rosto visível · boa iluminação") e a pílula dourada. À direita, carrossel horizontal de cards verticais com selo de estilo, contador de curtidas e pontos de paginação: o card central em destaque e os laterais esmaecidos. No mobile o carrossel passa para cima das duas portas.

## 3. `/esculturas` — seções em ordem (desktop; altura total 11.595 px)

| # | Seção | Altura | Conteúdo |
|---|---|---|---|
| 1 | **Hero** | 1.897 | eyebrow, H1 "Eternize seu pet em uma escultura artística.", faixa de 8 miniaturas circulares com ✓ que trocam o par, **comparador antes/depois** (arrastar, "FOTO \| ESCULTURA", expandir), legenda, chip "Prévia em 30 segundos" + 4,9/5, CTA preto, faixa "Leve 2 esculturas, a 2ª sai com 25% OFF", card verde "Bioplástico de origem vegetal" |
| 2 | **Pets reais, esculturas reais** `#pets-reais` | 779 | carrossel com selo "Cliente real" + miniatura circular da foto original + nome do pet |
| 3 | **Cinco cores, cinco personalidades** `#acabamento` | 1.086 | seletor de 5 cores + card grande de ambientação + "Natural ou superpremium?" |
| 4 | "Pronto para escolher o da sua peça?" | 290 | faixa de CTA |
| 5 | **Manifesto** (faixa `#0e0e0e`) | 681 | "Há gestos que não cabem em uma foto." |
| 6 | **Na parede e na estante** | 1.464 | combo escultura + quadro |
| 7 | **Qualidade** | 717 | 3 cards: material, sob medida, entrega segura |
| 8 | **Você escolhe como eternizar** `#tipos` | 1.004 | Na pose da foto · Busto ("Mais vendido") · Sentado |
| 9 | "Vamos esculpir o seu?" | 290 | faixa de CTA |
| 10 | **Em três passos** `#como-funciona` | 730 | Envie a foto · Personalize · Receba em casa |
| 11 | **Três tamanhos. Três acabamentos.** | 1.271 | foto comparativa dos 3 tamanhos ao lado de uma mão, preços em 6x e à vista, 5 cores |
| 12 | Chamada final | 646 | "Comece pela foto. Termine na eternidade." |
| 13 | Footer | 627 | igual à home |

## 4. Navegação e rotas

- **Header.** `<nav>` com `position: sticky`, 53 px, fundo `#f5f3f0` a 90% com `backdrop-filter: blur(12px)`, borda inferior de 1 px. **Não muda ao rolar** (medido em 0, 900 e 2.500 px). Desktop: logo em serifa caixa-alta à esquerda; "MEUS PEDIDOS" e ícone de sacola à direita. Mobile: logo, sacola e hambúrguer.
- **Barra de abas inferior** fixa (61 px, `#f5f3f0` a 95% com blur): Quadros · Esculturas · Pedidos · Ajuda (WhatsApp) · Carrinho. Aparece também no desktop.
- **CTA flutuante.** Nos prints de `/esculturas` há uma barra preta fixa "Criar minha escultura" acima das abas, e um botão verde de WhatsApp no canto.
- **Rotas internas (12):** `/`, `/esculturas`, `/quadros`, `/meus-pedidos`, `/ranking`, `/cadastro-ong`, `/politica-de-privacidade`, `/termos-de-uso`, `/trocas-e-devolucoes`, `/entrega-e-frete`, `/trabalhe-conosco`, `/chamado`. Âncoras: `#como-funciona`, `#proposito`, `#depoimentos`.
- **Externos:** WhatsApp com mensagem pré-preenchida, Google Maps, `mailto`, Reclame Aqui.

## 5. Funil de conversão

- **Um objetivo único:** abrir o configurador. A home tem a pílula dourada, as duas portas do hero, o botão preto da vitrine e o "Começar agora"; `/esculturas` repete o botão preto cerca de seis vezes (hero, galeria, "Pronto para escolher?", combo, "Vamos esculpir o seu?", chamada final), mais a barra fixa e a aba "Esculturas".
- **Nenhum CTA é link:** todos acionam o configurador por JavaScript (sem `href`). O configurador é **inline** em `/esculturas` ("Configure sua escultura", Passo 1 de 7), não é modal nem rota.
- **Gatilhos de redução de risco:** "Prévia grátis, sem cadastro", pronta em 30 segundos, 6x sem juros exibido em cada tamanho, frete grátis a partir de 2 itens, prazo de 7 a 15 dias úteis.
- **Contato secundário:** WhatsApp e `/chamado`.

## 6. Prova social

- Nota **4,9/5** com cinco estrelas ao lado do CTA do hero de `/esculturas`.
- **Galeria "Pets reais"**: selo "Cliente real" e miniatura circular com a foto original sobre cada escultura.
- **Depoimentos** no fim da home: 3 cards com estrelas, citação em itálico serifado, nome, pet com raça e produto comprado.
- Contador de curtidas nos cards do hero.
- Selo Reclame Aqui no rodapé.

## 7. Elementos de confiança

Prévia grátis em 30 s sem cadastro; parcelamento exibido; frete e prazo; descrição do material; páginas de privacidade, termos, trocas e devoluções, entrega e frete; CNPJ, endereço e horário no rodapé; WhatsApp e e-mail; Reclame Aqui. **Não há FAQ** em nenhuma das duas páginas.

## 8. Design system (medido no navegador)

### Paleta

| Papel | Valor | Uso |
|---|---|---|
| Fundo da página / nav | `#f5f3f0` | fundo base |
| Superfícies | `#ebe9e5`, `#e3e1dd` | seções tonais (a 30–50%), cards |
| Borda | `#d7d2cc` | 1 px a 30–60% |
| Texto principal | `#1a1a1a` | títulos, botão preto |
| Texto secundário | `#616161` | subtítulos, rótulos |
| Acento | `#c4a76e`, `#ac8e53` | CTA dourado, rótulos, preços |
| Faixas escuras | `#0e0e0e`, ~`#262626` | manifesto, estilo do mês |

### Tipografia

| Elemento | Medido |
|---|---|
| Títulos | Playfair Display 700 (H1 **72/72 px** no desktop, H2 30/36, H3 24/32) |
| Texto | Montserrat 400/500/600/700 (corpo 16/24; secundário 14/20 e 13/21) |
| Citações | Cormorant Garamond itálico 16/26 |
| Eyebrow | Montserrat 12 px, `letter-spacing` 3 px, caixa-alta, `#616161` |
| Menu | 12 px, `letter-spacing` 1,2 px, caixa-alta |
| **Palavra-acento do título** | itálico + `linear-gradient(135deg, #bc9c5c, #dabc81, #bc9c5c)` com `background-clip: text` |

### Forma e espaço

- **Raios:** pílula (`9999px`) é o mais usado (165 elementos: selos, chips, pontos, CTA dourado); cards `16px` e `12px`; botão preto e chips de estilo `4px`; cards de depoimento `4px`.
- **Sombras:** quase imperceptíveis (`rgba(0,0,0,.05)` e `.1`); brilho dourado `0 0 40px rgba(196,167,110,.12)` no botão preto.
- **Botão preto:** `#1a1a1a`, texto `#f5f3f0`, 12 px/500, caixa-alta, `letter-spacing` 3 px, padding 14×32, raio 4 px, transição de cor em 150 ms.
- **Seções:** `padding` vertical de 64 a 112 px (80 px é o mais comum; 96 px nas de fundo tonal). Container máximo de 1280 px (padding lateral 16 px no mobile e 48 px no desktop); blocos de conteúdo em 1024, 672, 576 e 512 px.
- **Imagens:** cenários de ambientação (peça sobre móvel, quadro na parede), miniaturas circulares com anel, cantos de 16 px.

### Movimento

Transições de 150, 300 e 500 ms; uma animação `pulse`; carrosséis horizontais com cards laterais esmaecidos (não usam `scroll-snap` nativo); o CSS contém `prefers-reduced-motion`.

## 9. Tom de voz

Afetivo, solene e curto. Metáforas de arte e eternidade ("Eternize", "obra de arte", "Termine na eternidade", "Há gestos que não cabem em uma foto"). Cada título tem duas partes: texto em preto e uma palavra-acento em itálico dourado. Acima de cada título, um eyebrow em caixa-alta espaçada; abaixo, um subtítulo cinza de uma ou duas linhas. CTAs em primeira pessoa ("Criar minha escultura").

## 10. SEO, performance e o que **não** copiar

| Observado | Por que não copiar |
|---|---|
| HTML inicial sem texto (renderização só no cliente) | O Google e os leitores de tela dependem de JavaScript. Nossa versão sai pré-renderizada |
| **Dois `<h1>`** na home | Um único `<h1>` por página |
| `canonical` e `og:url` apontando para outra rota (`/hibrida`, `/esculturas-teste`) | Canonical sempre igual à própria URL |
| `og:image` hospedada em `lovable.app` | Imagem no próprio domínio |
| JSON-LD só com `Organization` e `WebSite` | Usar `LocalBusiness`/`PetGrooming` + `Product`/`Offer` quando houver preço |
| 7 famílias tipográficas declaradas, 3 usadas | Carregar só o que se usa |
| Botão "Limpar cache & recarregar" no rodapé | Resíduo de depuração |
| Contador "0 estilos" na página de quadros | Bug de exibição |
| Botão testado sem indicador de foco (`outline: none`) | Foco visível obrigatório (AA) |
| 5 serviços de terceiros no carregamento (Clarity, GA4, Meta Pixel, Turnstile, Reclame Aqui) | Carregar analytics sob consentimento (LGPD) e fora do caminho crítico |
| Sem FAQ | A Cristal Pet já tem FAQ e deve mantê-lo |

## 11. Funcionalidades do configurador (insumo para a fase 2)

Configurador **inline** em `/esculturas`: stepper de 1 a 7, botões Voltar/Continuar, e uma barra de resumo "Sua escultura" sempre visível com preço em 6x e à vista, atualizada a cada escolha. O tamanho avança sozinho ao ser escolhido.

| Etapa | O que coleta | Observado |
|---|---|---|
| 1 | Tamanho | 15 / 20 / 25 cm; foto comparativa com uma mão; "Compare as proporções reais lado a lado"; selo "Mais vendida" no médio |
| 2 | Tipo | Na pose da foto · **Busto** ("Mais vendido", mesmo preço) · Sentado; cada um com exemplo |
| 3 | Cor | Branco · Bege ("Mais vendida") · Cinza · Preto · Marrom, cada uma com descrição curta |
| 4 | Nome do pet | texto livre ("Digite aqui, ex.: Luna"); o nome aparece no resumo em fonte caligráfica |
| 5 | Sexo | ♂ Macho · ♀ Fêmea · uma terceira opção neutra |
| 6 | **Foto** | upload; dicas: boa qualidade, **de preferência corpo inteiro** (mesmo busto ajuda a acertar a expressão), **apenas um pet**, boa iluminação e fundo simples; "Prévia interativa em ~30 segundos" (visto em print enviado pelo cliente) |
| 7 | Prévia | provável visualizador 3D interativo + adicionar ao carrinho (**não percorrido**) |

**Backend observado antes do upload:** a única escrita foi um evento de analytics em `portrait_events`; nenhum pedido foi criado.

## 12. Próximo passo

Equivalências para a Cristal Pet: [`mapa-equivalencia.md`](mapa-equivalencia.md).
