// Ilustração SVG da escultura: um cachorrinho sobre a base octogonal, na cor
// escolhida e com o nome em relevo na frente da base. É um TEXTO (SVG), sem
// React nem API de navegador, para servir aos dois lados:
//   - o site (components/ui/illustrations.tsx): prévia ao vivo no configurador e
//     reserva quando uma opção ainda não tem foto;
//   - o servidor (providers/mock.ts): a imagem da prévia no modo demonstração.
// Não representa o pet do cliente: é ilustrativa.

export type IlustracaoPose = "sentado" | "busto" | "na-pose" | string;

export type IlustracaoOpcoes = {
  pose?: IlustracaoPose;
  /** Cor do material, #rrggbb. */
  tint?: string;
  /** Nome em relevo na frente da base. */
  name?: string;
  /** Prefixo único dos ids internos (vários SVGs na mesma página). */
  uid?: string;
};

/** Área desenhada: o cachorrinho e a base, com sombra, em 300 x 260. */
export const ILUSTRACAO_VIEWBOX = "0 50 300 260";

const xmlEscape = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Clareia (amount > 0) ou escurece (amount < 0) uma cor #rrggbb. */
export function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const channel = (shift: number) => {
    const value = (n >> shift) & 255;
    const mixed = amount >= 0 ? value + (255 - value) * amount : value * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(mixed)));
  };
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, "0")).join("")}`;
}

const luminance = (hex: string) => {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
};

type Paint = { body: string; fur: string; dark: string; ink: string };

/** Cabeça com orelhas, focinho, olhos e nariz. `cy` é a altura do centro da cabeça. */
function head({ body, fur, dark, ink }: Paint, cy: number): string {
  const ear = (side: 1 | -1) => {
    const x = (v: number) => (side === 1 ? v : 300 - v);
    return `<path d="M${x(120)} ${cy - 12} C${x(106)} ${cy - 34} ${x(112)} ${cy - 54} ${x(130)} ${cy - 46} C${x(140)} ${cy - 42} ${x(146)} ${cy - 30} ${x(146)} ${cy - 26} Z" fill="${dark}"/>`;
  };
  return [
    ear(1),
    ear(-1),
    `<ellipse cx="150" cy="${cy}" rx="38" ry="34" fill="${body}"/>`,
    `<ellipse cx="150" cy="${cy + 12}" rx="18" ry="13" fill="${fur}"/>`,
    `<ellipse cx="150" cy="${cy + 6}" rx="6.5" ry="4.5" fill="${ink}"/>`,
    `<circle cx="135" cy="${cy - 4}" r="3.4" fill="${ink}"/>`,
    `<circle cx="165" cy="${cy - 4}" r="3.4" fill="${ink}"/>`,
    `<path d="M143 ${cy + 17} Q150 ${cy + 23} 157 ${cy + 17}" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round"/>`,
  ].join("");
}

/** O cachorrinho de cada pose, com o chão em y = 205 (depois deslocado para a base). */
function dog(pose: IlustracaoPose, paint: Paint, light: string, dark: string): string {
  const { body, fur } = paint;
  if (pose === "busto") {
    return [
      `<path d="M88 205 C88 158 112 124 150 118 C188 124 212 158 212 205 Z" fill="${body}"/>`,
      `<path d="M114 205 C120 168 134 148 150 140 C166 148 180 168 186 205 Z" fill="${light}" opacity=".55"/>`,
      head(paint, 86),
    ].join("");
  }
  if (pose === "na-pose") {
    return [
      `<path d="M200 196 C232 196 242 170 226 152 C226 172 212 182 192 184 Z" fill="${dark}"/>`,
      `<ellipse cx="150" cy="178" rx="64" ry="28" fill="${body}"/>`,
      `<ellipse cx="96" cy="200" rx="20" ry="8" fill="${fur}"/>`,
      `<ellipse cx="128" cy="204" rx="20" ry="8" fill="${fur}"/>`,
      `<g transform="translate(-52 56) scale(.9)">${head(paint, 86)}</g>`,
    ].join("");
  }
  // sentado
  return [
    `<path d="M196 196 C228 192 238 158 222 134 C220 158 208 170 188 176 Z" fill="${dark}"/>`,
    `<path d="M104 205 C88 168 96 124 128 104 L172 104 C204 124 212 168 196 205 Z" fill="${body}"/>`,
    `<path d="M120 205 C118 165 128 135 150 128 C172 135 182 165 180 205 Z" fill="${light}" opacity=".5"/>`,
    `<path d="M127 205 L127 162 Q127 151 138 151 L145 151 Q150 151 150 162 L150 205 Z" fill="${body}"/>`,
    `<path d="M150 205 L150 162 Q150 151 155 151 L162 151 Q173 151 173 162 L173 205 Z" fill="${body}"/>`,
    `<path d="M150 156 V204" stroke="${dark}" stroke-width="1.6" opacity=".45"/>`,
    `<ellipse cx="138" cy="204" rx="14" ry="5.5" fill="${fur}"/>`,
    `<ellipse cx="162" cy="204" rx="14" ry="5.5" fill="${fur}"/>`,
    head(paint, 84),
  ].join("");
}

