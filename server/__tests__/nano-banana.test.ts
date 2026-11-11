import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { portraitCatalog } from "../../content/quadros";
import { loadConfig } from "../env";
import { resolveProviders } from "../providers";
import { createMockImageProvider } from "../providers/mock";
import { createNanoBananaProvider } from "../providers/nano-banana";
import { buildPortraitPrompt } from "../providers/prompts";
import type { ImageProvider, PortraitOptions } from "../providers/types";
import { OPTIONS, call, fakeJpeg, makeCtx, readyPreview } from "./helpers";

const config = () => loadConfig({
  NODE_ENV: "test", STORE: "memory", AUTH_PROVIDER: "memory", IMAGE_PROVIDER: "nano-banana",
  GEMINI_API_KEY: "test-key-never-real", GEMINI_ESTIMATED_COST_CENTS: "50", PREVIEW_DAILY_BUDGET_CENTS: "1000",
});
const portrait: PortraitOptions = {
  productType: "quadro", sizeId: "20x30", styleId: "aquarela", frameId: "natural", petName: "Luna",
  styleLabel: "Aquarela", stylePrompt: portraitCatalog.styles.find((s) => s.id === "aquarela")!.prompt,
  frameLabel: "Madeira natural", aspectRatio: "2:3",
};
const input = (options: Parameters<ImageProvider["submit"]>[0]["options"] = portrait): Parameters<ImageProvider["submit"]>[0] => ({
  photo: { url: "https://private.example/photo?token=secret", bytes: fakeJpeg(), contentType: "image/jpeg" },
  prompt: "Draw only this pet.", options,
});
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=", "base64");
const imagePart = { inlineData: { mimeType: "image/png", data: png.toString("base64") } };
const response = (parts: unknown[] = [imagePart]) => Response.json({ candidates: [{ finishReason: "STOP", content: { parts } }] });

describe("Nano Banana: protocolo, arquivos e falhas sem rede", () => {
  it("envia bytes inline e chave no header; entrega bytes para persistência imediata", async () => {
    let calls = 0;
    const provider = createNanoBananaProvider(config(), async (url, init) => {
      calls += 1;
      assert.equal(url, "https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent");
      assert.equal(new Headers(init?.headers).get("x-goog-api-key"), "test-key-never-real");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.contents[0].parts[0].text, "Draw only this pet.");
      assert.equal(body.contents[0].parts[1].inlineData.mimeType, "image/jpeg");
      assert.equal(body.contents[0].parts[1].inlineData.data, Buffer.from(fakeJpeg()).toString("base64"));
      assert.deepEqual(body.generationConfig.responseFormat.image, { aspectRatio: "2:3", imageSize: "1K" });
      assert.ok(!String(init?.body).includes("private.example"), "link privado não deve ir à IA");
      assert.ok(!String(init?.body).includes("test-key"));
      return response();
    });
    const result = await provider.submit(input());
    assert.equal(calls, 1);
    assert.equal(provider.estimatedCostCents, 50);
    assert.equal(result.costCents, undefined, "reserva já feita pelo serviço não deve contar duas vezes");
    assert.equal(result.result?.status, "succeeded");
    if (result.result?.status === "succeeded") assert.deepEqual(result.result.image.bytes, png);
    assert.ok(result.jobId.length < 60, "jobId nunca carrega base64 da imagem");
  });

  it("quadros não recebem referências de escultura; esculturas recebem as referências", async () => {
    const lengths: number[] = [];
    const ratios: string[] = [];
    const provider = createNanoBananaProvider(config(), async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      lengths.push(body.contents[0].parts.length);
      ratios.push(body.generationConfig.responseFormat.image.aspectRatio);
      return response();
    });
    const styleReferences = [{ bytes: png, contentType: "image/png" }];
    await provider.submit({ ...input(), styleReferences });
    await provider.submit({ ...input({ ...OPTIONS, colorHex: "#ffffff", colorLabel: "Branco", poseLabel: "Sentado" }), styleReferences });
    assert.deepEqual(lengths, [2, 3]);
    assert.deepEqual(ratios, ["2:3", "4:5"]);
  });

  it("ignora imagens de raciocínio e aceita somente a imagem final", async () => {
    const provider = createNanoBananaProvider(config(), async () => response([
      { thought: true, inlineData: { mimeType: "image/png", data: "invalid" } }, imagePart,
    ]));
    assert.equal((await provider.submit(input())).result?.status, "succeeded");
  });

  it("mapeia bloqueio de segurança e rejeição de foto para mensagem segura", async () => {
    for (const body of [
      { promptFeedback: { blockReason: "SAFETY" } },
      { candidates: [{ finishReason: "IMAGE_SAFETY" }] },
      { candidates: [{ content: { parts: [{ text: "PHOTO_REJECTED" }] } }] },
    ]) {
      const provider = createNanoBananaProvider(config(), async () => Response.json(body));
      const result = (await provider.submit(input())).result;
      assert.equal(result?.status, "failed");
      if (result?.status === "failed") assert.equal(result.code, "rejected");
    }
  });

  it("sem imagem retorna no_image em vez de inventar uma prévia", async () => {
    const provider = createNanoBananaProvider(config(), async () => response([{ text: "Please try again" }]));
    const result = (await provider.submit(input())).result;
    assert.equal(result?.status, "failed");
    if (result?.status === "failed") assert.equal(result.code, "no_image");
  });

  it("recusa SVG, MIME divergente, base64 malformado e respostas excessivas", async () => {
    const cases = [
      () => response([{ inlineData: { mimeType: "image/svg+xml", data: Buffer.from('<svg onload="alert(1)"/>').toString("base64") } }]),
      () => response([{ inlineData: { ...imagePart.inlineData, mimeType: "image/jpeg" } }]),
      () => response([{ inlineData: { mimeType: "image/png", data: "%%%" } }]),
      () => new Response("{}", { headers: { "content-length": String(30 * 1024 * 1024) } }),
      () => new Response("not-json"),
    ];
    for (const make of cases) {
      const provider = createNanoBananaProvider(config(), async () => make());
      assert.equal((await provider.submit(input())).result?.status, "failed");
    }
  });

  it("HTTP 429/401/503 não vaza resposta nem tenta cobrar novamente automaticamente", async () => {
    for (const status of [429, 401, 503]) {
      let calls = 0;
      const provider = createNanoBananaProvider(config(), async () => {
        calls += 1;
        return new Response("internal secret test-key-never-real", { status });
      });
      const result = await provider.submit(input());
      assert.equal(result.result?.status, "failed");
      assert.ok(!JSON.stringify(result).includes("secret"));
      assert.ok(!JSON.stringify(result).includes("test-key"));
      assert.equal(calls, 1);
    }
  });

  it("cancela uma chamada lenta e retorna timeout sem repetir a requisição", async () => {
    const provider = createNanoBananaProvider({ ...config(), geminiTimeoutMs: 5 }, async (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
      }));
    const result = (await provider.submit(input())).result;
    assert.equal(result?.status, "failed");
    if (result?.status === "failed") assert.equal(result.code, "timeout");
  });

  it("falha fechada com configuração live incompleta, modelo inválido ou orçamento ausente", () => {
    assert.throws(() => createNanoBananaProvider({ ...config(), geminiApiKey: undefined }), /GEMINI_API_KEY/);
    assert.throws(() => createNanoBananaProvider({ ...config(), geminiImageModel: "../../secret" }), /GEMINI_IMAGE_MODEL/);
    assert.throws(() => createNanoBananaProvider({ ...config(), geminiEstimatedCostCents: 0 }), /GEMINI_ESTIMATED_COST_CENTS/);
    assert.throws(() => createNanoBananaProvider({ ...config(), dailyBudgetCents: 0 }), /PREVIEW_DAILY_BUDGET_CENTS/);
    assert.throws(() => loadConfig({ GEMINI_TIMEOUT_MS: "60000" }), /GEMINI_TIMEOUT_MS/);
    assert.equal(resolveProviders(config()).image.name, "nano-banana");
  });
});

