# Mapa de equivalência: Nobre Pata → Cristal Pet

**Status: aprovado (Etapa 0 do prompt), com a fase 2 revista em [`modelo-do-sistema.md`](modelo-do-sistema.md).** Insumos: [`analise-nobre-pata.md`](analise-nobre-pata.md), o prompt `prompt-cristal-pet-estrutura-nobre-pata.md` e o projeto Cristal Pet anterior (`projects/cristal-pet-site`, 26 componentes e 31 imagens já prontos).

## 1. Premissa adotada (precisa de confirmação)

O prompt descreve um site de **serviço** (banho e tosa) com a estrutura do Nobre Pata. Mas a funcionalidade principal que você quer na fase 2, gerar uma estátua 3D a partir da foto do cliente, é o **produto** do Nobre Pata. As duas coisas se encaixam assim:

- O Nobre Pata tem **duas linhas** (Quadros e Esculturas): uma home "híbrida" com **duas portas de entrada no hero** e uma página por linha.
- A Cristal Pet passa a ter **duas linhas**: **Banho e tosa móvel** (serviço, conversão no WhatsApp) e **Escultura 3D do seu pet** (produto, conversão no configurador).

Estrutura proposta: home híbrida + uma página por linha. A escultura é o CTA primário do hero; o banho e tosa é a segunda porta e conserva **todo** o conteúdo do inventário. O inventário não traz nenhum dado da escultura (preço, tamanho, material), então tudo isso entra como `TODO-CLIENTE`.

## 2. Rotas

O Nobre Pata tem páginas internas, então replico as rotas (regra do prompt).

| Nobre Pata | Cristal Pet | Fase | Observação |
|---|---|---|---|
| `/` (híbrida) | `/` | 1 | duas portas no hero |
| `/quadros` | `/banho-e-tosa` | 1 | linha de serviço: serviços, método, filhotes, van, cidades |
| `/esculturas` | `/esculturas` | 1 estrutura, 2 configurador | funil da escultura, configurador inline |
| (configurador inline em `/esculturas`) | `/personalizar` | 1B | rota própria; ver [`modelo-do-sistema.md`](modelo-do-sistema.md) |
| aba "Carrinho" | `/carrinho` | 1B | `noindex`; inclui "revisar e enviar pelo WhatsApp" |
| `/meus-pedidos` | `/meus-pedidos` | 1B | **sem login**: histórico deste aparelho; o acerto e o pagamento são feitos no WhatsApp, por isso **não há checkout nem gateway** |
| `/chamado` | `/contato` | 1 | Netlify Forms com honeypot + WhatsApp |
| `/politica-de-privacidade` | igual | 1 (texto `TODO-CLIENTE`) | obrigatória: o upload de foto de pet pode expor dados pessoais (LGPD) |
| `/termos-de-uso` | igual | 1 (texto `TODO-CLIENTE`) | |
| `/trocas-e-devolucoes` | igual | 1 (texto `TODO-CLIENTE`) | produto sob medida: revisão jurídica |
| `/entrega-e-frete` | igual | 1 (texto `TODO-CLIENTE`) | |
| `/trabalhe-conosco` | `/franquias` | 1 | o inventário tem franquias, não vagas |
| `/ranking`, `/cadastro-ong` | omitidas | | sem equivalente (decisão 3) |

## 3. Home `/` (mesmo ritmo do Nobre Pata)

