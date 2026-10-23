import assert from "node:assert/strict";
import test from "node:test";

import { historicoDoItem, ordemAdaptativa } from "../lib/checklistAdaptativo.ts";

const item = (id, status = "Pendente", ambiente = "Cozinha") => ({ id, ambiente, titulo: `Item ${id}`, categoria: "Higiene", status, observacao: "" });
const visita = (id, itens) => ({ id, checklist: itens });

test("reprovou em alguma das últimas visitas: sobe ao topo do ambiente, com selo", () => {
  const atual = [item("a"), item("b"), item("c")];
  const anteriores = [visita("v2", [item("a", "Conforme"), item("b", "Conforme"), item("c", "Conforme")]), visita("v1", [item("c", "Não Conforme")])];
  const r = ordemAdaptativa(atual, anteriores);
  assert.deepEqual(r.itens.map((i) => i.id), ["c", "a", "b"]);
  assert.deepEqual([...r.reprovaram], ["c"]);
});

test("Não se aplica em todas as visitas recentes (ao menos duas): vai para o fim, recolhido; nada some", () => {
  const atual = [item("a"), item("b"), item("c")];
  const anteriores = [visita("v2", [item("a", "Não se aplica")]), visita("v1", [item("a", "Não se aplica")])];
  const r = ordemAdaptativa(atual, anteriores);
  assert.deepEqual(r.itens.map((i) => i.id), ["b", "c", "a"]);
  assert.deepEqual([...r.recolhidos], ["a"]);
  assert.equal(r.itens.length, 3);
});

test("com uma só visita anterior não recolhe; item já respondido de outra forma não é recolhido", () => {
  assert.equal(historicoDoItem(item("a"), [visita("v1", [item("a", "Não se aplica")])]).naoSeAplicaSempre, false);
  const anteriores = [visita("v2", [item("a", "Não se aplica")]), visita("v1", [item("a", "Não se aplica")])];
  assert.equal(ordemAdaptativa([item("a", "Conforme")], anteriores).recolhidos.size, 0);
});

test("a ordem dos ambientes é preservada e só os itens de cada ambiente se reordenam", () => {
  const atual = [item("a", "Pendente", "Cozinha"), item("b", "Pendente", "Cozinha"), item("c", "Pendente", "Depósito"), item("d", "Pendente", "Depósito")];
  const anteriores = [visita("v1", [item("d", "Não Conforme", "Depósito"), item("b", "Não Conforme", "Cozinha")])];
  assert.deepEqual(ordemAdaptativa(atual, anteriores).itens.map((i) => i.id), ["b", "a", "d", "c"]);
});

test("sem visitas anteriores a ordem não muda", () => {
  const atual = [item("a"), item("b")];
  assert.deepEqual(ordemAdaptativa(atual, []).itens.map((i) => i.id), ["a", "b"]);
});