describe("quadros: prompt próprio e demonstração identificada", () => {
  it("preserva identidade, estilo, proporção e nome sem embutir moldura física na arte", () => {
    const prompt = buildPortraitPrompt(portrait);
    assert.match(prompt, /THIS individual pet/);
    assert.match(prompt, /watercolor painting/);
    assert.match(prompt, /aspect ratio 2:3/);
    assert.match(prompt, /"LUNA"/);
    assert.match(prompt, /do NOT draw a frame/);
    assert.match(prompt, /PHOTO_REJECTED/);
    assert.ok(!prompt.includes("STYLE REFERENCE"));
  });

  it("mock de quadro é independente do processo e escapa o nome no SVG", async () => {
    const first = createMockImageProvider(0);
    const job = await first.submit(input({ ...portrait, petName: '<script>&"' }));
    const second = createMockImageProvider(0);
    const result = await second.poll(job.jobId);
    assert.equal(result.status, "succeeded");
    if (result.status === "succeeded") {
      const svg = new TextDecoder().decode(result.image.bytes);
      assert.match(svg, /PRÉVIA DE DEMONSTRAÇÃO/);
      assert.match(svg, /não retrata a sua foto/);
      assert.ok(!svg.includes("<script>"));
      assert.match(svg, /&lt;script&gt;&amp;&quot;/);
    }
  });
});

describe("regeneração recuperável na API", () => {
  it("deferStart entrega o id antes de gerar; o start seguinte persiste resposta síncrona", async () => {
    const { ctx } = makeCtx();
    const source = await readyPreview(ctx);
    let calls = 0;
    const provider = createNanoBananaProvider(config(), async () => {
      calls += 1;
      return response();
    });
    ctx.providers.image = provider;
    ctx.config.dailyBudgetCents = 1000;
    const publicConfig = await call(ctx, "GET", "/api/config");
    assert.equal(publicConfig.body.mode, "live", "3D simulado não torna a prévia real uma demonstração");
    assert.equal(publicConfig.body.imageProvider.name, "nano-banana");
    assert.ok(!JSON.stringify(publicConfig.body).includes("test-key"));
    const created = await call(ctx, "POST", `/api/previews/${source}/regenerate`, {
      json: { options: portrait, deferStart: true },
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.status, "queued");
    assert.notEqual(created.body.id, source);
    assert.equal(calls, 0);
    const started = await call(ctx, "POST", `/api/previews/${created.body.id}/start`);
    assert.equal(started.status, 200);
    assert.equal(started.body.status, "ready");
    assert.equal(calls, 1);
    const stored = await ctx.store.getPreview(created.body.id);
    assert.equal(stored?.imageCostCents, 50);
    assert.ok(stored?.imagePath);
    assert.deepEqual((await ctx.files.get(stored!.imagePath!))?.bytes, new Uint8Array(png));
    const polled = await call(ctx, "GET", `/api/previews/${created.body.id}`);
    assert.equal(polled.body.status, "ready", "leitura posterior usa o Storage, não um job em memória");
    assert.equal(calls, 1);
  });
});
