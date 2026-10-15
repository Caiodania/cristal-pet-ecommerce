"use client";

// Prepara a foto no navegador antes de enviar: reduz o lado maior e recodifica
// em JPEG. Dois ganhos: a foto sobe em segundos (um celular tira fotos de
// 5 a 12 MB) e a recodificação REMOVE o EXIF, que pode trazer a localização da
// casa do cliente. A rotação do EXIF é aplicada antes, para a foto não girar.

export const MAX_SIDE = 2048;
export const MIN_SIDE = 512;

export class PhotoError extends Error {}

export async function preparePhoto(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  if (!file.type.startsWith("image/")) throw new PhotoError("Escolha um arquivo de imagem (JPG, PNG ou WebP).");

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new PhotoError(
      "Não foi possível abrir esta foto. Se for HEIC (iPhone), escolha outra ou tire um print da foto.",
    );
  }

  const longSide = Math.max(bitmap.width, bitmap.height);
  if (Math.min(bitmap.width, bitmap.height) < MIN_SIDE) {
    bitmap.close();
    throw new PhotoError(`A foto é pequena demais. Use uma com pelo menos ${MIN_SIDE} px de largura e altura.`);
  }

  const scale = Math.min(1, MAX_SIDE / longSide);
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new PhotoError("Este navegador não consegue preparar a foto. Tente outro.");
  }
  // fundo branco: PNG com transparência não pode virar fundo preto no JPEG
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new PhotoError("Não foi possível preparar a foto. Tente outra.");
  return { blob, width, height };
}
