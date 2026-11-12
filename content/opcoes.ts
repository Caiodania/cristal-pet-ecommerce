// Imagens que ilustram as opções do configurador (tipo e cor) e o exemplo do
// nome em relevo. O arquivo da imagem é public/images/opcoes/<tipo>-<id>.webp e
// só entra aqui quando existe (content/opcoes-disponiveis.json, atualizado por
// `npm run esculturas`). Sem a imagem, o cartão mostra uma ilustração.
//
// Os tipos usam as imagens fornecidas pelo cliente: Luna (pose da foto),
// Apolo (sentado) e Toby (busto). Cor e nome ainda usam referências da Mel.
// Para atualizar, salve com o mesmo nome em public/images/opcoes/_originais/
// e rode `npm run esculturas`. As fotos de tipo são preservadas sem recorte.

import disponiveis from "./opcoes-disponiveis.json";
import type { Img } from "./images";

const available = new Set<string>(disponiveis);
// /images tem cache de um dia. Atualize a revisão ao substituir os modelos.
const poseImageRevision = "20261112";

export type OptionKind = "tipo" | "cor" | "nome";

/** A imagem da opção, ou undefined se ela ainda não existe. */
export function optionImage(kind: OptionKind, id: string, alt: string): Img | undefined {
  const key = `${kind}-${id}`;
  const revision = kind === "tipo" ? `?v=${poseImageRevision}` : "";
  return available.has(key) ? { src: `/images/opcoes/${key}.webp${revision}`, width: 640, height: 800, alt } : undefined;
}
