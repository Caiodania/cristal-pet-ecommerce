# Arquivo 3D da escultura: plano para ligar o Meshy

**Estado hoje:** o painel do dono já faz todo o fluxo ("Gerar arquivo 3D" com confirmação, andamento, custo, falha, gerar de novo, baixar STL/GLB), mas quem gera o arquivo é um **provedor simulado** (`mock`), que devolve um STL de teste. Falta só o **adaptador do Meshy**: um arquivo que fala com a API deles. Nada mais no sistema muda quando ele entrar.

> Os detalhes da API do Meshy (endereços, campos, formatos de saída, preços) **não foram confirmados**: dependem da documentação e do plano que você vai passar. Este documento descreve o encaixe e o que precisamos; os nomes exatos da API entram quando tivermos a documentação em mãos.

## O caminho do pedido ao arquivo da impressora

```
Cliente aprova a prévia (imagem da escultura, gerada pela IA de imagem)
        │
        ▼
Pedido chega ao painel do dono  ──►  dono confirma o pedido com o cliente (WhatsApp)
        │
        ▼
Dono abre o pedido e clica "Gerar arquivo 3D" (confirma o custo)
        │   POST /api/admin/orders/:id/items/:itemId/model
        ▼
Servidor entrega ao adaptador: a imagem aprovada + a altura final da peça (em mm)
        │   PrintModelProvider.submit({ image, heightMm, options })
        ▼
Adaptador do Meshy cria a tarefa e o painel pergunta o andamento a cada 3 s
        │   PrintModelProvider.poll(jobId) → processing(progress) | succeeded | failed
        ▼
Servidor baixa o STL (e o GLB) do Meshy e guarda no armazenamento privado
        │   (links de provedor expiram: a cópia é nossa)
        ▼
Painel mostra "Baixar STL" e "Baixar GLB" → o dono baixa e leva ao fatiador da impressora
```

Por que só o dono dispara: cada geração **custa dinheiro**. Por isso o botão pede confirmação, não gera para pedido cancelado e "Gerar de novo" avisa que cobra outra vez. O painel soma o **custo de todas as tentativas** de cada escultura. Existe também `MODEL_AUTO` (`never`, `order` ou `confirmed`) para gerar sozinho em algum ponto do pedido; o padrão é `never`.

## O que já existe no código

- **O contrato:** `PrintModelProvider` em [`server/providers/types.ts`](../server/providers/types.ts). O adaptador implementa `submit` (recebe a imagem e a altura em mm, devolve um `jobId` e, se souber, o custo) e `poll` (devolve `processing` com `progress` opcional, `succeeded` com o `stl` e, se houver, o `glb`, ou `failed`).
- **O servidor** (`server/services/model.ts`): cuida de guardar os arquivos, somar o custo, mostrar o andamento, tratar timeout e falha, e impedir geração em pedido cancelado. O adaptador não conhece nada disso.
- **O painel** (`components/admin/OrderDetail.tsx`): tudo o que o dono vê.
- **O registro:** em [`server/providers/index.ts`](../server/providers/index.ts), cada provedor é uma entrada nomeada; escolhe-se com `MODEL_PROVIDER=meshy` quando o adaptador existir.
- **Testes:** `server/__tests__/painel.test.ts` já cobre progresso, custo, falha, gerar de novo e pedido cancelado com o provedor simulado; o adaptador novo ganha testes com um servidor de mentira (sem gastar créditos).

## O que o adaptador do Meshy vai fazer

1. **Criar a tarefa** a partir da imagem aprovada (enviada como arquivo ou por um link temporário assinado do nosso armazenamento, conforme a API aceitar).
2. **Acompanhar** até terminar, repassando o andamento (a barra do painel) e o custo.
3. **Baixar o resultado** e entregar ao servidor o STL (e o GLB para visualização). Se a API só devolver outros formatos (GLB, OBJ…), o adaptador converte para STL.
4. **Preparar para imprimir**, se o resultado do Meshy precisar: malha fechada, base plana, escala pela altura escolhida (`heightMm`). Fica **dentro do adaptador**; o servidor só espera um STL no fim.
5. **Mapear as falhas:** imagem recusada ou sem conseguir virar 3D (`rejected`, o painel mostra o motivo e oferece tentar de novo) e erro do provedor ou da rede (`provider_error`).

## O que eu preciso de você

1. **A chave de API do Meshy**: só em variável de ambiente (`MESHY_API_KEY`, na Netlify e no seu `.env.local`). **Não cole a chave no chat nem em arquivos do projeto.**
2. **O plano** que você vai usar e **quanto custa cada geração** (créditos): com isso o painel mostra o custo certo e definimos o teto de gasto.
3. **A documentação da API** (ou o link) e os formatos de saída que o seu plano libera (STL, GLB…), se há limite de tarefas ao mesmo tempo e o tempo médio de geração.
4. **Duas ou três imagens de escultura aprovadas** (as prévias de pedidos de teste servem) e a **altura real** de cada uma, para afinar escala e base.
5. **A impressora:** resina ou filamento e o volume máximo. Isso decide a espessura mínima das partes finas (orelhas, rabo, patas), o suporte e se vale reforçar a base.

## Limites que vale saber antes de ligar

- **A qualidade do 3D a partir de uma imagem é variável.** O modelo tem de inventar o que a imagem não mostra (as costas, a parte de baixo). Por isso o ideal é a prévia ser de corpo inteiro, bem iluminada e com o pet de frente; o prompt da IA de imagem já favorece isso. Teste com os pets reais antes de prometer prazo ao cliente.
- **O arquivo pode precisar de ajuste no fatiador** (parede fina, buraco na malha, base). O painel mostra o lembrete "Antes de imprimir"; o adaptador cuida do que for automático.
- **Dinheiro:** defina o teto diário de gasto (`PREVIEW_DAILY_BUDGET_CENTS`) e acompanhe o custo por pedido no painel. Comece com **um pedido por vez**.
- **Tempo:** a geração costuma levar minutos. O painel continua perguntando o andamento e o dono pode sair da página; em produção a chamada longa roda numa Background Function da Netlify (veja [`backend.md`](backend.md#como-ligar-uma-ia-de-verdade)).

## Como vamos testar quando a chave chegar

1. Adaptador rodando contra o servidor de mentira (testes automáticos, sem custo).
2. Uma geração real com um pedido de teste, olhando o STL no fatiador sem imprimir.
3. Duas peças impressas de verdade (tamanho pequeno e médio) para ajustar escala, base e espessura.
4. Só então mudar `MODEL_PROVIDER=meshy` na Netlify. A faixa "Modo demonstração" some quando as duas IAs forem reais.
