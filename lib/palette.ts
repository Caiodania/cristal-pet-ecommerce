// Espelho da paleta de app/globals.css (@theme), usado só pela página
// /styleguide para exibir as cores e calcular contrastes. Ao mudar uma cor
// no @theme, mude aqui também.
// Paleta AUmor de Patas: dourado e pink com a identidade azul marinho.

export const palette = {
  snow: { hex: "#ffffff", use: "fundo da página (branco)" },
  pearl: { hex: "#fff9f1", use: "creme: seções tonais e apoio à leitura" },
  gold: { hex: "#e8b84a", use: "dourado: botões principais com texto marinho e detalhes" },
  "gold-deep": { hex: "#8b5b0b", use: "dourado escuro: texto e ícones em fundos claros" },
  "gold-mist": { hex: "#fff3d6", use: "fundo dourado suave para destaques e resumos" },
  pink: { hex: "#e94c9b", use: "pink: corações, patinhas e detalhes decorativos" },
  "pink-deep": { hex: "#b42368", use: "pink profundo: links, seleção e botões com texto branco" },
  "pink-mist": { hex: "#fff0f6", use: "fundo rosa suave: seleções, acordeões e faixas" },
  "silver-mist": { hex: "#e3e8f0", use: "apoio neutro" },
  line: { hex: "#e6dfd6", use: "bordas decorativas" },
  silver: { hex: "#c9cfdb", use: "prata: faixas claras, preenchimentos, ícones sobre o marinho" },
  "silver-deep": { hex: "#8a94a8", use: "prata escuro: enfeites e linhas" },
  navy: { hex: "#0b2347", use: "azul marinho: identidade, leitura e faixas escuras" },
  ink: { hex: "#0a1830", use: "texto e superfícies escuras" },
  "ink-soft": { hex: "#40506a", use: "texto secundário" },
} as const;

export type PaletteName = keyof typeof palette;
