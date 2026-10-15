# Mapa: Nobre Pata → Cristal Pet Esculturas

A loja de referência é o **Nobre Pata** (estrutura e funcionalidades; nunca texto, imagem, marca, preço, nota ou doação). A Cristal Pet Esculturas é uma **loja comercial de esculturas de pets impressas em 3D**, sem parte institucional. Análise da referência: [`analise-nobre-pata.md`](analise-nobre-pata.md). Sistema completo: [`modelo-do-sistema.md`](modelo-do-sistema.md).

> Histórico: o primeiro desenho misturava a loja com o banho e tosa da Cristal Pet (home híbrida, páginas de serviço, franquias, galeria). Foi descartado: isso pertence ao outro site, e este projeto é só comércio.

## Rotas

| Nobre Pata | Cristal Pet | Observação |
|---|---|---|
| `/` (home híbrida) | `/` | vitrine única |
| `/esculturas` (funil + configurador inline) | `/personalizar` | rota própria: carrega só o que o configurador precisa |
| aba "Carrinho" | `/carrinho` | inclui "enviar pedido pelo WhatsApp" |
| `/meus-pedidos` | `/meus-pedidos` e `/pedido` | sem login: histórico do aparelho + link com token |
| (painel interno) | `/admin` | senha única; pedidos, status, arquivo 3D |
| `/chamado` | `/contato` | WhatsApp, e-mail, horário |
| políticas (4) | iguais | texto `TODO-CLIENTE` |
| `/quadros`, `/ranking`, `/cadastro-ong`, `/trabalhe-conosco` | omitidas | sem equivalente |

## Home (`/`)

| Nobre Pata | Cristal Pet |
|---|---|
| nav fixa com blur, sem botão | igual, com "Meus pedidos" e carrinho com contador |
| hero: H1 com palavra-acento, CTA, dica de foto, resultados | hero com **um** CTA "Criar minha escultura", três pontos de confiança e o visual foto → prévia |
| barra de abas inferior (5) | Início · Criar · Pedidos · Ajuda (WhatsApp) · Carrinho |
| vitrine de esculturas | "Exemplos" (carrossel; fotos `TODO-FOTO`) |
| como funciona (3) | três passos, **sem prometer prazo nem nota** |
| tamanhos e acabamentos | cartões de produto com altura, preço e botão "Escolher" (levam ao configurador já com o tamanho) |
| qualidade (3 cards) | três cards (sob medida, impressa em 3D, atendimento no WhatsApp) |
| (sem FAQ) | FAQ em acordeão nativo |
| footer em 4 colunas, selo, CNPJ | rodapé: loja, políticas, atendimento; CNPJ `TODO-CLIENTE`; sem selo |

Não copiamos: nota 4,9/5, selo "Cliente real", combo quadro + escultura, preços, prazo de 7 a 15 dias, frete grátis, parcelamento, doação de ração, Ranking de Artes.

## Configurador

Mesma ordem da referência: **Tamanho → Tipo → Cor → Nome → Foto → Prévia**, com resumo sempre à vista e preço estimado. Diferenças: sem "Sexo" (não muda a escultura), "Gerar outra" reaproveita a foto, e depois da prévia vem o carrinho (o pagamento é no WhatsApp, não há checkout).
