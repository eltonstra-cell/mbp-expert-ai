import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resumoDosRegistros } from "../lib/popRegistrosResumo.ts";
import { atividadeDoPop, versoesDoHistorico } from "../lib/popHistorico.ts";

const reg = (id, dataHora, extra = {}) => ({ id, popId: "p1", dataHora, responsavel: "Ana", descricao: "x", ...extra });

test("resumo dos registros: sem frequência não há próximo registro", () => {
  const r = resumoDosRegistros("p1", {}, [], "2026-10-30");
  assert.equal(r.proximo, null);
  assert.equal(r.ultimo, null);
  assert.equal(r.esperados30, null);
});

test("resumo dos registros: diária atrasada e só registros do próprio POP", () => {
  const r = resumoDosRegistros("p1", { frequencia: "Diária" }, [reg("a", "2026-10-27T12:00:00-03:00"), reg("b", "2026-10-29T12:00:00-03:00", { popId: "outro" })], "2026-10-30");
  assert.equal(r.frequencia, "Diária");
  assert.equal(r.proximo?.urgente, true);
  assert.match(r.proximo?.texto || "", /Atrasado há 2 dias/);
  assert.equal(r.ultimo?.quem, "Ana");
  assert.equal(r.esperados30, 30);
  assert.equal(r.feitos30, 1);
});

test("resumo dos registros: feitos nunca passam do esperado", () => {
  const registros = ["01", "02", "03"].map((d) => reg("r" + d, `2026-10-${d}T10:00:00-03:00`));
  const r = resumoDosRegistros("p1", { frequencia: "Mensal" }, registros, "2026-10-30");
  assert.equal(r.esperados30, 1);
  assert.equal(r.feitos30, 1);
});

test("histórico: versões da mais nova para a mais antiga e atividade em ordem decrescente", () => {
  const pop = {
    versao: "2.0",
    status: "Aprovado",
    aprovacao: { nome: "Bia", em: "2026-10-20T10:00:00-03:00" },
    versoes: [
      { versao: "1.0", status: "Aprovado", criadaEm: "2026-09-01T10:00:00-03:00", aprovacao: { nome: "Bia", em: "2026-09-02T10:00:00-03:00" }, substituidaEm: "2026-10-20T10:00:00-03:00" },
      { versao: "2.0", status: "Aprovado", criadaEm: "2026-10-10T10:00:00-03:00", aprovacao: { nome: "Bia", em: "2026-10-20T10:00:00-03:00" } },
    ],
  };
  const v = versoesDoHistorico(pop);
  assert.deepEqual(v.map((x) => [x.versao, x.estado]), [["2.0", "vigente"], ["1.0", "arquivada"]]);
  const a = atividadeDoPop(pop);
  assert.ok(a.length >= 4);
  assert.deepEqual(a.map((e) => e.em), [...a.map((e) => e.em)].sort().reverse());
  assert.ok(!a.some((e) => /enviada para aprovação|revisados/i.test(e.texto)));
});

test("histórico: POP sem versões guardadas mostra a versão atual e sem atividade inventada", () => {
  const pop = { versao: "1.0", status: "Rascunho", versoes: [] };
  assert.equal(versoesDoHistorico(pop).length, 1);
  assert.equal(atividadeDoPop(pop).length, 0);
});

test("rodada 14: textos e componentes novos", () => {
  const doc = readFileSync("lib/popDocumento.ts", "utf8");
  assert.match(doc, /falta \$\{faltas\.length === 1/);
  assert.ok(readFileSync("components/ui/Chevron.tsx", "utf8").includes("<svg"));
  const reg14 = readFileSync("components/pc/PcRegistrosDoPop.tsx", "utf8");
  assert.ok(reg14.includes("Guarda dos registros") && reg14.includes("+ Novo registro"));
  assert.ok(!readFileSync("components/pc/PcResumoDoPop.tsx", "utf8").includes("Marcar como revisado"));
});
