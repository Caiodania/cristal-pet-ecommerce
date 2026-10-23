# Prompts para gerar as esculturas de exemplo

Objetivo: uma imagem de **escultura em resina branca, sobre uma base com o nome do pet**, para cada cachorro da vitrine, no estilo das referências (peça off-white fosca, base hexagonal baixa com o nome em relevo, cena de casa com luz suave).

## Como usar

1. Abra o Gemini (ou o AI Studio) com o **modelo de imagem** (Nano Banana). Anexe a **foto do cachorro** (as fotos estão em `public/images/exemplos/<id>.webp`) e, se o modelo aceitar, **uma das imagens de referência** de escultura (anexe 1 ou 2 só para o estilo).
2. Cole o **prompt base** abaixo e acrescente a linha do cachorro e a cena da tabela.
3. Gere em formato vertical (4:5 ou 3:4). Escolha o resultado mais fiel ao cachorro.
4. Salve em `public/images/esculturas/_originais/<id>.png` (o nome do arquivo é o **id**: `mel.png`, `duque.png`…).
5. Rode `npm run esculturas`. Pronto: o site passa a mostrar a escultura no lugar do espaço reservado.

Dica: confira sempre **orelhas, focinho, cauda e o comprimento do pelo**. É onde a IA mais erra. Se errar, gere de novo ou peça "keep the exact same ears and muzzle shape as the photo".

## Prompt base (inglês: costuma render melhor)

```
Using the attached photo of the dog, create a premium product photograph of a
hand-finished sculpture of this exact dog, cast in matte off-white resin (warm
cream white, subtly porcelain-like), all one single color. Preserve the dog's
real proportions, face, ears, muzzle, tail and coat length, with the fur
sculpted in fine detail as carved relief. Remove any accessories (no bow, no
hat, no bandana, no collar): only the dog. The sculpture sits centered on a low
hexagonal plinth in the same off-white resin, with the name "{NOME}" in
embossed capital letters on the front face of the plinth. {CENA} Soft natural
window light, shallow depth of field, realistic materials, elegant and calm
mood. Vertical 4:5 composition, the sculpture fills about 60% of the frame.
No people, no text other than the name on the plinth, no watermark.
```

## Cada cachorro

Troque `{NOME}` e `{CENA}` no prompt base e acrescente a descrição como primeira frase ("The dog is …").

| id | Nome na base | Descrição do cachorro | Cena (`{CENA}`) |
|---|---|---|---|
| `mel` | MEL | cream pomeranian, sitting, fluffy double coat, pointed ears, smiling | On a travertine console table under a round mirror with a gold frame, a vase of dried pampas grass beside it. |
| `duque` | DUQUE | golden cocker spaniel, sitting, long feathered ears, wavy coat | On a white floating shelf against a light plaster wall, a green plant leaf out of focus beside it. |
| `sol` | SOL | golden retriever, sitting, medium-long coat, gentle face | On a living-room sideboard with a few white ceramic vases blurred in the background. |
| `bela` | BELA | white shih tzu, sitting, long coat with a topknot, round face, flat muzzle | On a light wooden table next to a window, soft linen curtain in the background. |
| `bob` | BOB | caramel and white mixed-breed dog, sitting, short coat, floppy ears, pointed muzzle | On a simple natural wood table, plain warm-gray wall in the background. |
| `nina` | NINA | white pomeranian, sitting, very fluffy coat, small pointed ears | On a white shelf in a bright minimalist room, a small plant blurred beside it. |
| `kobe` | KOBE | cream pomeranian, lying down with front paws stretched forward, fluffy coat | On a travertine coffee table, soft daylight from a window on the left. |
| `neve` | NEVE | long-haired white dog (maltese type), sitting, silky long coat falling to the sides | On a pale oak console table, an out-of-focus mirror and dried flowers behind. |
| `pipoca` | PIPOCA | golden retriever puppy, sitting, round head, soft puppy fur, floppy ears | On a wooden shelf in a cozy bright room, plant leaves blurred in the background. |

## Observações

- **Fidelidade vem da foto.** O modelo não "sabe" quem é o cachorro: ele copia da foto anexada. Fotos nítidas, de corpo inteiro e bem iluminadas dão esculturas melhores (as mesmas dicas que o site dá ao cliente).
- **O que a imagem não é:** é uma prévia de marketing, não o arquivo de impressão. A escultura real sai do fluxo da loja (prévia aprovada → Meshy → STL → impressora).
- **Autorização:** as fotos são de pets atendidos pela Cristal Pet. Antes de publicar, confirme com os tutores o uso da foto e do nome do pet na vitrine. Os nomes, exceto Mel e Kobe, são de exemplo: troque em `content/exemplos.ts` (e no prompt) pelos reais.
- **Quantas?** O mínimo é 5 (o hero usa a primeira, o carrossel mostra as demais). Com as 9, a vitrine fica completa.
- **Pelo próprio sistema:** quando o adaptador do Gemini estiver ligado na loja (`server/providers/`), este mesmo prompt vira o `prompts.ts` da prévia do cliente.

## Imagens das opções do configurador (cor, tipo, nome)

O configurador mostra uma imagem em cada opção, para o cliente ter noção do que está pedindo. Elas ficam em `public/images/opcoes/_originais/` e o `npm run esculturas` converte para o site (640 x 800, WebP).

| Arquivo | Onde aparece | O que mostra |
|---|---|---|
| `tipo-sentado` | passo "Tipo" | escultura sentada, corpo inteiro |
| `tipo-busto` | passo "Tipo" | só cabeça e peito, na base |
| `tipo-na-pose` | passo "Tipo" | uma pose que não é sentada (deitado, em pé), para mostrar que a foto manda |
| `cor-branco`, `cor-bege`, `cor-cinza`, `cor-preto`, `cor-marrom` | passo "Cor" | **a mesma escultura e a mesma cena**, só mudando a cor do material |
| `nome-exemplo` | passo "Nome" | close da base com o nome em alto-relevo |

**Hoje são provisórias.** `node scripts/opcoes-ilustrativas.mjs` gera `tipo-sentado`, `tipo-busto`, `nome-exemplo` e as cinco cores a partir da escultura da Mel (as cores são recoloridas por computador: simulam o tom, não são peças reais). Falta o `tipo-na-pose`: enquanto não existe, o cartão mostra uma ilustração.

**Para trocar por imagens de verdade:** gere no Gemini com a escultura da Mel anexada como referência de estilo, salve com o **mesmo nome** e rode `npm run esculturas`. Para as cores ficarem comparáveis, use o mesmo cachorro e a mesma cena nas cinco; só troque a cor no prompt:

```
Using the attached sculpture only as a style reference (material finish,
octagonal plinth, soft interior light, camera angle), create a product
photograph of a hand-finished sculpture of a golden retriever, sitting, in
uniform matte {COR} resin, on a low octagonal plinth of the same color, in a
bright out-of-focus living room. Vertical 4:5. No text, no people, no watermark.
```

`{COR}`: `warm ivory white`, `warm sand beige`, `matte slate gray`, `deep matte black`, `earthy cocoa brown` (as mesmas descrições que a IA da prévia usa: `PROMPT_COLORS` em `server/providers/prompts.ts`). Para o busto, troque "sitting" por "bust: head, neck and upper chest only, resting on the plinth". Para `tipo-na-pose`, "lying down with front paws forward". Para `nome-exemplo`, "close-up of the plinth's front face with the word NOME in raised embossed serif capitals, a paw visible above".
