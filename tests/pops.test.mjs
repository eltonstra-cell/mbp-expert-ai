import assert from "node:assert/strict";
import test from "node:test";
import { normalizarPops, SUGESTOES_POPS_MANUAL } from "../lib/pops.ts";

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
