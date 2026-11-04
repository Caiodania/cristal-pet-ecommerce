// Espelho da paleta de app/globals.css (@theme), usado só pela página
// /styleguide para exibir as cores e calcular contrastes. Ao mudar uma cor
// no @theme, mude aqui também.
// Paleta pedida pelo cliente (AUmor de Patas): azul marinho, prata e branco.

export const palette = {
  snow: { hex: "#ffffff", use: "fundo da página (branco)" },
  pearl: { hex: "#f0f3f8", use: "seções tonais" },
  "silver-mist": { hex: "#e3e8f0", use: "tinta de fundo: seleção, aberto, avisos" },
  line: { hex: "#d7dde7", use: "bordas decorativas" },
  silver: { hex: "#c9cfdb", use: "prata: faixas claras, preenchimentos, ícones sobre o marinho" },
  "silver-deep": { hex: "#8a94a8", use: "prata escuro: enfeites e linhas" },
  navy: { hex: "#0b2347", use: "azul marinho: botões, links, destaque, faixas escuras" },
  ink: { hex: "#0a1830", use: "texto e superfícies escuras" },
  "ink-soft": { hex: "#40506a", use: "texto secundário" },
} as const;

export type PaletteName = keyof typeof palette;
