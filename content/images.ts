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

  // Fotos reais de pets: fazem o papel de "foto enviada pelo cliente" nas
  // demonstrações. TODO-FOTO: trocar por pares foto → escultura reais.
  exemplos: {
    lulu: img(
      "exemplos/lulu-creme-gravata-branca.webp",
      640,
      825,
      "Lulu da pomerânia creme sorrindo com gravata branca",
    ),
    golden: img(
      "exemplos/golden-bandana-vermelha.webp",
      640,
      875,
      "Golden retriever com bandana vermelha descansando",
    ),
    cocker: img(
      "exemplos/cocker-dourado-gravata-natal.webp",
      640,
      853,
      "Cocker spaniel dourado com gravata natalina",
    ),
  },
} as const;
