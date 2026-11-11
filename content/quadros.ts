// Catálogo inicial de quadros. Tamanhos e acabamentos dependem de confirmação
// do parceiro antes do fechamento pelo WhatsApp. Preços não definidos = null.
export type PortraitSize = {
  id: string;
  label: string;
  widthCm: number;
  heightCm: number;
  blurb: string;
  priceCents: number | null;
};

export type PortraitStyle = {
  id: string;
  label: string;
  description: string;
  prompt: string;
  priceDeltaCents: number | null;
};

export type PortraitFrame = {
  id: string;
  label: string;
  description: string;
  swatch: string;
  priceDeltaCents: number | null;
};

export type PortraitCatalog = {
  version: string;
  sizes: PortraitSize[];
  styles: PortraitStyle[];
  frames: PortraitFrame[];
};

export const portraitCatalog: PortraitCatalog = {
  version: "quadros-provisorio-1",
  sizes: [
    { id: "20x30", label: "20 × 30 cm", widthCm: 20, heightCm: 30, blurb: "Uma lembrança para aquele cantinho especial.", priceCents: null },
    { id: "30x40", label: "30 × 40 cm", widthCm: 30, heightCm: 40, blurb: "Destaque na medida para a sua parede.", priceCents: null },
    { id: "40x60", label: "40 × 60 cm", widthCm: 40, heightCm: 60, blurb: "O seu pet como protagonista do ambiente.", priceCents: null },
  ],
  styles: [
    { id: "realista", label: "Retrato realista", description: "Expressão e detalhes do seu pet em um retrato delicado.", prompt: "A refined realistic fine-art pet portrait, faithfully preserving fur markings, colors and expression, on a soft neutral background.", priceDeltaCents: 0 },
    { id: "aquarela", label: "Aquarela", description: "Pinceladas suaves e leves toques de cor.", prompt: "An elegant watercolor painting of the pet, preserving its distinctive markings and expression, with soft translucent washes and a clean light background.", priceDeltaCents: 0 },
    { id: "real", label: "Realeza", description: "Um retrato clássico para a majestade da casa.", prompt: "A classic royal oil-painted pet portrait in tasteful regal clothing, preserving the actual pet's face, fur markings and expression, with a restrained dark studio background.", priceDeltaCents: 0 },
  ],
  frames: [
    { id: "preta", label: "Preta", description: "Acabamento clássico com contraste.", swatch: "#252525", priceDeltaCents: null },
    { id: "branca", label: "Branca", description: "Um contorno claro e discreto.", swatch: "#f5f3ef", priceDeltaCents: null },
    { id: "natural", label: "Madeira natural", description: "Um toque acolhedor para a sua decoração.", swatch: "#bc956c", priceDeltaCents: null },
  ],
};

export const portraitPhotoTips = [
  "Um pet só em cada foto",
  "Rosto e olhos nítidos, sem cortes nas orelhas",
  "Boa iluminação para mostrar as cores do pelo",
  "Envie a foto original, sem filtros ou montagens",
];
