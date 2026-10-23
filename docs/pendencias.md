# Pendências: informações, fotos e contas que faltam

Tudo o que depende do cliente está marcado no código. Para achar:

```bash
grep -rn "TODO-" --include=*.ts --include=*.tsx app components content lib server
```

No site gerado, cada espaço reservado leva `data-todo="…"` no HTML e aparece para o visitante como **"Em breve"** (foto) ou **"A definir"** (dado). Antes do lançamento, `grep -rn 'data-todo' out/` tem de voltar vazio.

## Contas e chaves (para ligar o que já está pronto)

- **Supabase:** projeto, as duas migrations (`0001` e `0002`) e as três chaves (URL, anon e service_role). Roteiro e verificação em [`backend.md`](backend.md#ligar-o-supabase).
- **Login dos clientes (Supabase Auth):** ligar "Confirm email", cadastrar o endereço da loja e as páginas `/confirmar` e `/redefinir-senha` nas *Redirect URLs*, e configurar um **SMTP próprio** (Resend, Brevo, SES…): sem ele os e-mails de confirmação caem no spam e travam em poucos cadastros por hora. Passo a passo em [`backend.md`](backend.md#contas-e-login).
- **Login com Google (opcional):** criar o *OAuth client* no Google Cloud, colar no Supabase e definir `AUTH_GOOGLE=1`.
- **Netlify:** site, variáveis de ambiente e domínio.
- **IA de imagem** (foto → escultura) e **IA 3D** (imagem → STL): escolher fornecedor, chave de API e **teto de gasto diário**. Roteiro em [`backend.md`](backend.md#como-ligar-uma-ia-de-verdade).
- **Cloudflare Turnstile** (gratuito): chaves de site e secreta. Recomendado em produção: protege o cadastro (onde se criam contas em massa para ganhar prévias).

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
- **Quantas prévias por conta** (hoje 3, em `content/estatua.ts`) e quando liberar extras (por exemplo, a quem já fez um pedido).
- **Exclusão de conta (LGPD):** como atender o pedido de um cliente (hoje é manual, no painel do Supabase). Decidir se vale construir o autoatendimento em "Minha conta" (excluir a conta, apagar fotos e imagens).

**Loja**
- Nome comercial da loja de esculturas e logo próprio (hoje é o logo da Cristal Pet Móvel).
- CNPJ, razão social e endereço (rodapé).
- Endereço do site institucional da Cristal Pet (para o rodapé apontar).
- Link da página comercial do Facebook (o atual parece perfil pessoal).
- Domínio final (`NEXT_PUBLIC_SITE_URL`).
- Textos das 4 páginas legais (privacidade, termos, trocas, entrega), com revisão jurídica. Hoje têm só o roteiro e estão `noindex`. **Agora a privacidade e os termos precisam falar de conta** (e-mail, senha guardada pelo Supabase, foto ligada à conta, o limite de prévias).

**Textos novos a aprovar** (escritos por mim, só com o que já se sabe)
- H1 da vitrine, os três benefícios e o FAQ.

## TODO-FOTO (imagens)

- **Esculturas de exemplo** (hero + carrossel): o hero já usa a escultura da Mel; o carrossel completa com "Em breve" (foto do pet) onde falta.
  Para preencher: gerar as imagens com os prompts de [`docs/prompts-esculturas.md`](prompts-esculturas.md),
  salvar em `public/images/esculturas/_originais/<id>.png` e rodar `npm run esculturas`
  (mínimo 5, ideal 9; o hero usa a Mel). Com autorização dos tutores: os nomes, exceto Mel e Kobe, são de demonstração.
- **Imagens das opções do configurador** (cor, tipo, exemplo do nome): hoje são provisórias, derivadas da escultura da Mel (cores recoloridas por computador). Falta `tipo-na-pose`. Para trocar por reais, veja o fim de [`prompts-esculturas.md`](prompts-esculturas.md).
- Logo em alta resolução; imagem de compartilhamento (OG) e favicon.
