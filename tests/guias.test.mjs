import test from "node:test";
import assert from "node:assert/strict";
import { GUIAS, autorizarGuia } from "../lib/guias.ts";

test("só nomes da lista fixa são servidos; o resto é 404, inclusive tentativas de caminho", () => {
  assert.deepEqual(Object.keys(GUIAS).sort(), ["guia-rapido", "manual-completo"]);
  for (const nome of ["../package", "..%2F..%2F.env", "guia-rapido/../../x", "constructor", "__proto__", "toString", "", "GUIA-RAPIDO"]) {
    assert.equal(autorizarGuia(nome, "nao-aplicado").status, "nao-encontrado", nome);
    assert.equal(autorizarGuia(nome, { perfil: "Administrador" }).status, "nao-encontrado", nome);
  }
});

test("Guia rápido: bloqueado quando a tela está desligada para a pessoa", () => {
  const consultor = { perfil: "Consultor/RT" };
  assert.equal(autorizarGuia("guia-rapido", consultor).status, "ok");
  assert.equal(autorizarGuia("guia-rapido", { ...consultor, telas: { guiaRapido: "oculta" } }).status, "negado");
  // desligar um guia não mexe no outro
  assert.equal(autorizarGuia("manual-completo", { ...consultor, telas: { guiaRapido: "oculta" } }).status, "ok");
});

test("Manual completo: bloqueado quando desligado; sem sessão negado; sem controle de acesso libera", () => {
  assert.equal(autorizarGuia("manual-completo", { perfil: "Gerente", telas: { manualCompleto: "oculta" } }).status, "negado");
  assert.equal(autorizarGuia("manual-completo", null).status, "negado");
  assert.equal(autorizarGuia("guia-rapido", null).status, "negado");
  assert.equal(autorizarGuia("guia-rapido", "nao-aplicado").status, "ok");
});

test("o arquivo devolvido é sempre o da lista (nunca montado a partir do nome recebido)", () => {
  assert.equal(autorizarGuia("guia-rapido", "nao-aplicado").arquivo, "guia-rapido-mbp-expert-ai.pdf");
  assert.equal(autorizarGuia("manual-completo", "nao-aplicado").arquivo, "manual-completo-mbp-expert-ai.pdf");
});
