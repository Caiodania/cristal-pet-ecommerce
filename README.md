# Cristal Pet Móvel — site e loja

Novo site da Cristal Pet Móvel (Indaiatuba-SP): banho e tosa móvel e, na fase 2,
escultura 3D do pet gerada a partir da foto do cliente. A estrutura segue o
ritmo do site de referência Nobre Pata; o conteúdo, a marca e as imagens são da
Cristal Pet. Detalhes em [`docs/`](docs/).

**Stack:** Next.js (App Router) + TypeScript + Tailwind v4, export estático
(`out/`) publicado na Netlify.

## Comandos

```bash
npm install
npm run dev        # desenvolvimento
npm run build      # gera o site estático em out/
npm run lint
npm run typecheck
```

## Estrutura

| Pasta | O que tem |
|---|---|
| `app/` | rotas (`/`, `/esculturas`, `/banho-e-tosa`, `/franquias`, `/contato` e 4 páginas legais) e `globals.css`, onde ficam os **tokens de design** (`@theme`) |
| `app/styleguide/` | página de trabalho para validar tokens e componentes. Fora do Google; **remover antes do lançamento** |
| `components/ui/` | base: Button, Section, Card, Accordion, Lightbox, WhatsAppFloat, Carousel, InstagramFacade, Placeholder, CtaButtons |
| `components/layout/` | cabeçalho, menu do celular (popover), barra de abas inferior, rodapé |
| `components/sections/` | as seções das páginas (hero, galeria, filhotes, FAQ…), reaproveitadas entre rotas |
| `content/` | textos e dados (`site.ts`, `banho-e-tosa.ts`, `estatua.ts`, `faq.ts`, `instagram.ts`, `images.ts`, `gallery.ts`): trocar conteúdo não exige mexer em componentes |
| `lib/` | utilitários (WhatsApp, contraste, URL do site) |
| `scripts/` | pós-build do export estático |
| `public/images/` | imagens com nomes descritivos |
| `docs/` | análise do Nobre Pata, mapa de equivalência, **modelo do sistema da loja** (fluxo, dados, API, roadmap), [pendências do cliente](docs/pendencias.md) e prints de referência |

## Convenções

- **Cores:** o teal `#4BC0AF` só em preenchimentos, ícones e faixas; para texto
  use `teal-deep`. O contraste de cada par está na página `/styleguide`.
- **Pendências:** `TODO-CLIENTE` (informação que falta) e `TODO-FOTO` (foto que falta).
  A lista completa está em [`docs/pendencias.md`](docs/pendencias.md). No HTML, cada
  espaço reservado leva `data-todo`; antes do lançamento nenhum pode restar.
- **Chave da loja:** `site.store.enabled` em `content/site.ts`. Com `false`, os botões
  "Criar minha escultura" abrem o WhatsApp com a mensagem pronta (a loja ainda não
  existe); com `true`, levam a `/personalizar` e a barra de abas ganha Pedidos e Carrinho.
- **Pós-build:** `scripts/fix-segment-files.mjs` roda sozinho depois do `npm run build`.
  O Next 16 grava os arquivos de pré-carregamento em pasta, mas o navegador pede com
  pontos no nome; sem o script, cada link gera um 404 no console em host estático.
- **Domínio:** não fica fixo no código. Vem de `NEXT_PUBLIC_SITE_URL` ou, na
  Netlify, da variável `URL` (ver `next.config.ts` e `.env.example`).
- **Export estático:** sem Route Handlers de servidor nem Server Actions. O que
  for dinâmico (upload, geração 3D, pedidos) vai para Netlify Functions e/ou Supabase.
