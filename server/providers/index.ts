// Registro dos provedores de IA. Para ligar um fornecedor de verdade:
//
//   1. crie um arquivo (ex.: providers/openai-image.ts) que implemente
//      `ImageProvider` ou `PrintModelProvider` (veja types.ts);
//   2. registre a fábrica abaixo;
//   3. na Netlify, defina IMAGE_PROVIDER=openai-image (ou MODEL_PROVIDER=...)
//      e a chave do fornecedor (variável de ambiente).
//
// Detalhes e checklist em docs/backend.md.

import type { ServerConfig } from "../env";
import { createMockImageProvider, createMockModelProvider } from "./mock";
import type { ImageProvider, PrintModelProvider } from "./types";

const imageProviders: Record<string, (config: ServerConfig) => ImageProvider> = {
  mock: (config) => createMockImageProvider(config.mockDelayMs),
  // exemplo: "openai-image": (config) => createOpenAiImageProvider(process.env.OPENAI_API_KEY!),
};

const modelProviders: Record<string, (config: ServerConfig) => PrintModelProvider> = {
  mock: (config) => createMockModelProvider(config.mockDelayMs),
  // exemplo: meshy: (config) => createMeshyProvider(process.env.MESHY_API_KEY!),
};

export type Providers = { image: ImageProvider; model: PrintModelProvider };

export function resolveProviders(config: ServerConfig): Providers {
  const makeImage = imageProviders[config.imageProvider];
  if (!makeImage) {
    throw new Error(
      `IMAGE_PROVIDER="${config.imageProvider}" não está registrado. Disponíveis: ${Object.keys(imageProviders).join(", ")}.`,
    );
  }
  const makeModel = modelProviders[config.modelProvider];
  if (!makeModel) {
    throw new Error(
      `MODEL_PROVIDER="${config.modelProvider}" não está registrado. Disponíveis: ${Object.keys(modelProviders).join(", ")}.`,
    );
  }
  return { image: makeImage(config), model: makeModel(config) };
}
