import test from "node:test";
import assert from "node:assert/strict";
import { sincronizarNcDoItem } from "../lib/checklistNcs.ts";
import { contarNcsPorGravidade } from "../lib/actionPlan.ts";
import { rotuloDoRelatorio, seloDoPdf } from "../lib/reportLabels.ts";
import { PALAVRA_DE_CONFIRMACAO, confirmacaoDeExclusaoValida } from "../lib/userManagement.ts";

const visita = { id: "v1", empresaId: "e1" };
const item = (extra = {}) => ({ id: "i1", ambiente: "Cozinha", titulo: "Piso", categoria: "Piso", status: "Não Conforme", observacao: "rachado", criticidade: "Importante", ...extra });

test("gravidade Leve (Rotina) grava na NC do item e entra na contagem de leves", () => {
  let ncs = sincronizarNcDoItem([], visita, item({ criticidade: "Crítica" }), "2026-01-01T00:00:00.000Z");
  assert.deepEqual(contarNcsPorGravidade(ncs), { criticas: 1, importantes: 0, leves: 0 });
  ncs = sincronizarNcDoItem(ncs, visita, item({ criticidade: "Rotina" }), "2026-01-02T00:00:00.000Z");
  assert.equal(ncs.length, 1);
  assert.equal(ncs[0].criticidade, "Rotina");
  assert.equal(ncs[0].prioridade, "Rotina");
  assert.equal(ncs[0].criadoEm, "2026-01-01T00:00:00.000Z");
  assert.deepEqual(contarNcsPorGravidade(ncs), { criticas: 0, importantes: 0, leves: 1 });
});

test("contagem por gravidade soma críticas, importantes e leves sem perder nenhuma", () => {
  const ncs = [{ criticidade: "Crítica" }, { criticidade: "Crítica" }, { criticidade: "Importante" }, { criticidade: "Rotina" }, {}];
  const c = contarNcsPorGravidade(ncs);
  assert.deepEqual(c, { criticas: 2, importantes: 1, leves: 2 });
  assert.equal(c.criticas + c.importantes + c.leves, ncs.length);
});

test("voltar o item para conforme tira a NC dos módulos ativos sem apagá-la", () => {
  const ncs = sincronizarNcDoItem([], visita, item(), "2026-01-01T00:00:00.000Z");
  const depois = sincronizarNcDoItem(ncs, visita, item({ status: "Conforme" }), "2026-01-02T00:00:00.000Z");
  assert.equal(depois.length, 1);
  assert.equal(depois[0].inativaNoChecklist, true);
});

test("rótulo do relatório: visita em andamento nunca é 'Encerramento da inspeção'", () => {
  assert.equal(rotuloDoRelatorio("Em andamento"), "Relatório parcial");
  assert.equal(rotuloDoRelatorio("Concluída"), "Encerramento da inspeção");
});

test("selo do PDF: parcial e prévia têm marca própria; a oficial não tem", () => {
  assert.equal(seloDoPdf("parcial"), "RELATÓRIO PARCIAL");
  assert.equal(seloDoPdf("previa"), "PRÉVIA");
  assert.equal(seloDoPdf("oficial"), "");
});

test("confirmação de exclusão só vale com a palavra exata", () => {
  assert.equal(PALAVRA_DE_CONFIRMACAO, "EXCLUIR");
  assert.equal(confirmacaoDeExclusaoValida("EXCLUIR"), true);
  assert.equal(confirmacaoDeExclusaoValida("  EXCLUIR "), true);
  for (const errado of ["", "excluir", "Excluir", "EXCLUIR!", "EXCLUI", "EXCLUIRR"]) assert.equal(confirmacaoDeExclusaoValida(errado), false, errado);
});
