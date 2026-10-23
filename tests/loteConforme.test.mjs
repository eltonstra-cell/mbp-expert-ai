import assert from "node:assert/strict";
import test from "node:test";

import { aplicarLote, contarEmLote, desfazerLote, planoDoLote, textoDaConfirmacaoDoLote } from "../lib/loteConforme.ts";

const item = (id, status = "Pendente", ambiente = "Cozinha") => ({ id, ambiente, titulo: id, categoria: "Higiene", status, observacao: "" });

test("o lote marca só pendentes do ambiente e deixa de fora os que reprovaram antes", () => {
  const lista = [item("a"), item("b"), item("c", "Não Conforme"), item("d", "Pendente", "Depósito"), item("e")];
  const plano = planoDoLote(lista, "Cozinha", new Set(["b"]));
  assert.deepEqual(plano.marcar.map((i) => i.id), ["a", "e"]);
  assert.deepEqual(plano.individuais.map((i) => i.id), ["b"]);
});

test("aplicar registra o lote; só pendentes mudam", () => {
  const lista = [item("a"), item("c", "Não Conforme")];
  const depois = aplicarLote(lista, ["a", "c"], "2026-10-23T10:00:00Z");
  assert.equal(depois[0].status, "Conforme");
  assert.equal(depois[0].lote.em, "2026-10-23T10:00:00Z");
  assert.equal(depois[1].status, "Não Conforme");
  assert.equal(contarEmLote(depois), 1);
});

test("desfazer volta ao Pendente só o que ainda é daquele lote", () => {
  const lote = aplicarLote([item("a"), item("b")], ["a", "b"], "T1");
  const mexido = lote.map((i) => (i.id === "b" ? { ...i, status: "Não Conforme", lote: undefined } : i));
  const desfeito = desfazerLote(mexido, ["a", "b"], "T1");
  assert.equal(desfeito[0].status, "Pendente");
  assert.equal(desfeito[0].lote, undefined);
  assert.equal(desfeito[1].status, "Não Conforme");
});

test("a confirmação diz quantos itens serão marcados", () => {
  const texto = textoDaConfirmacaoDoLote("Cozinha", { marcar: [item("a"), item("b")], individuais: [item("c")] });
  assert.match(texto, /Marcar 2 itens pendentes de Cozinha como Conforme\?/);
  assert.match(texto, /1 item que reprovou na visita anterior fica para resposta individual/);
});
