// Gera os arquivos da marca (AUmor de Patas) a partir do logo original.
//
//   npm run marca
//
// Entrada:  assets/marca/logo-aumor-de-patas.webp   (o logo que o cliente mandou: fundo branco, sem transparência)
// Saídas:   public/images/marca/logo-aumor-de-patas.webp      logo completo, fundo transparente
//           public/images/marca/emblema-aumor-de-patas.webp   só o coração com o cão e o gato (cabeçalho, rodapé)
//           public/images/og.jpg                               imagem de compartilhamento (1200 x 630)
//           app/icon.png, app/apple-icon.png, app/favicon.ico  ícone da aba e do celular
//
// Fundo transparente: o que é quase branco E está ligado à borda da imagem vira transparente (o branco
// de dentro do coração e dos olhos das letras continua, é parte do desenho). A borda é suavizada.
// Troque o logo em assets/marca/ e rode de novo: tudo é refeito.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const SOURCE = "assets/marca/logo-aumor-de-patas.webp";
const OUT = "public/images/marca";
// Onde o coração com os bichos começa e termina no logo original (1254 x 1254): acima do nome.
const EMBLEM = { left: 40, top: 30, width: 1180, height: 812 };
const FADE_FROM = 806; // a partir daqui o recorte some devagar (as patas encostam no nome)

mkdirSync(OUT, { recursive: true });

/** Devolve o logo com canal alfa: fundo branco ligado à borda vira transparente. */
async function withTransparentBackground(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const isBg = new Uint8Array(W * H);
  const stack = [];
  const push = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const k = y * W + x;
    if (isBg[k]) return;
    const i = k * 3;
    if (Math.min(data[i], data[i + 1], data[i + 2]) < 244) return;
    isBg[k] = 1;
    stack.push(k);
  };
  for (let x = 0; x < W; x++) { push(x, 0); push(x, H - 1); }
  for (let y = 0; y < H; y++) { push(0, y); push(W - 1, y); }
  while (stack.length) {
    const k = stack.pop();
    const x = k % W, y = (k / W) | 0;
    push(x + 1, y); push(x - 1, y); push(x, y + 1); push(x, y - 1);
  }
  // distância (em pixels, até 3) de cada pixel ao fundo: só a borda recebe suavização
  const dist = new Uint8Array(W * H).fill(255);
  let ring = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const k = y * W + x;
      if (isBg[k]) { dist[k] = 0; continue; }
      if ((x > 0 && isBg[k - 1]) || (x < W - 1 && isBg[k + 1]) || (y > 0 && isBg[k - W]) || (y < H - 1 && isBg[k + W])) { dist[k] = 1; ring.push(k); }
    }
  }
  for (let d = 1; d < 3; d++) {
    const next = [];
    for (const k of ring) {
      const x = k % W, y = (k / W) | 0;
      for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const nk = ny * W + nx;
        if (isBg[nk] || dist[nk] <= d + 1) continue;
        dist[nk] = d + 1;
        next.push(nk);
      }
    }
    ring = next;
  }
  const out = Buffer.alloc(W * H * 4);
  for (let k = 0; k < W * H; k++) {
    const i = k * 3, o = k * 4;
    let r = data[i], g = data[i + 1], b = data[i + 2], a = 255;
    if (isBg[k]) a = 0;
    else if (dist[k] <= 3) {
      // quanto mais perto de branco, mais transparente; tira o branco da cor para não deixar halo
      const alpha = Math.max(0.25, Math.min(1, (255 - Math.min(r, g, b)) / 40));
      a = Math.round(alpha * 255);
      const un = (c) => Math.max(0, Math.min(255, Math.round((c - (1 - alpha) * 255) / alpha)));
      r = un(r); g = un(g); b = un(b);
    }
    out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = a;
  }
  return sharp(out, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

/** Aplica um esmaecimento vertical no alfa: opaco até `from`, transparente no fim. */
async function fadeBottom(png, from) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  for (let y = from; y < H; y++) {
    const f = 1 - (y - from) / (H - from);
    for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = Math.round(data[(y * W + x) * 4 + 3] * f);
  }
  return sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
}

const full = await withTransparentBackground(SOURCE);

// logo completo (transparente), 520 px de largura (o site mostra até ~260 px: sobra para telas de alta densidade)
await sharp(full).resize({ width: 520 }).webp({ quality: 88, alphaQuality: 100, effort: 6 }).toFile(path.join(OUT, "logo-aumor-de-patas.webp"));

// emblema (coração + cão e gato), 360 px de largura (o cabeçalho mostra ~70 px)
const emblemRaw = await sharp(full).extract(EMBLEM).png().toBuffer();
const emblem = await fadeBottom(emblemRaw, FADE_FROM - EMBLEM.top);
const emblemMeta = await sharp(emblem).metadata();
await sharp(emblem).resize({ width: 360 }).webp({ quality: 90, alphaQuality: 100, effort: 6 }).toFile(path.join(OUT, "emblema-aumor-de-patas.webp"));

// ícones: o emblema centrado num quadrado (com folga)
const square = async (size, background, pad = 0.08) => {
  const inner = Math.round(size * (1 - pad * 2));
  const art = await sharp(emblem).resize({ width: inner, height: inner, fit: "inside" }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background } }).composite([{ input: art, gravity: "centre" }]).png().toBuffer();
};
writeFileSync("app/icon.png", await sharp(await square(192, { r: 0, g: 0, b: 0, alpha: 0 }, 0.04)).png({ compressionLevel: 9, palette: true, quality: 90 }).toBuffer());
writeFileSync("app/apple-icon.png", await square(180, { r: 255, g: 255, b: 255, alpha: 1 }, 0.1));

// favicon.ico: um .ico pode guardar PNGs (16, 32 e 48 px)
const icoSizes = [16, 32, 48];
const pngs = await Promise.all(icoSizes.map((s) => square(s, { r: 0, g: 0, b: 0, alpha: 0 }, 0.02)));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
let offset = 6 + 16 * pngs.length;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(icoSizes[i], 0); e.writeUInt8(icoSizes[i], 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(png.length, 8); e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});
writeFileSync("app/favicon.ico", Buffer.concat([header, ...entries, ...pngs]));

// imagem de compartilhamento (WhatsApp, Instagram, Google): logo sobre branco, 1200 x 630
const ogLogo = await sharp(full).resize({ height: 560 }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: { r: 255, g: 255, b: 255 } } })
  .composite([{ input: ogLogo, gravity: "centre" }])
  .jpeg({ quality: 86, mozjpeg: true })
  .toFile("public/images/og.jpg");

console.log(`Marca pronta: emblema ${emblemMeta.width}x${emblemMeta.height} (proporção ${(emblemMeta.width / emblemMeta.height).toFixed(3)}).`);
console.log(`Arquivos em ${OUT}, app/icon.png, app/apple-icon.png, app/favicon.ico e public/images/og.jpg.`);
