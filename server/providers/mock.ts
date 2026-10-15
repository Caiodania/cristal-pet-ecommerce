// Provedores SIMULADOS. Deixam a loja inteira funcionando (upload, prévia,
// pedido, painel, download) sem chave de API nem custo. A imagem é um desenho
// com a marca "PRÉVIA DE DEMONSTRAÇÃO" e o arquivo 3D é um STL de teste (um
// "boneco de neve"): abre no fatiador, mas não é a escultura do pet.
//
// O jobId carrega todos os dados do trabalho (base64url), então o provedor não
// guarda estado: funciona mesmo quando cada requisição cai numa instância
// diferente da função.
//
// Gatilhos de teste (pelo NOME do pet): "falhaimg" faz a imagem falhar,
// "recusar" simula foto recusada, "falha3d" faz o arquivo 3D falhar.

import type { ImageProvider, ModelPoll, PrintModelProvider } from "./types";

type Job = { t: number; d: number; name: string; hex: string; pose: string; h: number | null };

const encodeJob = (job: Job) => `mock.${Buffer.from(JSON.stringify(job)).toString("base64url")}`;

function decodeJob(jobId: string): Job {
  if (!jobId.startsWith("mock.")) throw new Error("jobId não é do provedor simulado");
  return JSON.parse(Buffer.from(jobId.slice(5), "base64url").toString("utf8")) as Job;
}

const xmlEscape = (s: string) =>
  s.replace(/[<>&"']/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[c]!);

/** Clareia (amount > 0) ou escurece (amount < 0) uma cor #rrggbb. */
function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.replace("#", ""), 16);
  const channel = (shift: number) => {
    const value = (n >> shift) & 255;
    const mixed = amount >= 0 ? value + (255 - value) * amount : value * (1 + amount);
    return Math.max(0, Math.min(255, Math.round(mixed)));
  };
  return `#${[16, 8, 0].map((s) => channel(s).toString(16).padStart(2, "0")).join("")}`;
}

