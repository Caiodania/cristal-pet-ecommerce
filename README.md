# AUmor de Patas · Esculturas Pet

Loja de **esculturas 3D de pets**: o cliente envia a foto, vê a prévia e pede; a escultura é impressa em 3D pelo dono; pagamento e entrega são combinados pelo **WhatsApp**. O visitante navega sem conta; para **gerar a prévia** é preciso criar uma conta grátis (cada conta tem 3 prévias, o que limita o gasto com a IA). Tem **painel do dono** para tocar os pedidos e baixar o arquivo de impressão.

É um projeto **comercial** (loja). A marca é a **AUmor de Patas** (logo e paleta enviados pelo cliente: azul marinho, prata e branco). O que é institucional da Cristal Pet (banho e tosa móvel) fica no outro site.

**Stack:** Next.js (App Router) + TypeScript + Tailwind v4, export estático (`out/`) publicado na **Netlify**; uma **Netlify Function** para a API; **Supabase** (Postgres + Storage) em produção; dois **provedores de IA** plugáveis (hoje simulados).

## Começar

```bash
npm install
npm run build
ADMIN_EMAILS=voce@exemplo.com npm run dev:full     # http://localhost:8888 (loja); o painel só aparece na conta com esse e-mail
```

Sem mais configuração: dados em memória e IA simulada ("modo demonstração"). Dá para percorrer a loja inteira.

| Comando | O que faz |
|---|---|
| `npm run build` | gera o site estático em `out/` |
| `npm run dev:full` | serve o site + a API juntos, como a Netlify |
| `npm run dev` | só o site, com recarga instantânea (a API precisa estar no `dev:full`; veja `docs/backend.md`) |
| `npm test` | testes do servidor |
| `npm run test:e2e` | teste de ponta a ponta em Chrome real (veja o cabeçalho do arquivo) |
| `npm run marca` | refaz os arquivos da marca (logo sem fundo, emblema, ícone da aba, imagem de compartilhamento) a partir de `assets/marca/logo-aumor-de-patas.webp` |
| `npm run check:supabase` | verifica a ligação com o **seu** Supabase |
| `npm run lint` · `npm run typecheck` | verificações de código |

## Onde está o quê

| Pasta | O que tem |
|---|---|
| `app/(loja)/` | páginas públicas: vitrine, personalizar, carrinho, pedidos, contato, políticas |
| `app/admin/` | painel do dono (login, lista, detalhe do pedido, contas e prévias extras) |
| `components/conta/` | login do cliente: formulários, diálogo "Entrar / Criar conta", menu "Minha conta", páginas da conta |
| `app/globals.css` | **tokens de design** (`@theme`) |
| `components/ui/` | base: Button, Section, Card, Accordion, Carousel, Lightbox, Field, Status… |
| `components/layout/` | cabeçalho, menu do celular, barra de abas, rodapé |
| `components/sections/` | seções da vitrine |
| `components/store/` | configurador, carrinho, pedidos |
| `components/admin/` | painel do dono |
| `content/` | textos e dados: `site.ts`, `estatua.ts` (**catálogo**), `faq.ts`, `images.ts`, `exemplos.ts` + `esculturas-disponiveis.json` (**vitrine de esculturas**) |
| `lib/loja/` | tipos compartilhados, estimativa de preço, API do navegador, carrinho |
| `server/` | a API: `router.ts`, `services/`, `store/` (memória e Supabase), `storage/`, **`accounts/` (o login: Supabase Auth ou memória)**, **`providers/` (as IAs)** |
| `netlify/functions/api.ts` | entrada da função na Netlify |
| `supabase/migrations/` | esquema do banco: `0001_init.sql` (prévias e pedidos) e `0002_contas.sql` (contas, sessões, cota). Validadas com `npm run test:sql` |
| `scripts/` | servidor local, verificação do Supabase, pós-build, `esculturas.mjs` (imagens da vitrine) |
| `tests/` | teste de ponta a ponta e fotos de teste |
| `public/_headers` | cabeçalhos de segurança (CSP) e cache |
| `docs/` | **leia nesta ordem:** `modelo-do-sistema.md` → `backend.md` → `pendencias.md`; para ligar o banco na Netlify: `guia-supabase-netlify.md` |