| # | Nobre Pata | Cristal Pet | Conteúdo do inventário | CTA |
|---|---|---|---|---|
| 1 | Nav sticky, 53 px, blur | **Header** sticky ~56 px, fundo creme a 90% com blur, logo Cristal Pet Móvel, links Esculturas · Banho e tosa · Sobre · FAQ; sacola com contador e "Meus pedidos" (entram com a loja, fase 1B); hambúrguer no mobile | marca e slogan | sem botão no header (como na referência) |
| 2 | **Hero**: H1 com palavra-acento, 2 portas, dica de foto, pílula dourada, carrossel de resultados | **Hero**: H1 afetivo; 2 portas (**Escultura 3D do seu pet** e **Banho e tosa móvel**); dica "um pet por foto · corpo inteiro · boa iluminação"; carrossel de pets reais | proposta principal; cidades | **primário: "Criar minha escultura"**; a porta do banho e tosa leva a `/banho-e-tosa` |
| 3 | Barra de abas fixa (5) | Mobile: Esculturas · Banho e tosa · Pedidos · Ajuda (WhatsApp) · Carrinho (o início é o logo). Pedidos e Carrinho só aparecem na fase 1B, quando existirem. Desktop: sem barra, só o botão flutuante de WhatsApp | | evita repetir CTAs |
| 4 | Esculturas em resina (carrossel + miniatura da foto original) | **Esculturas do seu pet**: carrossel de exemplos com a miniatura circular da foto original | `TODO-FOTO` | → `/esculturas` |
| 5 | Tamanhos e acabamentos | **Tamanhos e acabamentos**: resumo de tamanhos e cores | `TODO-CLIENTE` (tamanhos, preços, cores, material) | botão escuro |
| 6 | Estilos artísticos (lista + preview) | **Galeria** única com lightbox (~12 fotos de pets depois do atendimento) | galeria; alguns arquivos serão trocados | |
| 7 | Estilo do mês (faixa escura) | **Especialistas em filhotes** (faixa escura): adaptação ao banho e tosa, 2 vídeos do Instagram | filhotes | "Agendar o primeiro banho" (WhatsApp) |
| 8 | Composições de parede (carrossel) | **A unidade móvel** (carrossel): bancada, secador, caixa de secagem, banheira em aço inox | unidade móvel; `TODO-FOTO` | |
| 9 | Como funciona (3 cards numerados) | **Como funciona**: 4 passos do serviço (Agendamento fácil · Chegamos até você · Cuidado exclusivo e seguro · Pet feliz e cheiroso). Os 3 passos da escultura ficam em `/esculturas` | como funciona | |
| 10 | Propósito (banner + 3 benefícios) | **Por que a Cristal Pet**: banner com os prêmios IPOPE e o método Low Stress, 4 diferenciais, números (9 anos · +90.000 atendimentos · 4 cidades; contadores já com o valor final, sem mostrar "0" sem JavaScript) | diferenciais, prêmios, números | "Agendar pelo WhatsApp" |
| 11 | sem equivalente (prazo vira microcopy) | **Onde atendemos**: chips Indaiatuba, Campinas, Valinhos, Vinhedo | cidades | "Fale com a gente" (mensagem com a cidade) |
| 12 | Depoimentos (3 cards de texto) | **Feedback dos clientes**: 4 vídeos do Instagram em fachada clicável (o embed só carrega no clique) | depoimentos | "Envie a foto do seu pet" |
| 13 | sem equivalente | **Franquias**: "Seja um Franqueado Cristal Pet" (perto do fim, antes do FAQ) | franquias | "Quero ser franqueado" |
| 14 | sem FAQ | **FAQ**: 10 perguntas em acordeão; o texto é reaproveitado do site atual (`src/data/faq.js`) | FAQ | |
| 15 | Footer em 4 colunas, selo, CNPJ | **Footer**: marca e slogan · Institucional · Políticas · Atendimento (WhatsApp, e-mail, endereço, **seg–sex 8h–17h, sáb 8h–13h, nunca "24h"**, Instagram, Facebook); CNPJ `TODO-CLIENTE`; sem selo Reclame Aqui | contato | |

## 4. `/esculturas`

