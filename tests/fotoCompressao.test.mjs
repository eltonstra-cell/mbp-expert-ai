import test from "node:test";
import assert from "node:assert/strict";
import { comprimirFoto, dimensoesDaFoto, LADO_MAXIMO_FOTO, QUALIDADE_JPEG_FOTO } from "../lib/fotoCompressao.ts";

// "Imagem" de exemplo gerada aqui: bytes de um degradê com a assinatura de JPEG; o tamanho cresce com os pixels.
function fotoDeExemplo(largura, altura, tipo = "image/jpeg") {
  const bytes = new Uint8Array(Math.max(16, Math.floor((largura * altura) / 20)));
  bytes[0] = 0xff; bytes[1] = 0xd8; bytes[2] = 0xff;
  for (let i = 3; i < bytes.length; i += 1) bytes[i] = (i * 7) % 256;
  const arquivo = new Blob([bytes], { type: tipo });
  arquivo.largura = largura;
  arquivo.altura = altura;
  return arquivo;
}

// Codificador de teste: o JPEG resultante tem tamanho proporcional aos pixels e à qualidade.
function depsDeTeste(registro = {}) {
  return {
    decodificar: async (arquivo) => ({ largura: arquivo.largura, altura: arquivo.altura }),
    codificar: async (arquivo, largura, altura, qualidade) => {
      registro.chamada = { largura, altura, qualidade };
      const bytes = new Uint8Array(Math.max(16, Math.floor(((largura * altura) / 20) * qualidade)));
      bytes[0] = 0xff; bytes[1] = 0xd8; bytes[2] = 0xff;
      return new Blob([bytes], { type: "image/jpeg" });
    },
  };
}

test("dimensões: reduz o lado maior a 1600, mantém a proporção e nunca amplia", () => {
  assert.deepEqual(dimensoesDaFoto(4000, 3000), { largura: 1600, altura: 1200, reduziu: true });
  assert.deepEqual(dimensoesDaFoto(3000, 4000), { largura: 1200, altura: 1600, reduziu: true });
  assert.deepEqual(dimensoesDaFoto(1600, 900), { largura: 1600, altura: 900, reduziu: false });
  assert.deepEqual(dimensoesDaFoto(800, 600), { largura: 800, altura: 600, reduziu: false });
  assert.equal(dimensoesDaFoto(0, 600), null);
  assert.equal(dimensoesDaFoto(NaN, 600), null);
  assert.equal(LADO_MAXIMO_FOTO, 1600);
  assert.equal(QUALIDADE_JPEG_FOTO, 0.8);
});

test("foto grande: sai no tamanho reduzido, com qualidade 0,8, menor que o original", async () => {
  const original = fotoDeExemplo(4032, 3024);
  const registro = {};
  const r = await comprimirFoto(original, depsDeTeste(registro));
  assert.equal(r.comprimida, true);
  assert.deepEqual(registro.chamada, { largura: 1600, altura: 1200, qualidade: 0.8 });
  assert.equal(r.largura, 1600);
  assert.equal(r.altura, 1200);
  assert.ok(r.arquivo.size < original.size);
  assert.equal(r.arquivo.type, "image/jpeg");
});

test("foto que já cabe e não encolheria: mantém o original", async () => {
  const original = fotoDeExemplo(640, 480);
  const deps = {
    decodificar: async (a) => ({ largura: a.largura, altura: a.altura }),
    codificar: async () => new Blob([new Uint8Array(original.size + 500)], { type: "image/jpeg" }),
  };
  const r = await comprimirFoto(original, deps);
  assert.equal(r.comprimida, false);
  assert.equal(r.motivo, "nao-diminuiu");
  assert.equal(r.arquivo, original);
});

test("original que não é JPEG nunca é mantido por ser menor: precisa ser convertido", async () => {
  const png = fotoDeExemplo(640, 480, "image/png");
  const deps = {
    decodificar: async (a) => ({ largura: a.largura, altura: a.altura }),
    codificar: async () => new Blob([new Uint8Array(png.size + 500)], { type: "image/jpeg" }),
  };
  const r = await comprimirFoto(png, deps);
  assert.equal(r.comprimida, true);
  assert.equal(r.arquivo.type, "image/jpeg");
});

test("falha em qualquer passo: devolve o original e o envio segue", async () => {
  const original = fotoDeExemplo(4000, 3000);
  const dimensoes = async (a) => ({ largura: a.largura, altura: a.altura });
  const semDecodificar = await comprimirFoto(original, { decodificar: async () => { throw new Error("x"); }, codificar: async () => new Blob([1]) });
  assert.equal(semDecodificar.arquivo, original);
  assert.equal(semDecodificar.comprimida, false);
  assert.equal(semDecodificar.motivo, "falhou");
  const semCodificar = await comprimirFoto(original, { decodificar: dimensoes, codificar: async () => { throw new Error("y"); } });
  assert.equal(semCodificar.arquivo, original);
  const vazio = await comprimirFoto(original, { decodificar: dimensoes, codificar: async () => new Blob([]) });
  assert.equal(vazio.arquivo, original);
  const invalida = await comprimirFoto(original, { decodificar: async () => ({ largura: 0, altura: 0 }), codificar: async () => new Blob([1]) });
  assert.equal(invalida.motivo, "falhou");
});
