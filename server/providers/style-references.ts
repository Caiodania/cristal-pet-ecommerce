// Imagens de REFERÊNCIA DE ESTILO enviadas junto com a foto do cliente à IA de
// imagem (veja providers/prompts.ts). Por padrão, a escultura da Mel: ela mostra
// ao modelo o acabamento do material, a base octogonal, a luz e o enquadramento
// que a loja quer em toda prévia.
//
// Para trocar ou acrescentar referências, salve a imagem em public/images/ e
// liste o caminho em STYLE_REFERENCE_FILES (separado por vírgula; "none" desliga).
// Na Netlify, o arquivo precisa estar em `included_files` (netlify.toml) para
// existir dentro da função.

import { readFile } from "node:fs/promises";
import path from "node:path";
import type { StyleReference } from "./types";

const TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

/** Pasta onde os arquivos incluídos existem: na Netlify é a raiz da função. */
const root = () => process.env.LAMBDA_TASK_ROOT ?? process.cwd();

const cache = new Map<string, Promise<StyleReference | undefined>>();

async function readReference(file: string): Promise<StyleReference | undefined> {
  const contentType = TYPES[path.extname(file).toLowerCase()];
  if (!contentType) {
    console.warn(`[style-references] formato não suportado: ${file}`);
    return undefined;
  }
  try {
    const bytes = await readFile(path.resolve(root(), file));
    return { bytes: new Uint8Array(bytes), contentType };
  } catch {
    // sem a imagem a prévia ainda sai, só perde o ancoramento de estilo
    console.warn(`[style-references] arquivo não encontrado: ${file}`);
    return undefined;
  }
}

/** Lê (uma vez por instância) as imagens de referência que existirem. */
export async function loadStyleReferences(files: string[]): Promise<StyleReference[]> {
  const found = await Promise.all(
    files.map((file) => {
      let pending = cache.get(file);
      if (!pending) {
        pending = readReference(file);
        cache.set(file, pending);
      }
      return pending;
    }),
  );
  return found.filter((ref): ref is StyleReference => Boolean(ref));
}