| # | Nobre Pata | Cristal Pet | Observação |
|---|---|---|---|
| 1 | Hero: eyebrow, H1, miniaturas circulares, **comparador antes/depois**, chip "Prévia em 30 s" + 4,9/5, CTA, promo 2ª peça, card do material | Mesma estrutura | **Sem nota 4,9/5** (não temos avaliações; nunca inventar). Promo e material: `TODO-CLIENTE`. A promessa "prévia grátis em X segundos" só entra depois de medirmos o tempo real |
| 2 | Pets reais, esculturas reais (selo "Cliente real") | Mesma seção | só com fotos reais e autorização do tutor; senão a seção sai. `TODO-FOTO` |
| 3 | Cinco cores, cinco personalidades | Cores e acabamentos | `TODO-CLIENTE` |
| 4 | Faixa "Pronto para escolher?" | Mesma | |
| 5 | Manifesto (faixa escura) | Manifesto com a voz da Cristal Pet (o cuidado de quem convive com o pet toda semana) | texto novo, a aprovar |
| 6 | Na parede e na estante (combo com quadro) | **Omitida**: não vendemos quadros | decisão 3 |
| 7 | Qualidade (3 cards) | Qualidade Cristal Pet (3 cards) | `TODO-CLIENTE` (material, sob medida, entrega) |
| 8 | Você escolhe como eternizar (pose, busto, sentado) | Tipos de escultura | `TODO-CLIENTE` |
| 9 | Faixa "Vamos esculpir o seu?" | Mesma | |
| 10 | Em três passos | Envie a foto · Personalize · Receba em casa | |
| 11 | Três tamanhos (foto comparativa com mão) | Mesma seção | `TODO-FOTO` e `TODO-CLIENTE` |
| 12 | Chamada final | Mesma | |
| 13 | **Configurador inline, 7 passos** | **Fase 1B**: rota `/personalizar` | `#configurar` em `/esculturas` vira uma amostra do fluxo com o CTA |

**Configurador (fase 1B, com prévia simulada; a geração real é a fase 2):** no Nobre Pata a ordem é 1 Tamanho · 2 Tipo · 3 Cor · 4 Nome · 5 Sexo · 6 **Foto** · 7 **Prévia 3D**. Para a Cristal Pet, a proposta é **foto primeiro**, com a prévia gerando em segundo plano enquanto o cliente escolhe tamanho, pose, cor e nome, com barra de resumo e preço sempre visível. O fluxo completo, o modelo de dados e a arquitetura estão em [`modelo-do-sistema.md`](modelo-do-sistema.md).

## 5. `/banho-e-tosa` (equivale a `/quadros`)

Hero com a proposta principal e o CTA de WhatsApp → 3 serviços (banho terapêutico e higienização; tosa higiênica e da raça; hidratação e cuidados especiais), sem preço público e com a estrutura pronta para "a partir de R$" → Método Low Stress (com o vídeo na prática, em fachada) → Filhotes → Unidade móvel → Como funciona → Onde atendemos → Galeria → Feedback → Prêmios e números → Franquias → FAQ → CTA final. O CTA do WhatsApp leva mensagem pré-preenchida com serviço e cidade quando vem de um card.

## 6. Componentes globais

| Componente | Decisão |
|---|---|
| Botão flutuante de WhatsApp | em todas as páginas, com mensagem pré-preenchida |
| CTA primário | um por dobra; no total bem menos repetição que o site atual |
| Vídeos do Instagram | fachada com miniatura; o embed só carrega no clique |
| Galeria | uma só, com lightbox, sem prévia duplicada |
| Acessibilidade | contraste AA, foco visível (a referência não tem), `prefers-reduced-motion` |
| Contadores | renderizam o valor final no HTML |

## 7. Design: proposta de tokens (a fechar na etapa 2)

A cor de marca continua sendo o verde-água, no lugar do dourado do Nobre Pata. O teal `#4BC0AF` **sozinho não serve para texto**: medi o contraste de cada par.

| Par | Contraste | Resultado |
|---|---|---|
| Texto `#1A1A1A` sobre creme `#FAF9F5` | 16,5:1 | AAA |
| Texto secundário `#5F5B55` sobre creme | 6,4:1 | AA |
| **Teal `#4BC0AF` como texto sobre creme** | **2,1:1** | **falha** |
| **Branco sobre teal** | **2,2:1** | **falha** |
| Tinta `#1A1A1A` sobre teal | 7,8:1 | AAA |
| Teal profundo `#1F6F63` como texto sobre creme | 5,7:1 | AA |
| Magenta `#C82D91` como texto sobre creme | 4,7:1 | AA |
| Branco sobre magenta | 4,95:1 | AA |
| Teal sobre tinta (acento em faixa escura) | 7,8:1 | AAA |

