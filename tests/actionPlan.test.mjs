import assert from "node:assert/strict";
import test from "node:test";
import { alteracoesEmLote, ncAtrasada, planoPorDefinir, resumoDoPlano, situacaoDoPlano } from "../lib/actionPlan.ts";

const HOJE = "2026-10-15";
const completa = { acaoCorretiva: "Trocar o piso", responsavelAcao: "Ana", prazo: "2026-11-01" };

test("atrasada: prazo anterior a hoje e NC não resolvida", () => {
  assert.equal(ncAtrasada({ status: "Aberta", prazo: "2026-10-14" }, HOJE), true);
  assert.equal(ncAtrasada({ status: "Em tratamento", prazo: "2026-01-01" }, HOJE), true);
});

test("não é atrasada: prazo hoje, futuro, ausente ou NC resolvida", () => {
  assert.equal(ncAtrasada({ status: "Aberta", prazo: HOJE }, HOJE), false);
  assert.equal(ncAtrasada({ status: "Aberta", prazo: "2026-12-01" }, HOJE), false);
  assert.equal(ncAtrasada({ status: "Aberta", prazo: "" }, HOJE), false);
  assert.equal(ncAtrasada({ status: "Aberta" }, HOJE), false);
  assert.equal(ncAtrasada({ status: "Resolvida", prazo: "2020-01-01" }, HOJE), false);
});

test("plano por definir quando falta ação, responsável ou prazo", () => {
  assert.equal(planoPorDefinir({ status: "Aberta" }), true);
  assert.equal(planoPorDefinir({ status: "Aberta", ...completa, prazo: " " }), true);
  assert.equal(planoPorDefinir({ status: "Aberta", ...completa }), false);
  assert.equal(planoPorDefinir({ status: "Resolvida" }), false);
});

test("resumo conta cada situação", () => {
  const resumo = resumoDoPlano(
    [
      { status: "Aberta" },
      { status: "Aberta", ...completa, prazo: "2026-10-01" },
      { status: "Em tratamento", ...completa },
      { status: "Resolvida", ...completa, prazo: "2026-01-01" },
    ],
    HOJE
  );
  assert.deepEqual(resumo, { semAcao: 1, emAndamento: 1, atrasadas: 1, resolvidas: 1 });
});

test("situação do plano", () => {
  assert.equal(situacaoDoPlano({ status: "Resolvida" }, HOJE), "Resolvida");
  assert.equal(situacaoDoPlano({ status: "Em tratamento", ...completa, prazo: "2026-10-01" }, HOJE), "Atrasada");
  assert.equal(situacaoDoPlano({ status: "Em tratamento", ...completa }, HOJE), "Em andamento");
  assert.equal(situacaoDoPlano({ status: "Aberta" }, HOJE), "A definir");
  assert.equal(situacaoDoPlano({ status: "Aberta", ...completa }, HOJE), "Pronta para iniciar");
});

test("aplicação em lote ignora resolvidas, não selecionadas e campos vazios", () => {
  const ncs = [
    { id: "a", status: "Aberta" },
    { id: "b", status: "Resolvida" },
    { id: "c", status: "Em tratamento" },
  ];
  assert.deepEqual(alteracoesEmLote(ncs, ["a", "b"], { responsavel: " Ana ", prazo: "" }), [{ id: "a", patch: { responsavelAcao: "Ana" } }]);
  assert.deepEqual(alteracoesEmLote(ncs, ["a", "c"], { responsavel: "", prazo: "2026-11-01" }), [
    { id: "a", patch: { prazo: "2026-11-01" } },
    { id: "c", patch: { prazo: "2026-11-01" } },
  ]);
  assert.deepEqual(alteracoesEmLote(ncs, ["a"], { responsavel: "", prazo: "" }), []);
});
