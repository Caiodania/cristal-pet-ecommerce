// Registro das imagens do site. Dimensões conferidas nos arquivos: a página
// reserva o espaço e não "pula".

export type Img = { src: string; width: number; height: number; alt: string };

const img = (src: string, width: number, height: number, alt = ""): Img => ({
  src: `/images/${src}`,
  width,
  height,
  alt,
});

export const images = {
  logo: img(
    "marca/logo-cristal-pet-movel.webp",
    500,
    500,
    "Logo da Cristal Pet: uma pata verde-água com um shih tzu de laço rosa em uma banheira de espuma",
  ),

} as const;
