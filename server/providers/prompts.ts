// Prompts enviados à IA de imagem. É AQUI que se garante que a prévia saia no
// padrão da loja (escultura de resina fosca sobre base octogonal, nome em
// relevo, cena de interior) e que obedeça ao que o cliente escolheu no
// configurador (pose, cor, nome).
//
// Como o resultado é controlado (quatro alavancas, da mais forte à mais fraca):
//   1. IMAGEM DE REFERÊNCIA DE ESTILO: a escultura da Mel vai junto como segunda
//      imagem ("só o estilo, não copie o cão"). É o que mais uniformiza o visual.
//   2. BLOCO DE ESTILO (fixo): material, base, enquadramento, cena e luz.
//   3. CLÁUSULAS DAS ESCOLHAS: uma frase por pose e por cor, a partir do ID da
//      opção do catálogo. Opção nova no catálogo = uma linha nova aqui.
//   4. NOME: entra entre aspas, já higienizado, e só se o cliente digitou um.
//
// Os prompts de IA de imagem costumam render melhor em inglês, por isso o texto
// está em inglês. Ao afinar, mude PROMPT_VERSION: ela identifica qual versão
// gerou cada prévia.

import type { StatueOptions } from "./types";

export const PROMPT_VERSION = "estatua-v2";

/** Como cada cor do catálogo é descrita ao modelo (chave = id da cor). */
export const PROMPT_COLORS: Record<string, string> = {
  branco: "warm ivory white",
  bege: "warm sand beige",
  cinza: "matte slate gray",
  preto: "deep matte black",
  marrom: "earthy cocoa brown",
};

/** Uma frase por pose (chave = id do tipo). */
export const PROMPT_POSES: Record<string, string> = {
  "na-pose":
    "Reproduce the exact pose the pet has in the photo (standing, sitting, lying down…), full body, resting on the plinth.",
  sentado:
    "Classic sitting pose, full body, front legs straight and together, head up, looking slightly toward the camera.",
  busto:
    "Bust: only the head, neck and upper chest, ending in a clean flat cut that rests on the plinth. No legs, no paws.",
};

/**
 * O nome vai para dentro do prompt, então é entrada do usuário num texto que o
 * modelo lê: fica só com letras, números, espaço, hífen, apóstrofo, ponto e &
 * (sem aspas, quebras de linha nem símbolos), em maiúsculas e com até 30 letras.
 */
export function sanitizePetName(name: string | undefined): string | undefined {
  const clean = (name ?? "")
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} '’.&-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()
    .slice(0, 30)
    .trim();
  return clean || undefined;
}

type PromptInput = Pick<StatueOptions, "poseId" | "poseLabel" | "colorId" | "colorLabel" | "petName">;

export function buildStatuePrompt(
  options: PromptInput,
  { hasStyleReference = false }: { hasStyleReference?: boolean } = {},
): string {
  const color = PROMPT_COLORS[options.colorId] ?? options.colorLabel.toLowerCase();
  const pose = PROMPT_POSES[options.poseId] ?? `Pose: ${options.poseLabel.toLowerCase()}.`;
  const name = sanitizePetName(options.petName);

  const parts = [
    // 1. o que é
    "Create a premium e-commerce product photograph of a handcrafted sculpture of the pet in the first image.",

    // 2. identidade: tem de ser ESTE pet
    "The sculpture must be unmistakably THIS pet, not a generic dog or cat: keep its breed, body proportions, head shape, " +
      "ear shape and position, muzzle length, eye shape, fur length, volume and direction, tail, and its facial expression. " +
      "Express markings and coat patterns only through the sculpted form, never through color. " +
      "Ignore the photo's background, leash, clothes and any other objects.",

    // 3. material
    `The sculpture is one solid piece in a uniform ${color} matte resin with a soft, slightly powdery ceramic-like finish: ` +
      "no gloss, no painted details, no second color. Fur is sculpted as clean, flowing grooves and tufts.",

    // 4. pose (escolha do cliente)
    pose,

    // 5. base e nome (escolha do cliente)
    "It sits on a low octagonal plinth with a flat top and straight vertical sides, made of the same material and color.",
    name
      ? `The front face of the plinth carries the word "${name}" in raised, embossed serif capital letters, centered, ` +
        "in the same material and color as the plinth, correctly spelled. No other text anywhere in the image."
      : "The plinth is plain, with no text anywhere in the image.",

    // 6. cena e enquadramento
    "Scene: a bright, tasteful home interior, softly out of focus with shallow depth of field, for example a light wooden " +
      "table in front of a window with sheer curtains, warm natural daylight. The sculpture is the clear focus, centered, " +
      "photographed from a slightly elevated three-quarter angle. Portrait 4:5 framing, sharp detail, realistic soft shadows.",

    // 7. restrições
    "One sculpture only. No people, no hands, no other animals, no watermark, no logo.",
  ];

  if (hasStyleReference) {
    parts.splice(
      1,
      0,
      "The second image is a STYLE REFERENCE only: match its material finish, plinth shape, lighting, camera angle and " +
        "interior mood. Do not copy its animal; the subject is the pet in the first image.",
    );
  }
  return parts.join(" ");
}

/** Para provedores que aceitam prompt negativo. */
export const STATUE_NEGATIVE_PROMPT =
  "extra text, misspelled letters, watermark, logo, multiple animals, people, hands, background clutter, colored fur, " +
  "painted eyes, glossy plastic, photo-realistic live fur, blurry, deformed anatomy, extra legs";
