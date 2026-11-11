// Contratos dos provedores de IA. É AQUI que se pluga uma API de verdade:
// cada provedor é um arquivo que implementa uma destas interfaces e se
// registra em providers/index.ts. O resto do servidor não conhece fornecedor
// nenhum. Passo a passo em docs/backend.md ("Como ligar uma IA de verdade").
//
// Modelo de execução: `submit` devolve jobId para polling ou também `result`
// para geração síncrona (Gemini). Nesse caso o serviço persiste os bytes antes
// de responder; nenhum trabalho depende da vida da instância da função.

import type { PortraitConfig, SculptureConfig } from "../../lib/loja/tipos";

/** Um arquivo devolvido pelo provedor: bytes na mão ou um link para baixar. */
export type FileRef = {
  bytes?: Uint8Array;
  /** Links de provedores costumam expirar: o servidor baixa e guarda a cópia. */
  url?: string;
  contentType: string;
};

/** Imagem que mostra o ESTILO desejado (acabamento, base, luz), não o pet. */
export type StyleReference = {
  bytes: Uint8Array;
  contentType: string;
};

/** A imagem de entrada, nos dois formatos (cada fornecedor pede um). */
export type SourceImage = {
  /** Link temporário (1 h) para o provedor buscar sozinho. */
  url: string;
  bytes: Uint8Array;
  contentType: string;
};

/** As escolhas do cliente, já com os nomes legíveis para montar o prompt. */
export type StatueOptions = SculptureConfig & {
  poseLabel: string;
  colorLabel: string;
  colorHex: string;
};

export type PortraitOptions = PortraitConfig & {
  styleLabel: string;
  stylePrompt: string;
  frameLabel: string;
  aspectRatio: string;
};

export type ImageOptions = StatueOptions | PortraitOptions;

export type Failure = {
  status: "failed";
  /**
   * "rejected" = a FOTO não serve (sem pet, vários pets, imagem imprópria):
   * o cliente é orientado a trocar de foto. Qualquer outro código = erro do
   * provedor ou nosso: o cliente pode tentar de novo.
   */
  code: "rejected" | string;
  message: string;
};

// ───────── Slot 1: foto do pet → imagem da escultura ─────────

export type ImagePoll =
  | { status: "processing" }
  | { status: "succeeded"; image: FileRef; costCents?: number }
  | Failure;

/** Provedores síncronos entregam os bytes para o serviço persistir antes de responder. */
export type ImageSubmission = {
  jobId: string;
  costCents?: number;
  result?: Exclude<ImagePoll, { status: "processing" }>;
};

export interface ImageProvider {
  readonly name: string;
  /** "mock" = simulado (o site avisa "modo demonstração"). */
  readonly mode: "mock" | "live";
  /** Reserva conservadora do custo por tentativa, feita atomicamente antes do envio. */
  readonly estimatedCostCents?: number;
  submit(input: {
    photo: SourceImage;
    /** Prompt já montado (veja providers/prompts.ts, é o lugar de afinar o resultado). */
    prompt: string;
    /**
     * Imagens de referência de estilo, na ordem em que o prompt as cita (a foto do
     * cliente é a primeira imagem; estas vêm depois). Vazio = nenhuma.
     */
    styleReferences?: StyleReference[];
    options: ImageOptions;
  }): Promise<ImageSubmission>;
  poll(jobId: string): Promise<ImagePoll>;
}

// ───────── Slot 2: imagem da escultura → arquivo pronto para a impressora 3D ─────────

export type ModelPoll =
  | {
      status: "processing";
      /** Andamento de 0 a 100, se o provedor informar (o painel mostra a barra). */
      progress?: number;
    }
  | {
      status: "succeeded";
      /** Obrigatório: o arquivo que vai para o fatiador da impressora. */
      stl: FileRef;
      /** Opcional: modelo para visualizar no navegador. */
      glb?: FileRef;
      costCents?: number;
    }
  | Failure;

/**
 * "Imagem → arquivo pronto para imprimir". Pode ser UMA API (ex.: imagem→3D com
 * exportação STL) ou VÁRIAS encadeadas dentro do adaptador (imagem→malha, depois
 * reparo/fechamento da malha, base plana e escala pela altura). O servidor só
 * espera um STL no final.
 */
export interface PrintModelProvider {
  readonly name: string;
  readonly mode: "mock" | "live";
  submit(input: {
    image: SourceImage;
    /** Altura final da peça em milímetros (null = o dono ainda não definiu). */
    heightMm: number | null;
    options: StatueOptions;
  }): Promise<{ jobId: string; costCents?: number }>;
  poll(jobId: string): Promise<ModelPoll>;
}
