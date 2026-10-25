import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createMockModelProvider } from "../providers/mock";
import type { ModelPoll, PrintModelProvider } from "../providers/types";
import { ADDRESS, CUSTOMER, adminCookie, call, makeCtx, readyPreview } from "./helpers";

type Ctx = Parameters<typeof call>[0];

/** Faz um pedido (como o cliente padrão dos testes) e devolve o código e o token. */
async function makeOrder(ctx: Ctx, customer: Record<string, unknown> = CUSTOMER, as?: string) {
  const preview = await readyPreview(ctx, { as });
  const res = await call(ctx, "POST", "/api/orders", {
    as,
    json: { previewIds: [preview], customer, consent: true },
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  return { code: res.body.order.code as string, token: res.body.token as string };
}

async function adminOrder(ctx: Ctx, code: string) {
  const cookie = await adminCookie(ctx);
  const list = await call(ctx, "GET", `/api/admin/orders?q=${code}`, { cookie });
  const detail = await call(ctx, "GET", `/api/admin/orders/${list.body.orders[0].id}`, { cookie });
  return { cookie, summary: list.body.orders[0], detail: detail.body };
}

describe("dados de envio do pedido", () => {
  it("entrega: o painel recebe o endereço completo (CEP só com números, UF em maiúsculas), o WhatsApp e a conta", async () => {
    const { ctx } = makeCtx();
    const { code } = await makeOrder(ctx);
    const { detail, summary } = await adminOrder(ctx, code);

    assert.equal(detail.deliveryMethod, "entrega");
    assert.deepEqual(detail.address, {
      cep: "13330000",
      street: "Rua México",
      number: "311",
      complement: "casa 2",
      neighborhood: "Centro",
      city: "Indaiatuba",
      state: "SP",
    });
    assert.equal(detail.customerName, "Maria Souza");
    assert.equal(detail.customerPhone, "19999991234");
    assert.equal(detail.accountEmail, "ana@exemplo.com");
    assert.equal(detail.city, "Indaiatuba");
    assert.equal(detail.notes, "Presente");

    assert.equal(summary.deliveryMethod, "entrega");
    assert.equal(summary.cityState, "Indaiatuba - SP");
  });

  it("retirada: não pede endereço e o painel mostra a retirada", async () => {
    const { ctx } = makeCtx();
    const { code } = await makeOrder(ctx, {
      name: "João Lima",
      phone: "19 98888-7777",
      delivery: "retirada",
      // mesmo que o navegador mande um endereço, ele é ignorado na retirada
      address: ADDRESS,
    });
    const { detail, summary } = await adminOrder(ctx, code);
    assert.equal(detail.deliveryMethod, "retirada");
    assert.equal(detail.address, undefined);
    assert.equal(summary.cityState, undefined);
  });

  it("valida cada campo e diz qual está errado", async () => {
    const { ctx } = makeCtx();
    const preview = await readyPreview(ctx);
    const cases: [Record<string, unknown>, RegExp][] = [
      [{ ...CUSTOMER, phone: "" }, /WhatsApp/],
      [{ ...CUSTOMER, phone: "123" }, /WhatsApp/],
      [{ ...CUSTOMER, delivery: undefined }, /como quer receber/],
      [{ ...CUSTOMER, delivery: "drone" }, /como quer receber/],
      [{ ...CUSTOMER, address: undefined }, /endereço/],
      [{ ...CUSTOMER, address: { ...ADDRESS, cep: "1333" } }, /CEP/],
      [{ ...CUSTOMER, address: { ...ADDRESS, street: "" } }, /rua/i],
      [{ ...CUSTOMER, address: { ...ADDRESS, number: "" } }, /número/],
      [{ ...CUSTOMER, address: { ...ADDRESS, neighborhood: "" } }, /bairro/],
      [{ ...CUSTOMER, address: { ...ADDRESS, city: "" } }, /cidade/],
      [{ ...CUSTOMER, address: { ...ADDRESS, state: "XX" } }, /estado/],
      [{ ...CUSTOMER, name: "" }, /nome/],
    ];
    let n = 0;
    for (const [customer, message] of cases) {
      // cada tentativa de uma rede diferente (o limite de pedidos por rede é outro teste)
      const res = await call(ctx, "POST", "/api/orders", {
        ip: `198.51.100.${(n += 1)}`,
        json: { previewIds: [preview], customer, consent: true },
      });
      assert.equal(res.status, 400, JSON.stringify(customer));
      assert.match(res.body.error.message, message, JSON.stringify(customer));
    }
    // nada disso criou pedido: a prévia continua livre
    assert.equal(
      (await call(ctx, "POST", "/api/orders", { json: { previewIds: [preview], customer: CUSTOMER, consent: true } })).status,
      201,
    );
  });

  it('o cliente só aceita "s/n" como número e o complemento é opcional', async () => {
    const { ctx } = makeCtx();
    const { code } = await makeOrder(ctx, { ...CUSTOMER, address: { ...ADDRESS, number: "s/n", complement: "" } });
    const { detail } = await adminOrder(ctx, code);
    assert.equal(detail.address.number, "s/n");
    assert.equal(detail.address.complement, undefined);
  });

  it("a página pública do pedido (link do WhatsApp) não mostra telefone nem endereço", async () => {
    const { ctx } = makeCtx();
    const { code, token } = await makeOrder(ctx);
    const res = await call(ctx, "GET", `/api/orders/${code}?t=${token}`, { anonymous: true });
    const text = JSON.stringify(res.body);
    assert.ok(!text.includes("19999991234"));
    assert.ok(!text.includes("Rua México"));
    assert.ok(!text.includes("13330000"));
  });
});

describe("fotos do pedido no painel", () => {
  it("traz a foto do pet e a prévia, e links que BAIXAM os arquivos com bom nome", async () => {
    const { ctx } = makeCtx();
    const { code } = await makeOrder(ctx);
    const { detail } = await adminOrder(ctx, code);
    const item = detail.items[0];
    assert.ok(item.photoUrl && item.imageUrl);
    assert.ok(item.photoDownloadUrl && item.imageDownloadUrl);

    const photo = await call(ctx, "GET", item.photoDownloadUrl, { anonymous: true });
    assert.equal(photo.status, 200);
    assert.match(photo.headers.get("content-disposition")!, new RegExp(`attachment; filename="${code}-Thor-foto\\.jpg"`));
    const preview = await call(ctx, "GET", item.imageDownloadUrl, { anonymous: true });
    assert.match(preview.headers.get("content-disposition")!, new RegExp(`attachment; filename="${code}-Thor-previa\\.svg"`));
  });

  it("o nome do pet com acento e símbolos vira um nome de arquivo seguro", async () => {
    const { ctx } = makeCtx();
    const preview = await readyPreview(ctx, { options: { sizeId: "media", poseId: "sentado", colorId: "branco", petName: "Mel é #1/ão" } });
    const created = await call(ctx, "POST", "/api/orders", { json: { previewIds: [preview], customer: CUSTOMER, consent: true } });
    const { detail } = await adminOrder(ctx, created.body.order.code);
    const res = await call(ctx, "GET", detail.items[0].photoDownloadUrl, { anonymous: true });
    const name = /filename="([^"]+)"/.exec(res.headers.get("content-disposition")!)![1];
    assert.match(name, /^CP-[A-Z0-9]{6}-Mel-e-1-ao-foto\.jpg$/);
  });

  it("o cliente não recebe os links de download do painel", async () => {
    const { ctx } = makeCtx();
    const { code, token } = await makeOrder(ctx);
    const res = await call(ctx, "GET", `/api/orders/${code}?t=${token}`, { anonymous: true });
    assert.ok(!JSON.stringify(res.body).includes("DownloadUrl"));
  });
});

