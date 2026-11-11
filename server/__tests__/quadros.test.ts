import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Ctx } from "../context";
import type { ImageProvider } from "../providers/types";
import { CUSTOMER, OPTIONS, adminCookie, call, fakeJpeg, makeCtx, readyPreview } from "./helpers";

const PORTRAIT = { productType: "quadro", sizeId: "30x40", styleId: "aquarela", frameId: "natural", petName: "Mel" };

async function uploadedPreview(ctx: Ctx, options = PORTRAIT): Promise<string> {
  const created = await call(ctx, "POST", "/api/previews", { json: { options } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.id as string;
  assert.equal((await call(ctx, "PUT", `/api/previews/${id}/photo`, { body: fakeJpeg() as BodyInit })).status, 200);
  return id;
}

async function orderFor(ctx: Ctx, previewIds: string[]) {
  const response = await call(ctx, "POST", "/api/orders", {
    json: { previewIds, customer: CUSTOMER, consent: true, estimateCents: 1, items: [{ productType: "escultura" }] },
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const cookie = await adminCookie(ctx);
  const list = await call(ctx, "GET", `/api/admin/orders?q=${response.body.order.code}`, { cookie });
  const summary = list.body.orders[0];
  const admin = await call(ctx, "GET", `/api/admin/orders/${summary.id}`, { cookie });
  return { response: response.body, summary, admin: admin.body, cookie };
}

describe("quadros e pedidos mistos", () => {
  it("preserva escultura sem productType e congela escolhas do quadro, sem aceitar preço/opções do checkout", async () => {
    const { ctx } = makeCtx();
    const sculptureId = await readyPreview(ctx);
    const portraitId = await readyPreview(ctx, { options: PORTRAIT });
    const { response, summary, admin } = await orderFor(ctx, [sculptureId, portraitId]);
    assert.equal(response.order.estimateCents, null);
    assert.equal(response.order.items[0].poseId, OPTIONS.poseId);
    assert.equal(response.order.items[0].colorId, OPTIONS.colorId);
    const portrait = response.order.items[1];
    for (const [key, value] of Object.entries(PORTRAIT)) assert.equal(portrait[key], value);
    assert.equal(portrait.poseId, undefined);
    assert.equal(portrait.colorId, undefined);
    assert.equal(summary.portraitCount, 1);
    assert.equal(summary.sculptureCount, 1);
    assert.equal(admin.items[1].model.status, "none");
    assert.equal(admin.items[1].heightCm, null);
    assert.ok(admin.items[1].photoDownloadUrl);
    assert.ok(admin.items[1].imageDownloadUrl);
    assert.equal(admin.address.cep, "13330000");
    const persisted = await ctx.store.getOrderById(admin.id);
    assert.equal(persisted?.items[1].catalogVersion, "quadros-provisorio-1");
    const publicOrder = await call(ctx, "GET", `/api/orders/${response.order.code}?t=${response.token}`, { anonymous: true });
    assert.equal(publicOrder.body.items[1].frameId, "natural");
    assert.equal(publicOrder.body.address, undefined);
  });

  it("bloqueia início e consulta de 3D de quadro, inclusive quando há arquivo legado indevido", async () => {
    const { ctx } = makeCtx();
    const id = await readyPreview(ctx, { options: PORTRAIT });
    let modelCalls = 0;
    ctx.providers.model.submit = async () => { modelCalls++; throw new Error("3D não deveria ser chamado"); };
    const { admin, cookie } = await orderFor(ctx, [id]);
    const path = `/api/admin/orders/${admin.id}/items/${admin.items[0].id}/model`;
    for (const method of ["POST", "GET"]) {
      const result = await call(ctx, method, path, { cookie, ...(method === "POST" ? { json: { regenerate: true } } : {}) });
      assert.equal(result.status, 409);
      assert.equal(result.body.error.code, "model_not_applicable");
    }
    await ctx.store.updatePreview(id, { modelStatus: "ready", stlPath: "models/indevido.stl" });
    const detail = await call(ctx, "GET", `/api/admin/orders/${admin.id}`, { cookie });
    assert.deepEqual(detail.body.items[0].model, { status: "none" });
    assert.equal(modelCalls, 0);
  });

  for (const auto of ["order", "confirmed"]) {
    it(`MODEL_AUTO=${auto} gera somente as esculturas de um pedido misto`, async () => {
      const { ctx } = makeCtx({ MODEL_AUTO: auto });
      const sculpture = await readyPreview(ctx);
      const portrait = await readyPreview(ctx, { options: PORTRAIT });
      const { admin, cookie } = await orderFor(ctx, [sculpture, portrait]);
      if (auto === "confirmed") {
        const confirmed = await call(ctx, "PATCH", `/api/admin/orders/${admin.id}`, { cookie, json: { status: "confirmed" } });
        assert.equal(confirmed.status, 200);
      }
      assert.equal((await ctx.store.getPreview(sculpture))?.modelStatus, "processing");
      assert.equal((await ctx.store.getPreview(portrait))?.modelStatus, "none");
    });
  }

  it("compartilha cota entre produtos e recusa opções incompatíveis sem consumir a cota", async () => {
    const { ctx } = makeCtx({ PREVIEWS_PER_ACCOUNT: "2" });
    for (const options of [
      { ...PORTRAIT, productType: "desconhecido" },
      { ...PORTRAIT, sizeId: "media" },
      { ...PORTRAIT, styleId: "sentado" },
      { ...PORTRAIT, frameId: "inexistente" },
    ]) {
      assert.equal((await call(ctx, "POST", "/api/previews", { json: { options } })).status, 400);
    }
    await readyPreview(ctx);
    await readyPreview(ctx, { options: PORTRAIT });
    const third = await call(ctx, "POST", "/api/previews", { json: { options: PORTRAIT } });
    assert.equal(third.status, 403);
    assert.equal(third.body.error.code, "quota_exceeded");
  });

  it("deferStart retorna a nova reserva com foto antes de iniciar o provedor", async () => {
    const { ctx } = makeCtx();
    const source = await readyPreview(ctx, { options: PORTRAIT });
    let calls = 0;
    const submit = ctx.providers.image.submit.bind(ctx.providers.image);
    ctx.providers.image.submit = async (input) => { calls++; return submit(input); };
    const cloned = await call(ctx, "POST", `/api/previews/${source}/regenerate`, {
      json: { deferStart: true, options: { ...PORTRAIT, styleId: "realista" } },
    });
    assert.equal(cloned.status, 201);
    assert.equal(cloned.body.status, "queued");
    assert.equal(cloned.body.options.styleId, "realista");
    assert.equal(cloned.body.remaining, 1);
    assert.equal(calls, 0);
    assert.equal((await ctx.store.getPreview(cloned.body.id))?.photoPath, (await ctx.store.getPreview(source))?.photoPath);
    assert.equal((await call(ctx, "POST", `/api/previews/${cloned.body.id}/start`)).status, 200);
    assert.equal(calls, 1);
  });
});

describe("reserva e persistência da geração síncrona", () => {
  it("duas chamadas simultâneas pagam por uma só geração e polling aguarda a persistência dos bytes", async () => {
    const { ctx } = makeCtx({ PREVIEW_DAILY_BUDGET_CENTS: "100" });
    const id = await uploadedPreview(ctx);
    let submitted = 0;
    let polled = 0;
    let releaseSave!: () => void;
    let saving!: () => void;
    const saveGate = new Promise<void>((resolve) => { releaseSave = resolve; });
    const enteredSave = new Promise<void>((resolve) => { saving = resolve; });
    const put = ctx.files.put.bind(ctx.files);
    ctx.files.put = async (path, bytes, contentType) => {
      if (path.startsWith("images/")) { saving(); await saveGate; }
      return put(path, bytes, contentType);
    };
    ctx.providers.image = {
      name: "sync-test", mode: "live", estimatedCostCents: 20,
      async submit(input) {
        submitted++;
        assert.equal(input.options.productType, "quadro");
        assert.deepEqual(input.styleReferences, []);
        return { jobId: "opaque-job", result: { status: "succeeded", image: { bytes: fakeJpeg(), contentType: "image/jpeg" } } };
      },
      async poll() { polled++; throw new Error("provedor síncrono não tem job para polling"); },
    };
    const first = call(ctx, "POST", `/api/previews/${id}/start`);
    await enteredSave;
    try {
      const duplicate = await call(ctx, "POST", `/api/previews/${id}/start`);
      assert.equal(duplicate.status, 409);
      const progress = await call(ctx, "GET", `/api/previews/${id}`);
      assert.equal(progress.body.status, "generating");
      assert.equal(polled, 0);
      assert.equal((await ctx.store.getPreview(id))?.imageJobId, undefined);
    } finally { releaseSave(); }
    const completed = await first;
    assert.equal(completed.body.status, "ready");
    assert.equal(submitted, 1);
    assert.equal((await ctx.store.getPreview(id))?.imageCostCents, 20);
    const image = await call(ctx, "GET", completed.body.imageUrl);
    assert.equal(image.status, 200);
    assert.deepEqual(new Uint8Array(await image.raw.arrayBuffer()), fakeJpeg());
  });

  it("reserva orçamento entre prévias concorrentes e mantém custo de falha incerta", async () => {
    const { ctx } = makeCtx({ PREVIEW_DAILY_BUDGET_CENTS: "30" });
    const ids = [await uploadedPreview(ctx), await uploadedPreview(ctx)];
    let submitted = 0;
    const image: ImageProvider = {
      name: "failed-sync", mode: "live", estimatedCostCents: 20,
      async submit() { submitted++; throw new Error("rede interrompida após cobrança"); },
      async poll() { return { status: "processing" }; },
    };
    ctx.providers.image = image;
    const results = await Promise.all(ids.map((id) => call(ctx, "POST", `/api/previews/${id}/start`)));
    assert.deepEqual(results.map((r) => r.status).sort(), [200, 503]);
    const failed = results.findIndex((r) => r.body.status === "failed");
    assert.ok(failed >= 0);
    assert.equal(submitted, 1);
    assert.equal((await ctx.store.getPreview(ids[failed]))?.imageCostCents, 20);
    const retry = await call(ctx, "POST", `/api/previews/${ids[failed]}/start`);
    assert.equal(retry.status, 503);
    assert.equal(retry.body.error.code, "budget_exceeded");
    assert.equal(submitted, 1);
  });
});
