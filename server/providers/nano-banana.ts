// Gemini é síncrono: a resposta volta para o serviço, que salva a imagem no
// Storage antes de responder ao navegador. Nenhum job ou imagem fica em RAM
// entre chamadas da Netlify. Contrato REST oficial: docs/nano-banana.md.
import { randomUUID } from "node:crypto";
import type { ServerConfig } from "../env";
import { sniffImage } from "../validate";
import type { Failure, ImageProvider, ImageSubmission, SourceImage, StyleReference } from "./types";

const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
const MAX_RESPONSE_BYTES = 18 * 1024 * 1024;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const rejected = (): Failure => ({
  status: "failed", code: "rejected",
  message: "Não foi possível usar esta foto. Envie uma imagem nítida de apenas um pet.",
});
const failure = (code: string, message: string): Failure => ({ status: "failed", code, message });

type GeminiPart = {
  text?: string;
  thought?: boolean;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
};
type GeminiResponse = {
  promptFeedback?: { blockReason?: string };
  candidates?: { finishReason?: string; content?: { parts?: GeminiPart[] } }[];
};

async function readLimitedJson(response: Response): Promise<GeminiResponse> {
  if (Number(response.headers.get("content-length") ?? 0) > MAX_RESPONSE_BYTES) {
    throw new Error("response_too_large");
  }
  if (!response.body) throw new Error("response_missing");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_RESPONSE_BYTES) throw new Error("response_too_large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("invalid_response");
  return parsed as GeminiResponse;
}

function inlineImage(image: SourceImage | StyleReference) {
  const actual = sniffImage(image.bytes);
  if (!actual || actual.contentType !== image.contentType || image.bytes.byteLength > MAX_INPUT_BYTES) {
    throw new Error("invalid_input_image");
  }
  return { inlineData: { mimeType: actual.contentType, data: Buffer.from(image.bytes).toString("base64") } };
}

function decodeImage(part: GeminiPart): { bytes: Uint8Array; contentType: string } | undefined {
  if (part.thought) return undefined;
  const inline = part.inlineData ?? (part.inline_data
    ? { data: part.inline_data.data, mimeType: part.inline_data.mime_type }
    : undefined);
  if (!inline) return undefined;
  const { data, mimeType } = inline;
  if (typeof data !== "string" || !data || data.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4 ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data)) {
    throw new Error("invalid_image_data");
  }
  const bytes = Buffer.from(data, "base64");
  const actual = sniffImage(bytes);
  if (!actual || actual.contentType !== mimeType || bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new Error("invalid_image_type");
  }
  return { bytes, contentType: actual.contentType };
}

/** fetcher é injetável para testar o protocolo sem rede, chaves reais ou cobrança. */
export function createNanoBananaProvider(config: ServerConfig, fetcher: typeof fetch = fetch): ImageProvider {
  if (!config.geminiApiKey) throw new Error("IMAGE_PROVIDER=nano-banana exige GEMINI_API_KEY no servidor.");
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{1,119}$/.test(config.geminiImageModel)) {
    throw new Error("GEMINI_IMAGE_MODEL deve ser um identificador de modelo Gemini válido.");
  }
  if (!Number.isSafeInteger(config.geminiEstimatedCostCents) || config.geminiEstimatedCostCents <= 0) {
    throw new Error("Configure GEMINI_ESTIMATED_COST_CENTS com uma reserva de custo positiva por prévia.");
  }
  if (config.dailyBudgetCents <= 0) {
    throw new Error("IMAGE_PROVIDER=nano-banana exige PREVIEW_DAILY_BUDGET_CENTS maior que zero.");
  }

  return {
    name: "nano-banana",
    mode: "live",
    estimatedCostCents: config.geminiEstimatedCostCents,
    async submit({ photo, options, prompt, styleReferences = [] }): Promise<ImageSubmission> {
      const jobId = `gemini.${randomUUID()}`;
      const done = (result: ImageSubmission["result"]): ImageSubmission => ({ jobId, result });
      // A cobrança já foi reservada atomicamente pelo serviço. Falhas incertas
      // mantêm essa estimativa: o cancelamento local não garante estorno no Google.
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), config.geminiTimeoutMs);
      try {
        const refs = options.productType === "quadro" ? [] : styleReferences;
        if (refs.length > 3 || photo.bytes.byteLength + refs.reduce((n, ref) => n + ref.bytes.byteLength, 0) > MAX_INPUT_BYTES) {
          return done(failure("invalid_image", "As imagens de referência são grandes demais. Fale com a loja."));
        }
        const response = await fetcher(
          `https://generativelanguage.googleapis.com/v1/models/${config.geminiImageModel}:generateContent`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": config.geminiApiKey! },
            signal: controller.signal,
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }, inlineImage(photo), ...refs.map(inlineImage)] }],
              generationConfig: {
                responseModalities: ["TEXT", "IMAGE"],
                responseFormat: {
                  image: { aspectRatio: options.productType === "quadro" ? options.aspectRatio : "4:5", imageSize: "1K" },
                },
              },
            }),
          },
        );
        if (!response.ok) {
          await response.body?.cancel().catch(() => undefined);
          // Nunca repassa a resposta bruta, URLs, chaves ou detalhes internos ao cliente.
          if (response.status === 429) return done(failure("provider_busy", "A geração está ocupada. Aguarde um pouco e tente novamente."));
          if ([400, 401, 403, 404].includes(response.status)) {
            return done(failure("provider_unavailable", "A geração está temporariamente indisponível. Fale com a loja pelo WhatsApp."));
          }
          return done(failure("provider_error", "Não foi possível gerar a prévia agora. Tente novamente mais tarde."));
        }
        const data = await readLimitedJson(response);
        const blocked = data.promptFeedback?.blockReason;
        if (blocked && blocked !== "BLOCK_REASON_UNSPECIFIED") return done(rejected());
        const candidate = data.candidates?.[0];
        if (["SAFETY", "IMAGE_SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "RECITATION", "IMAGE_RECITATION"].includes(candidate?.finishReason ?? "")) {
          return done(rejected());
        }
        const parts = candidate?.content?.parts ?? [];
        const text = parts.filter((part) => !part.thought).map((part) => part.text ?? "").join(" ").trim();
        if (/^PHOTO_REJECTED[.!]?$/i.test(text)) return done(rejected());
        for (const part of parts) {
          const image = decodeImage(part);
          if (image) return done({ status: "succeeded", image });
        }
        return done(failure("no_image", "A IA não devolveu uma imagem. Tente uma foto mais nítida ou fale com a loja."));
      } catch {
        return done(controller.signal.aborted
          ? failure("timeout", "A prévia demorou além do esperado. Aguarde um pouco antes de tentar novamente.")
          : failure("provider_error", "Não foi possível gerar a prévia agora. Tente novamente mais tarde."));
      } finally {
        clearTimeout(timer);
      }
    },
    async poll() {
      // Não existe job remoto para consultar no generateContent. O serviço só
      // chega aqui se um deploy antigo perdeu a resposta antes de persistir.
      return failure("result_missing", "A geração foi interrompida. Tente novamente ou fale com a loja.");
    },
  };
}
