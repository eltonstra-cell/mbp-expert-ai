import assert from "node:assert/strict";
import test from "node:test";
import { normalizarPops, SUGESTOES_POPS_MANUAL, situacaoRevisaoPOP } from "../lib/pops.ts";

test("oferece os POPs mencionados expressamente no Manual", () => {
  assert.equal(SUGESTOES_POPS_MANUAL.length, 3);
  assert.equal(SUGESTOES_POPS_MANUAL.some((pop) => pop.titulo.includes("potabilidade")), true);
  assert.equal(SUGESTOES_POPS_MANUAL.some((pop) => pop.titulo.includes("temperatura")), true);
});

test("descarta registros vazios e preserva o vínculo do POP", () => {
  const pops = normalizarPops([
    {
      id: "",
      codigo: "POP-01",
      titulo: "Higienização",
      versao: "2.0",
      status: "Aprovado",
      programaRelacionado: "Limpeza e higienização/sanitização",
      responsavel: "Responsável técnico",
      proximaRevisao: "2027-01-10",
    },
    {
      id: "vazio",
      codigo: "",
      titulo: "",
      versao: "",
      status: "Rascunho",
      programaRelacionado: "",
      responsavel: "",
      proximaRevisao: "",
    },
  ]);

  assert.equal(pops.length, 1);
  assert.equal(pops[0].id, "pop-1");
  assert.equal(pops[0].programaRelacionado, "Limpeza e higienização/sanitização");
});

test("identifica POP aprovado com revisão vencida, próxima e em dia", () => {
  const base = {
    id: "pop-1",
    codigo: "POP-01",
    titulo: "Higienização",
    versao: "1.0",
    status: "Aprovado",
    programaRelacionado: "",
    responsavel: "RT",
    proximaRevisao: "2026-09-01",
  };
  assert.equal(situacaoRevisaoPOP(base, "2026-09-08").label, "Revisão vencida");
  assert.equal(situacaoRevisaoPOP({ ...base, proximaRevisao: "2026-09-20" }, "2026-09-08").label, "Revisão próxima");
  assert.equal(situacaoRevisaoPOP({ ...base, proximaRevisao: "2026-12-20" }, "2026-09-08").label, "Em dia");
});

test("não trata rascunho como revisão vencida", () => {
  const situacao = situacaoRevisaoPOP({
    id: "pop-2",
    codigo: "",
    titulo: "Potabilidade",
    versao: "1.0",
    status: "Rascunho",
    programaRelacionado: "",
    responsavel: "",
    proximaRevisao: "2020-01-01",
  }, "2026-09-08");
  assert.equal(situacao.label, "Em elaboração");
});
