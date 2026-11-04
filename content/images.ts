// Registro das imagens do site. Dimensões conferidas nos arquivos: a página
// reserva o espaço e não "pula".
// Os arquivos da marca saem de assets/marca/logo-aumor-de-patas.webp (o logo do
// cliente) pelo script `npm run marca`.

export type Img = { src: string; width: number; height: number; alt: string };

const img = (src: string, width: number, height: number, alt = ""): Img => ({
  src: `/images/${src}`,
  width,
  height,
  alt,
});

export const images = {
  /** O logo completo (fundo transparente). */
  logo: img(
    "marca/logo-aumor-de-patas.webp",
    520,
    520,
    "Logo da AUmor de Patas Esculturas Pet: um shih tzu e um gato dentro de um coração dourado",
  ),
  /** Só o coração com o cão e o gato (cabeçalho, páginas de aviso). */
  emblem: img(
    "marca/emblema-aumor-de-patas.webp",
    360,
    248,
    "Um shih tzu e um gato dentro de um coração dourado, o emblema da AUmor de Patas",
  ),
  /** Imagem de compartilhamento (WhatsApp, Instagram, Google). */
  share: img("og.jpg", 1200, 630, "Logo da AUmor de Patas Esculturas Pet"),
} as const;
