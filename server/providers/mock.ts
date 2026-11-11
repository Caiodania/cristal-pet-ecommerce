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

import { ILUSTRACAO_VIEWBOX, sculptureSvgBody } from "../../lib/loja/ilustracao";
import type { ImageProvider, ModelPoll, PrintModelProvider } from "./types";

type Job = { t: number; d: number; name: string; hex: string; pose: string; h: number | null; productType?: "quadro"; style?: string; frame?: string; ratio?: string };

const encodeJob = (job: Job) => `mock.${Buffer.from(JSON.stringify(job)).toString("base64url")}`;

function decodeJob(jobId: string): Job {
  if (!jobId.startsWith("mock.")) throw new Error("jobId não é do provedor simulado");
  return JSON.parse(Buffer.from(jobId.slice(5), "base64url").toString("utf8")) as Job;
}

/**
 * A imagem da prévia simulada: a ilustração da escultura (a mesma do configurador,
 * lib/loja/ilustracao.ts), na cor e na pose escolhidas e com o nome em relevo na
 * base, sob a faixa "PRÉVIA DE DEMONSTRAÇÃO". O nome do cliente é escapado lá.
 */
function statueSvg({ hex, pose, name }: { hex: string; pose: string; name: string }): string {
  const sculpture = sculptureSvgBody({ pose: poseId(pose), tint: hex, name, uid: "m" });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#eff2f8"/><stop offset="1" stop-color="#dde2ea"/></linearGradient></defs>
<rect width="800" height="1000" fill="url(#bg)"/>
<text x="400" y="64" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#0b2347">PRÉVIA DE DEMONSTRAÇÃO</text>
<text x="400" y="98" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#40506a">Simulada: não é a escultura final</text>
<svg x="40" y="190" width="720" height="624" viewBox="${ILUSTRACAO_VIEWBOX}">${sculpture}</svg>
</svg>`;
}

/** O provedor recebe o rótulo do tipo ("Busto"); a ilustração pede o id. */
const poseId = (label: string) => (/busto/i.test(label) ? "busto" : /pose|foto/i.test(label) ? "na-pose" : "sentado");

const xmlEscape = (value: string) => value.replace(/[<>&"']/g, (char) =>
  ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!);

/** Ilustração genérica, explicitamente marcada: não usa nem finge retratar a foto. */
function portraitSvg(job: Job): string {
  const watercolor = job.style === "aquarela";
  const royal = job.style === "real";
  const h = job.ratio === "3:4" ? 1066 : 1200;
  const frame = job.frame === "branca" ? "#dedbd4" : job.frame === "natural" ? "#bc956c" : "#252525";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="${h}" viewBox="0 0 800 ${h}">
<rect width="800" height="${h}" fill="#eef1f5"/>
<text x="400" y="65" text-anchor="middle" font-family="sans-serif" font-size="26" font-weight="700" fill="#0b2347">PRÉVIA DE DEMONSTRAÇÃO</text>
<text x="400" y="101" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#40506a">Ilustração genérica: não retrata a sua foto</text>
<rect x="66" y="150" width="668" height="${h - 220}" fill="${frame}"/>
<rect x="88" y="172" width="624" height="${h - 264}" fill="${royal ? "#28374e" : "#faf7f0"}"/>
${watercolor ? '<g opacity=".35"><ellipse cx="310" cy="430" rx="165" ry="175" fill="#a5cad0"/><ellipse cx="505" cy="510" rx="135" ry="160" fill="#e2bda1"/></g>' : ""}
<g transform="translate(0 ${h === 1066 ? 0 : 50})">
${royal ? '<path d="M195 790L240 610Q400 530 560 610L605 790Z" fill="#913a46"/><path d="M310 602L400 765L490 602" fill="#e5d6b7"/>' : '<ellipse cx="400" cy="683" rx="175" ry="128" fill="#c69a71"/>'}
<ellipse cx="255" cy="435" rx="72" ry="140" fill="#8a6148"/>
<ellipse cx="545" cy="435" rx="72" ry="140" fill="#8a6148"/>
<ellipse cx="400" cy="455" rx="158" ry="173" fill="#c69a71"/>
<path d="M385 294Q355 402 372 525L428 525Q445 402 415 294Z" fill="#f5e8d6"/>
<ellipse cx="341" cy="438" rx="16" ry="21" fill="#252525"/><ellipse cx="459" cy="438" rx="16" ry="21" fill="#252525"/>
<ellipse cx="400" cy="523" rx="73" ry="53" fill="#f5e8d6"/>
<path d="M372 507Q400 488 428 507Q421 535 400 538Q379 535 372 507" fill="#252525"/>
<path d="M400 536V555M400 555Q377 575 361 551M400 555Q423 575 439 551" fill="none" stroke="#252525" stroke-width="5" stroke-linecap="round"/>
</g>
<text x="400" y="${h - 160}" text-anchor="middle" font-family="serif" font-size="42" fill="${royal ? "#f5e8d6" : "#0b2347"}">${xmlEscape(job.name || "Seu pet")}</text>
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
    estimatedCostCents: 0,

    async submit({ options }) {
      return {
        jobId: encodeJob({
          t: Date.now(),
          d: delayMs,
          name: options.petName ?? "",
          hex: options.productType === "quadro" ? "#c69a71" : options.colorHex,
          pose: options.productType === "quadro" ? "" : options.poseLabel,
          h: null,
          ...(options.productType === "quadro" ? { productType: "quadro" as const, style: options.styleId, frame: options.frameId, ratio: options.aspectRatio } : {}),
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
          bytes: new TextEncoder().encode(job.productType === "quadro" ? portraitSvg(job) : statueSvg({ hex: job.hex, pose: job.pose, name: job.name })),
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
      if (Date.now() - job.t < job.d) {
        return { status: "processing", progress: Math.min(95, Math.floor(((Date.now() - job.t) / job.d) * 100)) };
      }
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
