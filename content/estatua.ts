// Catálogo da escultura 3D. TODO-CLIENTE: os valores são provisórios até o dono
// da Cristal Pet passar os dados reais. Preços e alturas NÃO foram inventados:
// `null` significa "a definir" e a interface mostra "A definir"; enquanto
// houver `null`, o total do carrinho aparece como "valor a combinar".
//
// Este arquivo é importado pelo site e pelo servidor (cálculo da estimativa).
// Por isso só usa imports relativos e nenhuma API de navegador.

/**
 * Quantas prévias grátis cada conta tem. É o padrão do servidor (a variável
 * PREVIEWS_PER_ACCOUNT pode mudar o limite de verdade) e entra nos textos do
 * site, que são estáticos: ao mudar o número, mude aqui e publique de novo.
 */
export const previewsPerAccount = 3;

export type Size = {
  id: string;
  label: string;
  /** Uma frase sobre o uso da peça (cartão do tamanho). */
  blurb: string;
  /** Altura relativa na ilustração de escala (0 a 1; a maior vale 1). */
  scale: number;
  /** Altura da peça em centímetros. TODO-CLIENTE: depende da impressora. */
  cm: number | null;
  /** Preço em centavos. TODO-CLIENTE. */
  priceCents: number | null;
};

export type Pose = {
  id: string;
  label: string;
  /** Uma frase sobre o tipo (cartão do tipo). */
  description: string;
  /** Acréscimo de preço em centavos (null = a definir, conta como 0). */
  priceDeltaCents: number | null;
};

export type Color = {
  id: string;
  label: string;
  /** Uma frase sobre a cor (cartão da cor). */
  description: string;
  /** Cor do material impresso, em hexadecimal (mostrada na interface). */
  swatch: string;
  /** Selo opcional no cartão ("Mais vendida"…). Só use com dado real de venda. */
  badge?: string;
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
  version: "provisorio-2",

  sizes: [
    {
      id: "pequena",
      label: "Pequena",
      blurb: "Cabe em qualquer cantinho, da mesa de trabalho à prateleira.",
      scale: 0.6,
      cm: null,
      priceCents: null,
    },
    {
      id: "media",
      label: "Média",
      blurb: "Na medida certa para estantes e aparadores.",
      scale: 0.8,
      cm: null,
      priceCents: null,
    },
    {
      id: "grande",
      label: "Grande",
      blurb: "Uma peça de destaque no centro da sala.",
      scale: 1,
      cm: null,
      priceCents: null,
    },
  ],

  // TODO-CLIENTE: confirmar quais tipos a impressora do dono consegue fazer.
  poses: [
    {
      id: "na-pose",
      label: "Pose da foto",
      description: "A escultura repete a postura do seu pet na foto.",
      priceDeltaCents: null,
    },
    {
      id: "sentado",
      label: "Sentado",
      description: "Sentadinho, de corpo inteiro: a pose mais clássica.",
      priceDeltaCents: null,
    },
    {
      id: "busto",
      label: "Busto",
      description: "Só cabeça e peito, com todo o destaque para o rosto.",
      priceDeltaCents: null,
    },
  ],

  // TODO-CLIENTE: cores reais do material (resina ou filamento).
  colors: [
    { id: "branco", label: "Branco", description: "Resina clara, que valoriza os detalhes do pelo.", swatch: "#f3f0e8" },
    { id: "bege", label: "Bege", description: "Tom de areia, quente e acolhedor.", swatch: "#d6b98f" },
    { id: "cinza", label: "Cinza", description: "Cinza chumbo, discreto e moderno.", swatch: "#8c8c8c" },
    { id: "preto", label: "Preto", description: "Preto intenso, de muito contraste.", swatch: "#262626" },
    { id: "marrom", label: "Marrom", description: "Marrom de cacau, lembra a cerâmica.", swatch: "#8a5230" },
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
      "Escolha o tamanho, o tipo e a cor, e envie uma boa foto do seu pet. Para gerar a prévia você cria uma conta grátis, em um minuto.",
  },
  {
    number: "02",
    title: "Veja a prévia",
    description:
      `Geramos a prévia da escultura para você conferir antes de pedir. Cada conta tem ${previewsPerAccount} prévias grátis: não gostou? Gere outra.`,
  },
  {
    number: "03",
    title: "Combine pelo WhatsApp",
    description:
      "Envie o pedido pelo WhatsApp: combinamos pagamento e entrega com você, e a nossa equipe imprime a sua escultura.",
  },
];