/** O conteúdo do SVG (sem a tag <svg>), para embutir em outros desenhos. */
export function sculptureSvgBody({
  pose = "sentado",
  tint = "#f3f0e8",
  name,
  uid = "i",
}: IlustracaoOpcoes): string {
  const light = shade(tint, 0.3);
  const dark = shade(tint, -0.24);
  // detalhes do rosto: escuros no material claro, claros no escuro
  const ink = luminance(tint) > 0.38 ? shade(tint, -0.72) : shade(tint, 0.7);
  const text = (name ?? "").trim().toUpperCase().slice(0, 30);
  const size = Math.max(11, Math.min(22, 150 / Math.max(text.length, 1)));
  const width = Math.min(text.length * size * 0.72, 86);
  const paint: Paint = { body: `url(#b${uid})`, fur: `url(#f${uid})`, dark, ink };

  const letters = (y: number, fill: string) =>
    `<text x="150" y="${y}" text-anchor="middle" textLength="${width.toFixed(1)}" lengthAdjust="spacingAndGlyphs" fill="${fill}">${xmlEscape(text)}</text>`;

  return [
    `<defs>`,
    `<linearGradient id="b${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>`,
    `<linearGradient id="f${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${tint}"/></linearGradient>`,
    `<filter id="s${uid}" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="7"/></filter>`,
    `</defs>`,
    // sombra no chão
    `<ellipse cx="150" cy="292" rx="132" ry="16" fill="#000" opacity=".18" filter="url(#s${uid})"/>`,
    // base octogonal: faces laterais e topo
    `<polygon points="34.5,249.5 102.2,265.7 102.2,299.7 34.5,283.5" fill="${shade(tint, -0.14)}"/>`,
    `<polygon points="102.2,265.7 197.8,265.7 197.8,299.7 102.2,299.7" fill="${shade(tint, -0.05)}"/>`,
    `<polygon points="197.8,265.7 265.5,249.5 265.5,283.5 197.8,299.7" fill="${shade(tint, -0.24)}"/>`,
    `<polygon points="265.5,249.5 197.8,265.7 102.2,265.7 34.5,249.5 34.5,226.5 102.2,210.3 197.8,210.3 265.5,226.5" fill="${shade(tint, 0.1)}"/>`,
    // nome em relevo: sombra embaixo, luz em cima, letra por cima
    text
      ? `<g font-family="Georgia, 'Times New Roman', serif" font-weight="700" font-size="${size.toFixed(1)}">${letters(289.5, shade(tint, -0.34))}${letters(287.9, shade(tint, 0.34))}${letters(288.7, shade(tint, -0.05))}</g>`
      : "",
    // cachorrinho (desenhado com o chão em y = 205, deslocado para a base)
    `<g transform="translate(0 39)">${dog(pose, paint, light, dark)}</g>`,
  ].join("");
}

/** O SVG completo (com a tag), pronto para usar como imagem ou embutir no HTML. */
export function sculptureSvg(options: IlustracaoOpcoes & { label?: string }): string {
  const aria = options.label
    ? `role="img" aria-label="${xmlEscape(options.label)}"`
    : `aria-hidden="true" focusable="false"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${ILUSTRACAO_VIEWBOX}" ${aria}>${sculptureSvgBody(options)}</svg>`;
}
