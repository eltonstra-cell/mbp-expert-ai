import assert from "node:assert/strict";
import test from "node:test";

import { sincronizarNcDoItem } from "../lib/checklistNcs.ts";

const visita = { id: "v1", empresaId: "e1" };
const item = (status, observacao = "Piso quebrado") => ({ id: "i1", ambiente: "Cozinha", titulo: "Piso", categoria: "Estrutura", status, observacao, criticidade: "Importante" });

test("Resolvida → item muda de resposta → volta a Não conforme: NC Aberta com histórico", () => {
  let ncs = sincronizarNcDoItem([], visita, item("Não Conforme"), "2026-10-20T08:00:00.000Z");
  ncs = ncs.map((nc) => ({ ...nc, status: "Resolvida", resolvidaEm: "2026-10-20T09:00:00.000Z", historicoAcompanhamento: [{ id: "h1", criadoEm: "2026-10-20T09:00:00.000Z", observacao: "Feito", status: "Resolvida" }] }));
  ncs = sincronizarNcDoItem(ncs, visita, item("Conforme"), "2026-10-20T10:00:00.000Z");
  assert.equal(ncs[0].inativaNoChecklist, true);
  assert.equal(ncs[0].status, "Resolvida");
  ncs = sincronizarNcDoItem(ncs, visita, item("Não Conforme"), "2026-10-20T11:00:00.000Z");
  assert.equal(ncs.length, 1);
  assert.equal(ncs[0].status, "Aberta");
  assert.equal(ncs[0].resolvidaEm, undefined);
  assert.equal(ncs[0].inativaNoChecklist, false);
  assert.equal(ncs[0].historicoAcompanhamento.length, 2);
  assert.equal(ncs[0].historicoAcompanhamento[0].observacao, "Feito");
  assert.deepEqual(
    [ncs[0].historicoAcompanhamento[1].observacao, ncs[0].historicoAcompanhamento[1].status, ncs[0].historicoAcompanhamento[1].criadoEm],
    ["Reaberta: item voltou a Não conforme", "Aberta", "2026-10-20T11:00:00.000Z"]
  );
});

test("editar a observação de uma NC ativa não reabre nem acrescenta histórico", () => {
  let ncs = sincronizarNcDoItem([], visita, item("Não Conforme"), "2026-10-20T08:00:00.000Z");
  ncs = ncs.map((nc) => ({ ...nc, status: "Em tratamento" }));
  ncs = sincronizarNcDoItem(ncs, visita, item("Não Conforme", "Outra observação"), "2026-10-20T08:30:00.000Z");
  assert.equal(ncs[0].status, "Em tratamento");
  assert.equal((ncs[0].historicoAcompanhamento || []).length, 0);
  assert.equal(ncs[0].observacao, "Outra observação");
});
