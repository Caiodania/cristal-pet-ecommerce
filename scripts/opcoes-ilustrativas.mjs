// Gera imagens ILUSTRATIVAS provisórias das opções (cores e tipos) a partir da
// escultura da Mel, para o cliente ter uma noção de cada escolha enquanto as
// imagens de verdade não existem.
//
//   node scripts/opcoes-ilustrativas.mjs     (depois: npm run esculturas)
//
// O que faz:
//   cor-branco   a própria foto da Mel (resina branca)
//   cor-<outra>  a mesma foto recolorida: a luminosidade (luz e sombra) é mantida
//                e mapeada para a paleta da cor. É uma SIMULAÇÃO, não uma peça real.
//   tipo-sentado a foto da Mel inteira
//   tipo-busto   recorte da cabeça e do peito da Mel
//
// Para trocar por imagens de verdade: gere as imagens (veja
// docs/prompts-esculturas.md), salve com o MESMO nome em
// public/images/opcoes/_originais/ e rode `npm run esculturas`.
import { mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";

const source = "public/images/esculturas/_originais/mel.jpg";
const outDir = "public/images/opcoes/_originais";
if (!existsSync(source)) {
  console.error(`Falta ${source}. Salve a imagem da escultura da Mel nesse caminho.`);
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

// Paleta de cada cor: sombra, meio-tom e luz (RGB). A luminosidade da foto
// escolhe o ponto da rampa, então os detalhes do pelo continuam aparecendo.
const palettes = {
  bege: [[74, 52, 30], [206, 172, 128], [255, 240, 214]],
  cinza: [[22, 23, 26], [128, 130, 134], [226, 228, 230]],
  preto: [[6, 6, 8], [44, 44, 48], [142, 142, 148]],
  marrom: [[36, 18, 8], [138, 82, 46], [226, 168, 118]],
};

const lerp = (a, b, t) => a + (b - a) * t;
const ramp = ([dark, mid, light], l) => {
  const [from, to, t] = l < 0.5 ? [dark, mid, l / 0.5] : [mid, light, (l - 0.5) / 0.5];
  return [lerp(from[0], to[0], t), lerp(from[1], to[1], t), lerp(from[2], to[2], t)];
};

const { data, info } = await sharp(source).removeAlpha().raw().toBuffer({ resolveWithObject: true });

async function save(name, pipeline) {
  await pipeline.resize(800, 1000, { fit: "cover" }).jpeg({ quality: 92 }).toFile(`${outDir}/${name}.jpg`);
  console.log(`OK   ${name}.jpg`);
}

// cores
await save("cor-branco", sharp(source));
for (const [id, palette] of Object.entries(palettes)) {
  const out = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i += 3) {
    // o branco da foto (resina) é a luz máxima; o resto da cena segue junto
    const l = Math.min(1, (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 235);
    const [r, g, b] = ramp(palette, l);
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
  }
  await save(`cor-${id}`, sharp(out, { raw: { width: info.width, height: info.height, channels: 3 } }));
}

// tipos
await save("tipo-sentado", sharp(source));
// busto: cabeça e peito (4:5), cortando antes das patas
await save(
  "tipo-busto",
  sharp(source).extract({ left: 300, top: 230, width: 1000, height: 1250 }),
);

// nome em relevo: recorte real da base da Mel (patas e letras), para o passo do nome
await save("nome-exemplo", sharp(source).extract({ left: 640, top: 1200, width: 640, height: 800 }));