describe("arquivo 3D no painel (pronto para o Meshy)", () => {
  const modelUrl = (orderId: string, itemId: string) => `/api/admin/orders/${orderId}/items/${itemId}/model`;

  /** `slow`: o arquivo 3D demora (as prévias seguem rápidas, para o pedido poder ser feito). */
  async function setup(opts: { slow?: boolean } = {}) {
    const { ctx, clock } = makeCtx();
    const { code } = await makeOrder(ctx);
    const { cookie, detail } = await adminOrder(ctx, code);
    if (opts.slow) ctx.providers.model = createMockModelProvider(100_000);
    return { ctx, clock, cookie, orderId: detail.id as string, itemId: detail.items[0].id as string, code };
  }

  it("gera, mostra o andamento e entrega o STL com o nome do pedido", async () => {
    const { ctx, cookie, orderId, itemId, code } = await setup({ slow: true });
    const started = await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} });
    assert.equal(started.status, 202);
    assert.equal(started.body.status, "processing");
    assert.equal(started.body.provider, "mock");

    const polling = await call(ctx, "GET", modelUrl(orderId, itemId), { cookie });
    assert.equal(polling.body.status, "processing");
    assert.equal(typeof polling.body.progress, "number");
    assert.ok(polling.body.progress >= 0 && polling.body.progress <= 95);
    assert.equal(polling.body.stlUrl, undefined);

    // com um provedor sem espera, fica pronto na primeira consulta
    const fast = await setup();
    await call(fast.ctx, "POST", modelUrl(fast.orderId, fast.itemId), { cookie: fast.cookie, json: {} });
    const done = await call(fast.ctx, "GET", modelUrl(fast.orderId, fast.itemId), { cookie: fast.cookie });
    assert.equal(done.body.status, "ready");
    assert.equal(done.body.progress, undefined);
    const stl = await call(fast.ctx, "GET", done.body.stlUrl, { anonymous: true });
    assert.equal(stl.status, 200);
    assert.match(stl.headers.get("content-disposition")!, new RegExp(`${fast.code}-Thor\\.stl`));
    assert.ok(code);
  });

  it("não gera de novo sem pedir; com regenerate gera outro e o arquivo antigo deixa de valer", async () => {
    const { ctx, cookie, orderId, itemId } = await setup();
    await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} });
    const first = await call(ctx, "GET", modelUrl(orderId, itemId), { cookie });
    assert.equal(first.body.status, "ready");

    // repetir o pedido normal não dispara nova geração (nem novo custo)
    const again = await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} });
    assert.equal(again.body.status, "ready");

    const regen = await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: { regenerate: true } });
    assert.equal(regen.status, 202);
    assert.equal(regen.body.status, "processing");
    assert.equal(regen.body.stlUrl, undefined);
    const ready = await call(ctx, "GET", modelUrl(orderId, itemId), { cookie });
    assert.equal(ready.body.status, "ready");
    assert.ok(ready.body.stlUrl);
  });

  it("soma o custo de todas as tentativas e o painel mostra", async () => {
    const { ctx, cookie, orderId, itemId } = await setup();
    const real = ctx.providers.model;
    const priced: PrintModelProvider = {
      ...real,
      submit: async (input) => ({ ...(await real.submit(input)), costCents: 7 }),
    };
    ctx.providers.model = priced;
    await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} });
    await call(ctx, "GET", modelUrl(orderId, itemId), { cookie });
    await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: { regenerate: true } });
    const done = await call(ctx, "GET", modelUrl(orderId, itemId), { cookie });
    assert.equal(done.body.costCents, 14);
  });

  it("falha do provedor aparece com a mensagem e dá para tentar de novo", async () => {
    const { ctx, cookie, orderId, itemId } = await setup();
    const real = ctx.providers.model;
    let fail = true;
    ctx.providers.model = {
      ...real,
      poll: async (jobId): Promise<ModelPoll> =>
        fail ? { status: "failed", code: "provider_error", message: "O Meshy recusou a imagem." } : real.poll(jobId),
    };
    await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} });
    const failed = await call(ctx, "GET", modelUrl(orderId, itemId), { cookie });
    assert.equal(failed.body.status, "failed");
    assert.equal(failed.body.errorMessage, "O Meshy recusou a imagem.");
    fail = false;
    await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} });
    assert.equal((await call(ctx, "GET", modelUrl(orderId, itemId), { cookie })).body.status, "ready");
  });

  it("pedido cancelado não gasta com o arquivo 3D; reaberto, volta a poder", async () => {
    const { ctx, cookie, orderId, itemId } = await setup();
    await call(ctx, "PATCH", `/api/admin/orders/${orderId}`, { cookie, json: { status: "canceled" } });
    const blocked = await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.error.code, "order_canceled");
    await call(ctx, "PATCH", `/api/admin/orders/${orderId}`, { cookie, json: { status: "new" } });
    assert.equal((await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} })).status, 202);
  });

  it("item que não existe: 404; as anotações internas ficam só para o dono", async () => {
    const { ctx, cookie, orderId, itemId, code } = await setup();
    assert.equal((await call(ctx, "POST", modelUrl(orderId, "nao-existe"), { cookie, json: {} })).status, 404);
    await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} });
    await call(ctx, "GET", modelUrl(orderId, itemId), { cookie });

    const admin = await call(ctx, "GET", `/api/admin/orders/${orderId}`, { cookie });
    assert.ok(admin.body.timeline.some((e: { note?: string }) => e.note?.startsWith("[interno] Arquivo 3D")));
    // o cliente, com o link do pedido, não vê nenhuma anotação interna
    const { token } = await (async () => {
      const m = await ctx.store.getOrderByCode(code);
      return { token: m!.viewToken };
    })();
    const customer = await call(ctx, "GET", `/api/orders/${code}?t=${token}`, { anonymous: true });
    assert.ok(!JSON.stringify(customer.body).includes("interno"));
  });

  it("a lista do painel mostra quantos arquivos 3D já estão prontos ou sendo gerados", async () => {
    const { ctx, cookie, orderId, itemId, code } = await setup({ slow: true });
    const row = async () => (await call(ctx, "GET", `/api/admin/orders?q=${code}`, { cookie })).body.orders[0];
    assert.deepEqual([(await row()).modelsReady, (await row()).modelsRunning], [0, 0]);
    await call(ctx, "POST", modelUrl(orderId, itemId), { cookie, json: {} });
    assert.deepEqual([(await row()).modelsReady, (await row()).modelsRunning], [0, 1]);
  });
});

