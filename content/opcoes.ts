// Imagens que ilustram as opções do configurador (tipo e cor) e o exemplo do
// nome em relevo. O arquivo da imagem é public/images/opcoes/<tipo>-<id>.webp e
// só entra aqui quando existe (content/opcoes-disponiveis.json, atualizado por
// `npm run esculturas`). Sem a imagem, o cartão mostra uma ilustração.
//
// As imagens atuais são PROVISÓRIAS: recolores e recortes da escultura da Mel
// (node scripts/opcoes-ilustrativas.mjs). Para trocar por imagens reais, salve
// com o mesmo nome em public/images/opcoes/_originais/ e rode `npm run esculturas`.

import disponiveis from "./opcoes-disponiveis.json";
import type { Img } from "./images";

const available = new Set<string>(disponiveis);

export type OptionKind = "tipo" | "cor" | "nome";

/** A imagem da opção, ou undefined se ela ainda não existe. */
export function optionImage(kind: OptionKind, id: string, alt: string): Img | undefined {
  const key = `${kind}-${id}`;
  return available.has(key) ? { src: `/images/opcoes/${key}.webp`, width: 640, height: 800, alt } : undefined;
}
