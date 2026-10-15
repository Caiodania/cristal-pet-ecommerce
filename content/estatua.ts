// Catálogo da escultura 3D. TODO-CLIENTE: os valores são provisórios até o dono
// da Cristal Pet passar os dados reais. Preços e alturas NÃO foram inventados:
// `null` significa "a definir" e a interface mostra "A definir"; enquanto
// houver `null`, o total do carrinho aparece como "valor a combinar".
//
// Este arquivo é importado pelo site e pelo servidor (cálculo da estimativa).
// Por isso só usa imports relativos e nenhuma API de navegador.

export type Size = {
  id: string;
  label: string;
  /** Altura da peça em centímetros. TODO-CLIENTE: depende da impressora. */
  cm: number | null;
  /** Preço em centavos. TODO-CLIENTE. */
  priceCents: number | null;
};

export type Pose = {
  id: string;
  label: string;
  /** Acréscimo de preço em centavos (null = a definir, conta como 0). */
  priceDeltaCents: number | null;
};

export type Color = {
  id: string;
  label: string;
  /** Cor do material impresso, em hexadecimal (mostrada na interface). */
  swatch: string;
};

export type Catalog = {
  /** Muda sempre que preço ou opções mudam; o pedido guarda a versão usada. */
  version: string;
  sizes: Size[];
  poses: Pose[];
  colors: Color[];
  /** Desconto (%) nas peças a partir da 2ª. null = sem oferta. TODO-CLIENTE. */
  secondPieceDiscountPct: number | null;
};

export const catalog: Catalog = {
  version: "provisorio-1",

  sizes: [
    { id: "pequena", label: "Pequena", cm: null, priceCents: null },
    { id: "media", label: "Média", cm: null, priceCents: null },
    { id: "grande", label: "Grande", cm: null, priceCents: null },
  ],

  // TODO-CLIENTE: confirmar quais tipos a impressora do dono consegue fazer.
  poses: [
    { id: "corpo-inteiro", label: "Corpo inteiro", priceDeltaCents: null },
    { id: "sentado", label: "Sentado", priceDeltaCents: null },
    { id: "busto", label: "Busto", priceDeltaCents: null },
  ],

  // TODO-CLIENTE: cores reais do material (resina ou filamento).
  colors: [
    { id: "branco", label: "Branco", swatch: "#f3f0e8" },
    { id: "cinza", label: "Cinza", swatch: "#8c8c8c" },
    { id: "preto", label: "Preto", swatch: "#262626" },
  ],

  secondPieceDiscountPct: null,
};

/** Dicas de foto (valem para a impressão 3D: um pet só, corpo inteiro). */
export const photoTips = [
  "Um pet só em cada foto",
  "De preferência de corpo inteiro",
  "Boa iluminação, sem sombras fortes",
  "Fundo simples, sem outros objetos",
];

/** Os três passos da compra (página inicial). */
export const passos = [
  {
    number: "01",
    title: "Envie a foto",
    description:
      "Escolha o tamanho, o tipo e a cor, e envie uma boa foto do seu pet.",
  },
  {
    number: "02",
    title: "Veja a prévia",
    description:
      "Geramos a prévia da escultura para você conferir antes de pedir. Não gostou? Gere outra.",
  },
  {
    number: "03",
    title: "Combine pelo WhatsApp",
    description:
      "Envie o pedido pelo WhatsApp: combinamos pagamento e entrega com você, e a nossa equipe imprime a sua escultura.",
  },
];