## Convenções

- **Preço e catálogo** em `content/estatua.ts`. `null` = "a definir": o total aparece como "A combinar". O servidor recalcula o preço; nada que o navegador mande vale.
- **Pendências:** `TODO-CLIENTE` (informação) e `TODO-FOTO` (imagem). No HTML, cada espaço reservado leva `data-todo`; antes do lançamento nenhum pode restar. Lista em [`docs/pendencias.md`](docs/pendencias.md).
- **IA:** só se mexe em `server/providers/`. Passo a passo em [`docs/backend.md`](docs/backend.md#como-ligar-uma-ia-de-verdade).
- **Identidade (AUmor de Patas):** azul marinho `#0B2347`, prata `#C9CFDB` e branco; Nunito nos títulos (peso 800). Faixas prata e azul marinho separadas por ondas (`wave` em `Section`), destaque do título com `<Accent>`, páginas internas abrem com `PageHeader`. Peças decorativas em `components/ui/decor.tsx`. O logo do cliente fica em `assets/marca/`; `npm run marca` gera dele o emblema do cabeçalho, o logo sem fundo do rodapé, o ícone da aba e a imagem de compartilhamento. Nome, frase e contato em `content/site.ts`.
- **Movimento e interação da vitrine:** comparador foto → escultura no hero (`components/ui/CompareSlider.tsx`), faixa que rola (`Marquee`), "Monte a sua" com prévia ao vivo (`components/store/Playground.tsx`, que leva as escolhas ao configurador por `?tamanho=&tipo=&cor=`), entrada por rolagem (`.reveal`) e barra de leitura no topo. Tudo é enfeite: sem suporte ou com "reduzir movimento" a página fica parada e completa. Classes de animação em `app/globals.css`.
- **Configurador ilustrado:** cada opção (tipo, cor) mostra uma imagem de `public/images/opcoes/` (`content/opcoes.ts`) ou, se ainda não existe, a ilustração SVG de `lib/loja/ilustracao.ts` (a mesma que o servidor usa na prévia do modo demonstração). Prévia ao vivo com o nome em relevo no resumo e no passo do nome.
- **Prompt da prévia:** `server/providers/prompts.ts` monta o texto a partir das escolhas do cliente e envia a escultura da Mel como referência de estilo. Veja [`docs/backend.md`](docs/backend.md#como-a-prévia-sai-no-padrão-da-loja-e-no-que-o-cliente-escolheu).
- **Cores:** os tokens estão em `app/globals.css` (`navy`, `silver`, `snow`, `pearl`, `ink`…). O prata puro só entra em faixas, preenchimentos e ícones, nunca como texto (1,6:1 sobre o branco); texto vai em `navy` ou `ink`. Na faixa prata o destaque do título vira etiqueta marinho com texto branco (`Accent`). O contraste de cada par está em `/styleguide` (página de trabalho, **remover antes do lançamento**) e o `npm run test:e2e` mede o contraste de cada tela.
- **Export estático:** sem Route Handlers nem Server Actions do Next. O dinâmico vive na Netlify Function. Páginas de pedido usam query string.
- **Pós-build:** `scripts/fix-segment-files.mjs` roda sozinho; sem ele o Next 16 gera 404 de pré-carregamento em host estático. `scripts/limpar-originais.mjs` tira de `out/` as pastas `_originais` (imagens-fonte em alta resolução das esculturas): o site só usa os .webp gerados por `npm run esculturas`.
- **Domínio:** nunca fixo no código: `NEXT_PUBLIC_SITE_URL` ou a variável `URL` da Netlify.
