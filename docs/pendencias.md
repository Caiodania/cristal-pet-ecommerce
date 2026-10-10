# Pendências: informações e fotos que faltam

Tudo o que depende do cliente está marcado no código. Para achar:

```bash
grep -rn "TODO-" --include=*.ts --include=*.tsx app components content lib
```

No site gerado, cada espaço reservado leva `data-todo="…"` no HTML e aparece para o visitante como **"Em breve"** (foto) ou **"A definir"** (dado). Antes do lançamento, `grep -rn 'data-todo' out/` tem de voltar vazio.

## TODO-CLIENTE (informação)

**Escultura** (`content/estatua.ts`, tudo provisório até o dono passar)
- Impressora: volume máximo de impressão e tipo (resina ou filamento); isso limita os tamanhos.
- Tamanhos em centímetros e preço de cada um; parcelamento, se houver.
- Tipos de escultura que a impressora consegue (hoje provisórios: corpo inteiro, sentado, busto) e acréscimo de preço de cada um.
- Cores e acabamentos do material.
- Plaquinha com o nome do pet: existe?
- Prazo de produção; oferta para a 2ª peça, se houver.
- Entrega: a entrega local pela equipe nas 4 cidades é oferecida? Como é o envio para outras cidades?
- Garantia e regras de troca (produto sob medida: revisão jurídica).
- Por quanto tempo guardar as fotos dos clientes.

**Banho e tosa**
- Preço dos serviços ("a partir de R$"); os cards já comportam a linha.
- **Terceiro prêmio:** o inventário diz "3º ano consecutivo" de melhor banho e tosa de Indaiatuba, mas há certificados IPOPE só de 2024 (Pet Shop) e 2025 (Pet Móvel). Enquanto não for confirmado, o site cita só os dois certificados.

**Institucional**
- CNPJ e razão social (rodapé).
- Link da página comercial do Facebook (o atual parece perfil pessoal).
- Domínio final (`NEXT_PUBLIC_SITE_URL`).
- Textos das 4 páginas legais (privacidade, termos, trocas, entrega), com revisão jurídica. Hoje têm só o roteiro e estão `noindex`.
- Legendas dos 2 vídeos da franquia, se tiverem fala.

**Textos novos a aprovar** (escritos por mim, a partir do que já se sabe)
- H1 da home e da página de esculturas; manifesto "Feita por quem convive com o seu pet"; os 3 cards de "Qualidade Cristal Pet"; o FAQ da escultura.

## TODO-FOTO (imagens)

- **Esculturas:** 4 exemplos para o carrossel da home; 3 pares "foto do pet → escultura" (com autorização do tutor); 1 foto por tipo de escultura; a imagem da prévia 3D do hero.
- Comparativo dos 3 tamanhos ao lado de uma mão.
- Fotos do lado de fora da unidade móvel (hoje só o interior).
- Miniatura de cada um dos 7 vídeos do Instagram (hoje a fachada não tem capa).
- ~12 fotos da galeria que ainda serão trocadas (mantendo o nome do arquivo).
- Logo em alta resolução; imagem de compartilhamento (OG) e favicon (etapa 4).
