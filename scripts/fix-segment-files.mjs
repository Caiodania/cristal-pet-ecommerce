// Pós-build do export estático.
//
// O Next 16 grava os arquivos de pré-carregamento de cada rota em pasta
// (out/esculturas/__next.esculturas/__PAGE__.txt), mas o navegador pede o nome
// com pontos (out/esculturas/__next.esculturas.__PAGE__.txt). Um servidor
// Next resolve isso sozinho; um host estático (Netlify, `serve`) não, e cada
// link do site gerava um 404 no console. Este script grava também a cópia com
// o nome que o navegador pede. Não altera nenhum arquivo existente.
import { copyFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const root = "out";
let copied = 0;

function flatten(segmentDir, prefix, parent) {
  for (const entry of readdirSync(segmentDir)) {
    const full = path.join(segmentDir, entry);
    if (statSync(full).isDirectory()) {
      flatten(full, `${prefix}.${entry}`, parent);
    } else {
      copyFileSync(full, path.join(parent, `${prefix}.${entry}`));
      copied += 1;
    }
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (!statSync(full).isDirectory() || name === "_next") continue;
    if (name.startsWith("__next.")) flatten(full, name, dir);
    else walk(full);
  }
}

if (!existsSync(root)) {
  console.error(`fix-segment-files: pasta "${root}" não existe; rode o build antes.`);
  process.exit(1);
}
walk(root);
console.log(`fix-segment-files: ${copied} arquivo(s) de pré-carregamento copiado(s).`);