describe("endereço pelo CEP", () => {
  const original = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = original;
  });
  const viacep = (body: unknown, ok = true) => {
    globalThis.fetch = (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;
  };

  it("devolve rua, bairro, cidade e UF", async () => {
    const { ctx } = makeCtx();
    viacep({ cep: "13330-000", logradouro: "Rua México", bairro: "Centro", localidade: "Indaiatuba", uf: "SP" });
    const res = await call(ctx, "GET", "/api/cep/13330000", { anonymous: true });
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, {
      found: true,
      address: { street: "Rua México", neighborhood: "Centro", city: "Indaiatuba", state: "SP" },
    });
  });

  it('CEP que não existe, serviço fora do ar ou resposta estranha: "não achei", sem erro', async () => {
    const { ctx } = makeCtx();
    viacep({ erro: true });
    assert.deepEqual((await call(ctx, "GET", "/api/cep/99999999", { anonymous: true })).body, { found: false });
    viacep({}, false);
    assert.deepEqual((await call(ctx, "GET", "/api/cep/13330000", { anonymous: true })).body, { found: false });
    globalThis.fetch = (async () => {
      throw new Error("sem rede");
    }) as unknown as typeof fetch;
    const down = await call(ctx, "GET", "/api/cep/13330000", { anonymous: true });
    assert.equal(down.status, 200);
    assert.deepEqual(down.body, { found: false });
  });

  it("só aceita 8 números e limita as consultas por rede", async () => {
    const { ctx } = makeCtx();
    viacep({ erro: true });
    assert.equal((await call(ctx, "GET", "/api/cep/1333", { anonymous: true })).status, 404);
    assert.equal((await call(ctx, "GET", "/api/cep/abcdefgh", { anonymous: true })).status, 404);
    for (let i = 0; i < 60; i++) await call(ctx, "GET", "/api/cep/13330000", { anonymous: true });
    assert.equal((await call(ctx, "GET", "/api/cep/13330000", { anonymous: true })).status, 429);
  });

  it("limpa o texto que vem do ViaCEP (nada de controle nem tamanho absurdo)", async () => {
    const { ctx } = makeCtx();
    viacep({ logradouro: "Rua\u0000 Um\n", bairro: "B".repeat(500), localidade: "Cidade", uf: "sp" });
    const res = await call(ctx, "GET", "/api/cep/13330000", { anonymous: true });
    assert.equal(res.body.address.street, "Rua  Um");
    assert.equal(res.body.address.neighborhood.length, 80);
    assert.equal(res.body.address.state, "SP");
  });
});
