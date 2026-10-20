import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { acaoPadraoVisivel, textoDeBaseLegal } from "../lib/conteudoValidado.ts";

test("base legal: sem texto oficial salvo o bloco some; nunca texto reservado ou de exemplo", () => {
  assert.equal(textoDeBaseLegal({}), "");
  assert.equal(textoDeBaseLegal({ baseLegal: "   " }), "");
  assert.equal(textoDeBaseLegal({ baseLegal: "Texto reservado para a norma" }), "");
  assert.equal(textoDeBaseLegal({ baseLegal: "Exemplo, a validar" }), "");
  assert.equal(textoDeBaseLegal({ baseLegal: "  Texto conferido da norma.  " }), "Texto conferido da norma.");
  // o campo "referencia" (capítulo do Manual) não é texto oficial: não abre o bloco
  assert.equal(textoDeBaseLegal({ referencia: "Manual de Boas Práticas — Capítulo 1" }), "");
});

test("ação padrão do critério só aparece depois de validada pelo RT", () => {
  assert.equal(acaoPadraoVisivel({ acaoSugerida: "Trocar o piso" }), "");
  assert.equal(acaoPadraoVisivel({ acaoSugerida: "Trocar o piso", acaoSugeridaValidada: false }), "");
  assert.equal(acaoPadraoVisivel({ acaoSugerida: " Trocar o piso ", acaoSugeridaValidada: true }), "Trocar o piso");
  assert.equal(acaoPadraoVisivel({ acaoSugeridaValidada: true }), "");
});

test("as telas usam os filtros", () => {
  const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
  assert.ok(ler("../components/ChecklistFocoItem.tsx").includes("textoDeBaseLegal(item)"));
  assert.ok(ler("../app/page.tsx").includes("textoDeBaseLegal(foco)"));
  assert.ok(ler("../components/pc/PcCorrecoes.tsx").includes("acaoPadraoVisivel(nc)"));
  assert.ok(ler("../components/campo/CampoTelas.tsx").includes("acaoPadraoVisivel(nc)"));
});