function statueSvg({ hex, pose, name }: { hex: string; pose: string; name: string }): string {
  const light = shade(hex, 0.25);
  const dark = shade(hex, -0.25);
  const bust = /busto/i.test(pose);
  const body = bust
    ? `<path d="M210 760 Q230 560 400 540 Q570 560 590 760 Z" fill="url(#m)"/>`
    : `<ellipse cx="400" cy="650" rx="175" ry="195" fill="url(#m)"/>`;
  const label = name ? xmlEscape(name) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#efede8"/><stop offset="1" stop-color="#d8d4cc"/></linearGradient>
<linearGradient id="m" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
<filter id="b"><feGaussianBlur stdDeviation="14"/></filter>
</defs>
<rect width="800" height="1000" fill="url(#bg)"/>
<text x="400" y="64" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#4a463f">PRÉVIA DE DEMONSTRAÇÃO</text>
<text x="400" y="98" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#5f5b55">Simulada: não é a escultura final</text>
<ellipse cx="400" cy="880" rx="270" ry="38" fill="#000" opacity=".2" filter="url(#b)"/>
<rect x="180" y="790" width="440" height="84" rx="18" fill="url(#m)"/>
${body}
<path d="M285 330 L240 175 L360 255 Z" fill="${dark}"/><path d="M515 330 L560 175 L440 255 Z" fill="${dark}"/>
<circle cx="400" cy="400" r="140" fill="url(#m)"/>
<ellipse cx="400" cy="455" rx="66" ry="48" fill="${light}"/>
<ellipse cx="400" cy="436" rx="24" ry="15" fill="${dark}"/>
<circle cx="350" cy="380" r="13" fill="${dark}"/><circle cx="450" cy="380" r="13" fill="${dark}"/>
<text x="400" y="843" text-anchor="middle" font-family="sans-serif" font-size="32" font-weight="700" fill="${shade(hex, -0.65)}">${label}</text>
</svg>`;
}

// ───────── STL de teste: base cilíndrica + dois "gomos" esféricos ─────────

type V3 = [number, number, number];

function stlText(triangles: [V3, V3, V3][]): string {
  const lines = ["solid cristal_mock"];
  for (const [a, b, c] of triangles) {
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    n = n.map((x) => x / len);
    lines.push(
      `  facet normal ${n[0].toFixed(6)} ${n[1].toFixed(6)} ${n[2].toFixed(6)}`,
      "    outer loop",
      ...[a, b, c].map((p) => `      vertex ${p[0].toFixed(4)} ${p[1].toFixed(4)} ${p[2].toFixed(4)}`),
      "    endloop",
      "  endfacet",
    );
  }
  lines.push("endsolid cristal_mock");
  return lines.join("\n") + "\n";
}

function mockStl(heightMm: number | null): string {
  const H = heightMm ?? 100;
  const tris: [V3, V3, V3][] = [];
  const seg = 28;

  // base: cilindro fechado
  const r = H * 0.32;
  const h = H * 0.07;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const p0: V3 = [r * Math.cos(a0), r * Math.sin(a0), 0];
    const p1: V3 = [r * Math.cos(a1), r * Math.sin(a1), 0];
    const q0: V3 = [p0[0], p0[1], h];
    const q1: V3 = [p1[0], p1[1], h];
    tris.push([p0, p1, q1], [p0, q1, q0]); // lateral
    tris.push([[0, 0, 0], p1, p0]); // fundo
    tris.push([[0, 0, h], q0, q1]); // topo
  }

  // esfera genérica (fechada)
  const sphere = (radius: number, cz: number) => {
    const lat = 10;
    const lon = 20;
    const pt = (i: number, j: number): V3 => {
      const th = (i / lat) * Math.PI;
      const ph = (j / lon) * Math.PI * 2;
      return [radius * Math.sin(th) * Math.cos(ph), radius * Math.sin(th) * Math.sin(ph), cz + radius * Math.cos(th)];
    };
    for (let i = 0; i < lat; i++) {
      for (let j = 0; j < lon; j++) {
        const a = pt(i, j);
        const b = pt(i + 1, j);
        const c = pt(i + 1, j + 1);
        const d = pt(i, j + 1);
        if (i > 0) tris.push([a, d, c]);
        if (i < lat - 1) tris.push([a, c, b]);
      }
    }
  };
  sphere(H * 0.26, h + H * 0.26 - 1); // "corpo"
  sphere(H * 0.17, h + H * 0.26 * 2 + H * 0.17 - 3); // "cabeça"
  return stlText(tris);
}

// ───────── Provedores ─────────

export function createMockImageProvider(delayMs: number): ImageProvider {
  return {
    name: "mock",
    mode: "mock",

    async submit({ options }) {
      return {
        jobId: encodeJob({
          t: Date.now(),
          d: delayMs,
          name: options.petName ?? "",
          hex: options.colorHex,
          pose: options.poseLabel,
          h: null,
        }),
        costCents: 0,
      };
    },

    async poll(jobId) {
      const job = decodeJob(jobId);
      if (Date.now() - job.t < job.d) return { status: "processing" };
      if (/falhaimg/i.test(job.name)) {
        return { status: "failed", code: "provider_error", message: "Falha simulada na geração da imagem." };
      }
      if (/recusar/i.test(job.name)) {
        return { status: "failed", code: "rejected", message: "Foto recusada (simulação): envie outra foto." };
      }
      return {
        status: "succeeded",
        image: {
          bytes: new TextEncoder().encode(statueSvg({ hex: job.hex, pose: job.pose, name: job.name })),
          contentType: "image/svg+xml",
        },
        costCents: 0,
      };
    },
  };
}

export function createMockModelProvider(delayMs: number): PrintModelProvider {
  return {
    name: "mock",
    mode: "mock",

    async submit({ heightMm, options }) {
      return {
        jobId: encodeJob({
          t: Date.now(),
          d: delayMs,
          name: options.petName ?? "",
          hex: options.colorHex,
          pose: options.poseLabel,
          h: heightMm,
        }),
        costCents: 0,
      };
    },

    async poll(jobId): Promise<ModelPoll> {
      const job = decodeJob(jobId);
      if (Date.now() - job.t < job.d) return { status: "processing" };
      if (/falha3d/i.test(job.name)) {
        return { status: "failed", code: "provider_error", message: "Falha simulada na geração do arquivo 3D." };
      }
      return {
        status: "succeeded",
        stl: { bytes: new TextEncoder().encode(mockStl(job.h)), contentType: "model/stl" },
        costCents: 0,
      };
    },
  };
}
