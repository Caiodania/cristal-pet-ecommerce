import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { newOrderCode, safeEqual, signToken, verifyToken } from "../crypto";
import { allow, resetRateLimits } from "../ratelimit";
import { cleanText, parsePhone, sniffImage } from "../validate";

describe("crypto", () => {
  it("token assinado: valida, recusa adulteração e expira", () => {
    const token = signToken({ a: 1, exp: 2000 }, "segredo");
    assert.deepEqual(verifyToken(token, "segredo", 1999), { a: 1, exp: 2000 });
    assert.equal(verifyToken(token, "segredo", 2001), null); // expirado
    assert.equal(verifyToken(token, "outro-segredo", 1000), null);
    const [body, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ a: 2, exp: 9e9 })).toString("base64url")}.${sig}`;
    assert.equal(verifyToken(forged, "segredo", 1000), null);
    assert.equal(verifyToken(`${body}`, "segredo", 1000), null);
    assert.equal(verifyToken("", "segredo", 1000), null);
  });

  it("safeEqual compara textos de tamanhos diferentes sem lançar", () => {
    assert.ok(safeEqual("abc", "abc"));
    assert.ok(!safeEqual("abc", "abcd"));
    assert.ok(!safeEqual("", "x"));
  });

  it("código do pedido: CP- + 6 caracteres legíveis e (quase sempre) únicos", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) {
      const code = newOrderCode();
      assert.match(code, /^CP-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
      seen.add(code);
    }
    assert.ok(seen.size > 495);
  });
});

describe("validate", () => {
  it("reconhece JPEG, PNG e WebP pelos bytes; recusa o resto", () => {
    const pad = (head: number[]) => new Uint8Array([...head, ...new Array(20).fill(0)]);
    assert.equal(sniffImage(pad([0xff, 0xd8, 0xff, 0xe0]))?.ext, "jpg");
    assert.equal(sniffImage(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext, "png");
    const webp = new Uint8Array([...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP"), 0, 0]);
    assert.equal(sniffImage(webp)?.ext, "webp");
    assert.equal(sniffImage(new TextEncoder().encode("<svg onload=alert(1)>")), null);
    assert.equal(sniffImage(new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0, 0, 0, 0])), null); // GIF
    assert.equal(sniffImage(new Uint8Array()), null);
  });

  it("telefone: só dígitos, 10 a 13; vazio é opcional", () => {
    assert.equal(parsePhone("(19) 97154-8471"), "19971548471");
    assert.equal(parsePhone("+55 19 97154-8471"), "5519971548471");
    assert.equal(parsePhone(""), undefined);
    assert.equal(parsePhone(undefined), undefined);
    assert.throws(() => parsePhone("12345"));
    assert.throws(() => parsePhone("1".repeat(14)));
  });

  it("cleanText tira caracteres de controle, colapsa espaços e limita o tamanho", () => {
    assert.equal(cleanText("  Thor \n\t o   grande ", 50), "Thor o grande");
    assert.equal(cleanText("a\u0000b\u0007c", 50), "a b c");
    assert.equal(cleanText("abcdefghij", 4), "abcd");
    assert.equal(cleanText("   ", 10), undefined);
    assert.equal(cleanText(42, 10), undefined);
  });
});

describe("downloads de provedor", () => {
  it("só baixa por https (nada de http puro nem endereços internos)", async () => {
    const { fetchBytes } = await import("../services/previews");
    await assert.rejects(() => fetchBytes("http://169.254.169.254/latest/meta-data"), /não é https/);
    await assert.rejects(() => fetchBytes("file:///etc/passwd"), /não é https/);
  });
});

describe("ratelimit", () => {
  it("libera até o limite dentro da janela e volta depois dela", () => {
    resetRateLimits();
    assert.ok(allow("k", 2, 1000, 0));
    assert.ok(allow("k", 2, 1000, 10));
    assert.ok(!allow("k", 2, 1000, 20));
    assert.ok(allow("k", 2, 1000, 1500)); // a janela passou
    assert.ok(allow("outra", 2, 1000, 20)); // chaves independentes
  });
});
