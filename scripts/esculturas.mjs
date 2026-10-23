// Prepara as imagens da vitrine e do configurador.
//
//   npm run esculturas
//
// Duas pastas de entrada (png, jpg ou webp; o nome do arquivo é o id):
//
//   public/images/esculturas/_originais/<id-do-pet>.png      mel.png, duque.png…
//        → public/images/esculturas/<id>.webp (1024 x 1280)
//        → content/esculturas-disponiveis.json (quais esculturas existem)
//
//   public/images/opcoes/_originais/<tipo>-<id>.png           cor-preto.png, tipo-busto.png…
//        → public/images/opcoes/<tipo>-<id>.webp (640 x 800)
//        → content/opcoes-disponiveis.json (quais imagens de opção existem)
//
// As imagens de opção ilustram as escolhas do configurador (tamanho, tipo, cor).
// Provisórias: `node scripts/opcoes-ilustrativas.mjs`. Para trocar por imagens
// de verdade, salve com o mesmo nome e rode este script de novo.
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const jobs = [
  {
    originals: "public/images/esculturas/_originais",
    outDir: "public/images/esculturas",
    listFile: "content/esculturas-disponiveis.json",
    width: 1024,
    height: 1280,
    quality: 82,
    label: "Esculturas disponíveis no site",
  },
  {
    originals: "public/images/opcoes/_originais",
    outDir: "public/images/opcoes",
    listFile: "content/opcoes-disponiveis.json",
    width: 640,
    height: 800,
    quality: 80,
    label: "Imagens de opção disponíveis",
  },
];

for (const job of jobs) {
  mkdirSync(job.originals, { recursive: true });
  let converted = 0;

  for (const file of readdirSync(job.originals)) {
    const ext = path.extname(file).toLowerCase();
    if (![".png", ".jpg", ".jpeg", ".webp"].includes(ext)) continue;
    const id = path.basename(file, ext).toLowerCase();
    if (!/^[a-z0-9-]+$/.test(id)) {
      console.warn(`Ignorado: "${file}" (use só letras minúsculas, números e hífen no nome).`);
      continue;
    }
    const input = path.join(job.originals, file);
    const meta = await sharp(input).metadata();
    const ratio = (meta.width ?? 1) / (meta.height ?? 1);
    await sharp(input)
      // "cover" recorta o excesso para o formato 4:5 sem esticar a imagem
      .resize(job.width, job.height, { fit: "cover", position: "attention" })
      .webp({ quality: job.quality })
      .toFile(path.join(job.outDir, `${id}.webp`));
    converted += 1;
    const note =
      Math.abs(ratio - job.width / job.height) > 0.25
        ? "  (a proporção original era bem diferente de 4:5: confira o recorte)"
        : "";
    console.log(`OK   ${file} → ${id}.webp${note}`);
  }

  const ids = readdirSync(job.outDir)
    .filter((file) => file.endsWith(".webp"))
    .map((file) => path.basename(file, ".webp"))
    .sort();
  writeFileSync(job.listFile, JSON.stringify(ids, null, 2) + "\n");
  console.log(`\n${converted} imagem(ns) convertida(s). ${job.label}: ${ids.length ? ids.join(", ") : "nenhuma"}.\n`);
}
