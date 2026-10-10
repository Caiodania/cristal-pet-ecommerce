// Catálogo da escultura 3D. TODO-CLIENTE: tudo aqui é provisório até o dono da
// Cristal Pet passar os dados reais. Nenhum preço, medida ou cor foi inventado:
// `null` significa "a definir" e a interface mostra "A definir".
//
// Este mesmo arquivo alimenta as seções informativas (etapa 3) e vai alimentar
// o configurador, o carrinho e o cálculo da estimativa (fase 1B).

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
  /** Acréscimo de preço em centavos. TODO-CLIENTE. */
  priceDeltaCents: number | null;
};

export type Color = {
  id: string;
  label: string;
  /** Cor do material impresso, em hexadecimal. */
  swatch: string;
};

/** Muda sempre que preço ou opções mudam; o pedido guarda a versão usada. */
export const catalogVersion = "provisorio-0";

export const sizes: Size[] = [
  { id: "pequena", label: "Pequena", cm: null, priceCents: null },
  { id: "media", label: "Média", cm: null, priceCents: null },
  { id: "grande", label: "Grande", cm: null, priceCents: null },
];

// TODO-CLIENTE: confirmar quais tipos a impressora do dono consegue fazer.
export const poses: Pose[] = [
  { id: "corpo-inteiro", label: "Corpo inteiro", priceDeltaCents: null },
  { id: "sentado", label: "Sentado", priceDeltaCents: null },
  { id: "busto", label: "Busto", priceDeltaCents: null },
];

// TODO-CLIENTE: cores do material (resina ou filamento). Lista vazia até lá.
export const colors: Color[] = [];

/** Os três passos da escultura (página /esculturas). */
export const passosEscultura = [
  {
    number: "01",
    title: "Envie a foto",
    description:
      "Escolha uma foto do seu pet seguindo as nossas dicas: um pet só, de corpo inteiro e com boa luz.",
  },
  {
    number: "02",
    title: "Veja a prévia em 3D",
    description:
      "Geramos um modelo 3D a partir da foto, e você confere como a escultura vai ficar antes de pedir.",
  },
  {
    number: "03",
    title: "Combine pelo WhatsApp",
    description:
      "Envie o pedido pelo WhatsApp: combinamos pagamento e entrega diretamente com você, e a nossa equipe imprime a sua escultura.",
  },
];

/** Dicas de foto (valem para a impressão 3D: um pet só, corpo inteiro). */
export const photoTips = [
  "Um pet só em cada foto",
  "De preferência de corpo inteiro",
  "Boa iluminação, sem sombras fortes",
  "Fundo simples, sem outros objetos",
];
