// Galeria: pets depois do atendimento e a unidade móvel.
//
// Cada foto tem duas versões em /public/images/galeria: `<slug>.webp` (miniatura
// do mosaico) e `<slug>-full.webp` (a ampliada, aberta no lightbox). As
// dimensões estão declaradas para a página não "pular" durante o carregamento.
//
// TODO-FOTO: alguns destes arquivos ainda serão trocados por fotos novas.
// Para trocar, substitua os arquivos mantendo o nome (e ajuste as dimensões).

export type GalleryPhoto = {
  slug: string;
  alt: string;
  thumb: { width: number; height: number };
  full: { width: number; height: number };
};

const BASE = "/images/galeria";

export const galleryPhotos: GalleryPhoto[] = [
  {
    slug: "shihtzu-branco-laco-vermelho-natal",
    alt: "Shih tzu branco com laço vermelho após o banho, em frente a uma árvore de Natal",
    thumb: { width: 640, height: 853 },
    full: { width: 960, height: 1280 },
  },
  {
    slug: "cocker-dourado-gravata-natal",
    alt: "Cocker spaniel dourado com gravata natalina após a tosa",
    thumb: { width: 640, height: 853 },
    full: { width: 960, height: 1280 },
  },
  {
    slug: "lulu-branco-laco-vermelho-natal",
    alt: "Lulu da pomerânia branco com laço vermelho em cenário natalino com laços dourados",
    thumb: { width: 640, height: 853 },
    full: { width: 960, height: 1280 },
  },
  {
    slug: "caramelo-gravata-vermelha-casinha",
    alt: "Cão caramelo e branco com gravata borboleta vermelha ao lado de uma casinha decorada",
    thumb: { width: 640, height: 927 },
    full: { width: 884, height: 1280 },
  },
  {
    slug: "lulu-creme-gravata-branca",
    alt: "Lulu da pomerânia creme sorrindo com gravata branca depois da tosa",
    thumb: { width: 640, height: 825 },
    full: { width: 993, height: 1280 },
  },
  {
    slug: "lulu-creme-gravata-verde-deitado",
    alt: "Lulu da pomerânia creme com gravata verde deitado após o banho na unidade móvel",
    thumb: { width: 640, height: 1138 },
    full: { width: 720, height: 1280 },
  },
  {
    slug: "branco-pelo-longo-gorro-papai-noel",
    alt: "Cão branco de pelo longo com gorro de Papai Noel e gravata verde",
    thumb: { width: 591, height: 910 },
    full: { width: 591, height: 910 },
  },
  {
    slug: "golden-bandana-vermelha",
    alt: "Golden retriever com bandana vermelha descansando depois do banho",
    thumb: { width: 640, height: 875 },
    full: { width: 936, height: 1280 },
  },
  {
    slug: "filhote-golden-bandana",
    alt: "Filhote de golden retriever com bandana vermelha e enfeite de cabeça",
    thumb: { width: 640, height: 1098 },
    full: { width: 746, height: 1280 },
  },
  {
    slug: "van-interior-bancada-tosa",
    alt: "Interior da unidade móvel Cristal Pet com bancada de tosa e caixa de secagem",
    thumb: { width: 640, height: 930 },
    full: { width: 881, height: 1280 },
  },
  {
    slug: "van-secador-caixa-secagem",
    alt: "Unidade móvel Cristal Pet equipada com secador profissional e caixa de secagem",
    thumb: { width: 640, height: 928 },
    full: { width: 883, height: 1280 },
  },
  {
    slug: "van-banheira-inox",
    alt: "Banheira e bancada de aço inox dentro da unidade móvel Cristal Pet",
    thumb: { width: 640, height: 924 },
    full: { width: 887, height: 1280 },
  },
];

const toItem = ({ slug, alt, thumb, full }: GalleryPhoto) => ({
  alt,
  thumb: { src: `${BASE}/${slug}.webp`, ...thumb },
  full: { src: `${BASE}/${slug}-full.webp`, ...full },
});

/** Formato esperado pelo componente LightboxGallery. */
export const galleryItems = galleryPhotos.map(toItem);

/** Só os pets: a galeria da página. */
export const petItems = galleryPhotos
  .filter((photo) => !photo.slug.startsWith("van-"))
  .map(toItem);

/** Só a unidade móvel: o carrossel "A unidade móvel". */
export const vanItems = galleryPhotos
  .filter((photo) => photo.slug.startsWith("van-"))
  .map(toItem);
