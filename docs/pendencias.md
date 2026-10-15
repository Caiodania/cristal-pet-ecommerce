# Pendências: informações, fotos e contas que faltam

Tudo o que depende do cliente está marcado no código. Para achar:

```bash
grep -rn "TODO-" --include=*.ts --include=*.tsx app components content lib server
```

No site gerado, cada espaço reservado leva `data-todo="…"` no HTML e aparece para o visitante como **"Em breve"** (foto) ou **"A definir"** (dado). Antes do lançamento, `grep -rn 'data-todo' out/` tem de voltar vazio.

## Contas e chaves (para ligar o que já está pronto)

- **Supabase:** projeto, migration e as duas chaves. Roteiro e verificação em [`backend.md`](backend.md#ligar-o-supabase).
- **Netlify:** site, variáveis de ambiente e domínio.
- **IA de imagem** (foto → escultura) e **IA 3D** (imagem → STL): escolher fornecedor, chave de API e **teto de gasto diário**. Roteiro em [`backend.md`](backend.md#como-ligar-uma-ia-de-verdade).
- **Cloudflare Turnstile** (opcional, gratuito): chaves de site e secreta.

## TODO-CLIENTE (informação)

**Produto** (`content/estatua.ts`, tudo provisório até o dono passar)
- Impressora: volume máximo e tipo (resina ou filamento); isso limita os tamanhos.
- Tamanhos em centímetros e **preço** de cada um; parcelamento, se houver.
- Tipos de escultura que a impressora consegue (hoje provisórios: corpo inteiro, sentado, busto) e acréscimo de preço de cada um.
- **Cores** reais do material (hoje provisórias: branco, cinza, preto).
- Plaquinha com o nome do pet: existe?
- Prazo de produção; oferta para a 2ª peça, se houver.
- Entrega local e envio; garantia e regras de troca (produto sob medida: revisão jurídica).
- Por quanto tempo guardar as fotos dos clientes (e agendar a limpeza dos arquivos expirados).

**Loja**
- Nome comercial da loja de esculturas e logo próprio (hoje é o logo da Cristal Pet Móvel).
- CNPJ, razão social e endereço (rodapé).
- Endereço do site institucional da Cristal Pet (para o rodapé apontar).
- Link da página comercial do Facebook (o atual parece perfil pessoal).
- Domínio final (`NEXT_PUBLIC_SITE_URL`).
- Textos das 4 páginas legais (privacidade, termos, trocas, entrega), com revisão jurídica. Hoje têm só o roteiro e estão `noindex`.

**Textos novos a aprovar** (escritos por mim, só com o que já se sabe)
- H1 da vitrine, os três benefícios e o FAQ.

## TODO-FOTO (imagens)

- 4 esculturas para o carrossel de exemplos, com autorização do tutor.
- A imagem da prévia/escultura do hero (hoje um espaço reservado).
- Fotos de esculturas por tipo e cor, se forem aparecer na vitrine.
- Logo em alta resolução; imagem de compartilhamento (OG) e favicon.
