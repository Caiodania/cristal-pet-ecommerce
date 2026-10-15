// Prompts enviados à IA de imagem. É o lugar de AFINAR o resultado: o texto
// abaixo é um ponto de partida razoável, não o final. Ajuste olhando fotos
// reais de pets (veja docs/backend.md, "Afinando o prompt").
//
// Os prompts de IA de imagem costumam render melhor em inglês, por isso o
// texto está em inglês. As variáveis (tipo e cor) vêm do catálogo.

import type { StatueOptions } from "./types";

export function buildStatuePrompt(options: Pick<StatueOptions, "poseLabel" | "colorLabel">): string {
  const pose = options.poseLabel.toLowerCase();
  const color = options.colorLabel.toLowerCase();

  return [
    `Transform the pet in the photo into a studio product photograph of a detailed 3D-printed sculpture of that exact pet.`,
    `The sculpture is a single solid piece in uniform matte ${color} material, no other colors, no textures from the photo.`,
    `Pose style: ${pose}.`,
    `Keep the pet's real proportions, face shape, ears, tail, fur length and distinctive features, simplified into clean sculpted forms.`,
    `The sculpture stands on a small flat round plinth, centered, shown from a slightly elevated three-quarter front angle.`,
    `Plain neutral light-gray background, soft studio lighting, gentle shadow under the plinth.`,
    `One subject only. No text, no logos, no watermark, no people, no other objects.`,
  ].join(" ");
}

/** Para provedores que aceitam prompt negativo. */
export const STATUE_NEGATIVE_PROMPT =
  "text, watermark, logo, multiple animals, people, background clutter, colored fur texture, photo-realistic fur, blurry, deformed anatomy";