- **Cores:** fundo creme `#FAF9F5`; texto `#1A1A1A` e `#5F5B55`; **teal `#4BC0AF` só em preenchimentos, ícones e faixas** (sempre com texto escuro por cima); **teal profundo `#1F6F63` para texto e palavra-acento**; magenta `#C82D91` para selos e promoções; faixas escuras `#1A1A1A`.
- **Tipografia:** título em serifa suave com **palavra-acento em itálico** (o recurso que dá o ar "premium" do Nobre Pata, sem copiar a identidade deles), corpo em Nunito Sans (já é da marca). Recomendo **Fraunces** nos títulos; a alternativa é manter só Nunito (decisão 4). Eyebrow em caixa-alta espaçada. Carregar só as famílias usadas.
- **Forma:** botões em pílula (como no site atual da Cristal Pet), cards de 16 px, selos em pílula, sombras quase imperceptíveis, seções com 80 a 96 px de respiro vertical, container de 1280 px.

## 8. Decisões que preciso de você

1. **Papel da escultura.** A escultura vira o CTA primário e o banho e tosa a segunda porta (premissa da seção 1)? Ou o banho e tosa continua como a conversão principal e a escultura entra como linha secundária?
2. **Rotas.** Confirma `/`, `/banho-e-tosa`, `/esculturas`, `/franquias`, `/contato` e as 4 páginas legais (a loja exige)?
3. **O que sai ou muda por não ter equivalente:** Ranking de Artes, Cadastro de ONG, a doação de ração, Estilo do mês (vira Filhotes), Composições de parede (vira Unidade móvel), combo quadro + escultura, nota 4,9/5 e selo "Cliente real". Pode seguir assim?
4. **Tipografia.** Fraunces nos títulos (recomendado) ou só Nunito?
5. **Dados da escultura.** O inventário não tem tamanhos, preços, cores, material (o Nobre Pata fala em "resina" e em "bioplástico"), prazo, frete, nem oferta. Na estrutura uso placeholders `TODO-CLIENTE`; você já tem esses números?
6. **Prêmios.** O inventário diz "3º ano consecutivo", mas lista só 2024 (Pet Shop) e 2025 (Pet Móvel). Qual é o terceiro?
7. **Arquitetura da fase 2.** O prompt pede Next.js com **export estático**. Isso mantém a estrutura simples e rápida, mas **não permite** Route Handlers nem Server Actions. O upload da foto, a chamada de geração 3D e os pedidos vão precisar de **Netlify Functions e/ou Supabase** (Storage, Postgres e Edge Functions). Não bloqueia a fase 1, mas muda a fase 2. Os formulários do Netlify, por sua vez, só funcionam se o `<form data-netlify>` estiver no HTML gerado no build (ou num HTML estático em `public/`) e se a opção "Form detection" estiver ligada no painel; no site anterior o envio devolvia 404, provavelmente por falta de detecção.

## 9. Pendências do cliente

**`TODO-CLIENTE`:** tamanhos, preços e parcelamento, cores, tipos, material, prazo, frete e oferta da escultura; promessa de "prévia grátis"; textos legais (privacidade, termos, trocas, entrega); CNPJ; domínio; terceiro prêmio; preço dos serviços ("a partir de R$"); links dos 4 vídeos de depoimentos; link da página do Facebook; confirmação de "9 anos" e "+90.000 atendimentos".

**`TODO-FOTO`:** esculturas (por tipo e cor), comparativo de tamanhos com uma mão, pares foto → escultura com autorização do tutor, a unidade móvel (bancada, secador, caixa de secagem, banheira), as ~12 fotos da galeria que ainda serão trocadas, miniaturas dos vídeos, logo em alta resolução e imagem de compartilhamento (OG).

**Já existe e dá para reaproveitar** (`projects/cristal-pet-site/public/img`): logo, galeria `g01` a `g12`, fotos dos 4 passos, ícones de diferenciais e contadores, cidades atendidas, colagem do Sobre, vídeos de franquia.

## 10. Ajustes feitos em relação ao prompt original

- O prompt adapta "produto → serviço". Como a escultura é o foco, mantive o serviço **e** o produto, espelhando as duas linhas do Nobre Pata.
- Acrescentei as páginas legais e, na fase 1B, `/personalizar`, `/carrinho` e `/meus-pedidos` (sem login e sem checkout: o pagamento é no WhatsApp), porque uma loja precisa delas.
- Em vez de reproduzir a paleta dourada do Nobre Pata, defini um sistema de cor próprio, com contraste medido: o teal sozinho reprova em AA como texto.
- Mantive tudo o que o prompt proíbe copiar fora: textos, imagens, marca, preços, nota e doação do Nobre Pata.
