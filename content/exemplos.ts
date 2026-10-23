// Exemplos de esculturas da vitrine: o pet de verdade (foto) e a escultura feita
// a partir dele. As fotos são de pets atendidos pela Cristal Pet.
//
// TODO-FOTO: as esculturas ainda não existem. Para publicar:
//   1. gere uma imagem por pet (prompts prontos em docs/prompts-esculturas.md);
//   2. salve em public/images/esculturas/_originais/<id>.png (ou .jpg/.webp);
//   3. rode `npm run esculturas`: o script converte para o formato do site e
//      atualiza content/esculturas-disponiveis.json.
// Enquanto uma escultura não existir, o cartão mostra "em breve".
//
// TODO-CLIENTE: confirmar com os tutores a autorização de uso das fotos dos pets
// e os nomes (os nomes abaixo, exceto Mel e Kobe, são de exemplo).

import disponiveis from "./esculturas-disponiveis.json";
import type { Img } from "./images";

export type Exemplo = {
  /** Também é o nome do arquivo da escultura: public/images/esculturas/<id>.webp */
  id: string;
  /** Nome que vai em relevo na base da escultura. */
  name: string;
  /** Raça e pose, usados no alt e nos prompts. */
  description: string;
  photo: Img;
  /** Só existe se o arquivo foi gerado (npm run esculturas). */
  sculpture?: Img;
};

const SCULPTURE = { width: 1024, height: 1280 } as const;
const available = new Set<string>(disponiveis);

const pet = (
  id: string,
  name: string,
  description: string,
  width: number,
  height: number,
): Exemplo => ({
  id,
  name,
  description,
  photo: { src: `/images/exemplos/${id}.webp`, width, height, alt: `Foto de ${name}, ${description}` },
  sculpture: available.has(id)
    ? {
        src: `/images/esculturas/${id}.webp`,
        ...SCULPTURE,
        alt: `Escultura 3D de ${name}, ${description}, em resina branca sobre uma base com o nome`,
      }
    : undefined,
});

/** A ordem importa: o primeiro é o do hero da vitrine. */
export const exemplos: Exemplo[] = [
  pet("mel", "Mel", "lulu da pomerânia creme, sentada", 640, 825),
  pet("duque", "Duque", "cocker spaniel dourado, sentado", 640, 853),
  pet("sol", "Sol", "golden retriever", 640, 875),
  pet("bela", "Bela", "shih tzu branca", 640, 853),
  pet("bob", "Bob", "cão caramelo e branco, sentado", 640, 927),
  pet("nina", "Nina", "lulu da pomerânia branca", 640, 853),
  pet("kobe", "Kobe", "lulu da pomerânia creme, deitado", 640, 1138),
  pet("neve", "Neve", "cão branco de pelo longo", 591, 910),
  pet("pipoca", "Pipoca", "filhote de golden retriever", 640, 1098),
];

/** Esculturas prontas, na ordem acima. */
export const exemplosProntos = exemplos.filter((e) => e.sculpture);
