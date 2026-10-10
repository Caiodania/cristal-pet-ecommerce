// Espelho da paleta de app/globals.css (@theme), usado só pela página
// /styleguide para exibir as cores e calcular contrastes. Ao mudar uma cor
// no @theme, mude aqui também; a verificação do projeto compara os dois.

export const palette = {
  cream: { hex: "#faf9f5", use: "fundo da página" },
  sand: { hex: "#f1eee6", use: "seções tonais" },
  line: { hex: "#e2ddd2", use: "bordas decorativas" },
  ink: { hex: "#1a1a1a", use: "texto, botão escuro, faixas escuras" },
  "ink-soft": { hex: "#5f5b55", use: "texto secundário" },
  teal: { hex: "#4bc0af", use: "preenchimentos, ícones, faixas" },
  "teal-deep": { hex: "#1f6f63", use: "texto de marca, links, acento" },
  "teal-mist": { hex: "#e3f3f0", use: "tinta de fundo" },
  magenta: { hex: "#c82d91", use: "selos e promoções" },
  "magenta-mist": { hex: "#fbeaf5", use: "tinta decorativa" },
} as const;

export type PaletteName = keyof typeof palette;
