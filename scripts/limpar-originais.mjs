// Pós-build: tira de out/ as pastas "_originais" (as imagens-fonte das esculturas e das
// opções, em alta resolução). O site só usa os .webp que o `npm run esculturas` gera
// delas; os originais ficam no repositório e não precisam ir para a Netlify.
import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const root = path.join("out", "images");
let removed = 0;
let bytes = 0;

function size(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    total += statSync(full).isDirectory() ? size(full) : statSync(full).size;
  }
  return total;
}

if (existsSync(root)) {
  for (const name of readdirSync(root)) {
    const dir = path.join(root, name, "_originais");
    if (existsSync(dir)) {
      bytes += size(dir);
      rmSync(dir, { recursive: true, force: true });
      removed += 1;
    }
  }
}
console.log(`limpar-originais: ${removed} pasta(s) de originais fora do site (${(bytes / 1024 / 1024).toFixed(1)} MB a menos).`);
