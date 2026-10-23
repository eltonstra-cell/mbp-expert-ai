import assert from "node:assert/strict";
import test from "node:test";

import { LIMITES_DE_TEMPERATURA, classificarTemperatura, lerTemperatura, limiteDoTipo, limiteSugerido, textoDoLimite } from "../lib/limitesDeTemperatura.ts";

test("cada limite guarda norma, item, link e data de conferência", () => {
  for (const limite of LIMITES_DE_TEMPERATURA) {
    assert.ok(limite.norma && limite.itens && /^https:\/\//.test(limite.link) && /^\d{4}-\d{2}-\d{2}$/.test(limite.conferidoEm), limite.id);
  }
});

test("lê a temperatura digitada", () => {
  assert.equal(lerTemperatura("7"), 7);
  assert.equal(lerTemperatura("7,5 °C"), 7.5);
  assert.equal(lerTemperatura("-18"), -18);
  assert.equal(lerTemperatura(""), null);
  assert.equal(lerTemperatura("abc"), null);
});

test("classifica pelo limite: 7 °C num refrigerado é Não conforme; 4 °C é Conforme; congelado até -18", () => {
  const frio = limiteDoTipo("refrigerado");
  assert.equal(classificarTemperatura(7, frio), "Não Conforme");
  assert.equal(classificarTemperatura(5, frio), "Conforme");
  assert.equal(classificarTemperatura(4, frio), "Conforme");
  assert.equal(classificarTemperatura(-15, limiteDoTipo("congelado")), "Não Conforme");
  assert.equal(classificarTemperatura(-18, limiteDoTipo("congelado")), "Conforme");
  assert.equal(classificarTemperatura(58, limiteDoTipo("quente")), "Não Conforme");
  assert.equal(classificarTemperatura(75, limiteDoTipo("reaquecimento")), "Conforme");
  assert.equal(classificarTemperatura(190, limiteDoTipo("fritura")), "Não Conforme");
});

test("sem limite ou sem número, não classifica", () => {
  assert.equal(classificarTemperatura(7, undefined), null);
  assert.equal(classificarTemperatura(null, limiteDoTipo("refrigerado")), null);
  assert.equal(limiteSugerido(["Balança"]), undefined);
});

test("sugere o limite pelo nome do equipamento", () => {
  assert.equal(limiteSugerido(["Freezer horizontal"])?.id, "congelado");
  assert.equal(limiteSugerido(["Câmara fria"])?.id, "refrigerado");
  assert.equal(limiteSugerido(["Estufa de distribuição"])?.id, "quente");
  assert.equal(textoDoLimite(limiteDoTipo("refrigerado")), "até 5 °C");
  assert.equal(textoDoLimite(limiteDoTipo("quente")), "no mínimo 60 °C");
});
