# Cristal Pet Esculturas

Loja de **esculturas 3D de pets**: o cliente envia a foto, vê a prévia e pede; a escultura é impressa em 3D pelo dono; pagamento e entrega são combinados pelo **WhatsApp**. Sem login de cliente. Tem **painel do dono** para tocar os pedidos e baixar o arquivo de impressão.

É um projeto **comercial** (loja). O que é institucional da Cristal Pet (banho e tosa móvel) fica no outro site.

**Stack:** Next.js (App Router) + TypeScript + Tailwind v4, export estático (`out/`) publicado na **Netlify**; uma **Netlify Function** para a API; **Supabase** (Postgres + Storage) em produção; dois **provedores de IA** plugáveis (hoje simulados).

## Começar

```bash
npm install
npm run build
ADMIN_PASSWORD=uma-senha npm run dev:full     # http://localhost:8888  (loja)  /admin  (painel)
```

Sem mais configuração: dados em memória e IA simulada ("modo demonstração"). Dá para percorrer a loja inteira.

| Comando | O que faz |
|---|---|
| `npm run build` | gera o site estático em `out/` |
| `npm run dev:full` | serve o site + a API juntos, como a Netlify |
| `npm run dev` | só o site, com recarga instantânea (a API precisa estar no `dev:full`; veja `docs/backend.md`) |
| `npm test` | testes do servidor |
| `npm run test:e2e` | teste de ponta a ponta em Chrome real (veja o cabeçalho do arquivo) |
| `npm run check:supabase` | verifica a ligação com o **seu** Supabase |
| `npm run lint` · `npm run typecheck` | verificações de código |

## Onde está o quê

| Pasta | O que tem |
|---|---|
| `app/(loja)/` | páginas públicas: vitrine, personalizar, carrinho, pedidos, contato, políticas |
| `app/admin/` | painel do dono (login, lista, detalhe do pedido) |
| `app/globals.css` | **tokens de design** (`@theme`) |
| `components/ui/` | base: Button, Section, Card, Accordion, Carousel, Lightbox, Field, Status… |
| `components/layout/` | cabeçalho, menu do celular, barra de abas, rodapé |
| `components/sections/` | seções da vitrine |
| `components/store/` | configurador, carrinho, pedidos |
| `components/admin/` | painel do dono |
| `content/` | textos e dados: `site.ts`, `estatua.ts` (**catálogo**), `faq.ts`, `images.ts` |
| `lib/loja/` | tipos compartilhados, estimativa de preço, API do navegador, carrinho |
| `server/` | a API: `router.ts`, `services/`, `store/` (memória e Supabase), `storage/`, **`providers/` (as IAs)** |
| `netlify/functions/api.ts` | entrada da função na Netlify |
| `supabase/migrations/` | esquema do banco |
| `scripts/` | servidor local, verificação do Supabase, pós-build |
| `tests/` | teste de ponta a ponta e fotos de teste |
| `public/_headers` | cabeçalhos de segurança (CSP) e cache |
| `docs/` | **leia nesta ordem:** `modelo-do-sistema.md` → `backend.md` → `pendencias.md` |

## Convenções

- **Preço e catálogo** em `content/estatua.ts`. `null` = "a definir": o total aparece como "A combinar". O servidor recalcula o preço; nada que o navegador mande vale.
- **Pendências:** `TODO-CLIENTE` (informação) e `TODO-FOTO` (imagem). No HTML, cada espaço reservado leva `data-todo`; antes do lançamento nenhum pode restar. Lista em [`docs/pendencias.md`](docs/pendencias.md).
- **IA:** só se mexe em `server/providers/`. Passo a passo em [`docs/backend.md`](docs/backend.md#como-ligar-uma-ia-de-verdade).
- **Cores:** o teal `#4BC0AF` só em preenchimentos, ícones e faixas; para texto use `teal-deep`. O contraste de cada par está em `/styleguide` (página de trabalho, **remover antes do lançamento**).
- **Export estático:** sem Route Handlers nem Server Actions do Next. O dinâmico vive na Netlify Function. Páginas de pedido usam query string.
- **Pós-build:** `scripts/fix-segment-files.mjs` roda sozinho; sem ele o Next 16 gera 404 de pré-carregamento em host estático.
- **Domínio:** nunca fixo no código: `NEXT_PUBLIC_SITE_URL` ou a variável `URL` da Netlify.
