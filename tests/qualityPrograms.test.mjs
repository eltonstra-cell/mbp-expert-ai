import assert from "node:assert/strict";
import test from "node:test";
import {
  criarProgramasControlePadrao,
  normalizarProgramasControle,
  obterCriteriosProgramasControle,
} from "../lib/qualityPrograms.ts";

test("carrega os 15 programas descritos no Capítulo 3", () => {
  const programas = criarProgramasControlePadrao();
  assert.equal(programas.length, 15);
  assert.equal(programas.every((programa) => programa.status === "Não iniciado"), true);
});

test("preserva situação, responsável e vínculo documental", () => {
  const programa = {
    ...criarProgramasControlePadrao()[0],
    status: "Implantado",
    responsavel: "Gerente",
    documentoRelacionado: "POP de fornecedores",
  };
  const normalizados = normalizarProgramasControle([programa]);
  assert.equal(normalizados[0].status, "Implantado");
  assert.equal(normalizados[0].responsavel, "Gerente");
  assert.equal(normalizados[0].documentoRelacionado, "POP de fornecedores");
});

test("checklist inclui apenas programas implantados ou em implantação", () => {
  const programas = criarProgramasControlePadrao();
  programas[0] = { ...programas[0], status: "Implantado" };
  programas[1] = { ...programas[1], status: "Em implantação" };
  programas[2] = { ...programas[2], status: "Não se aplica" };

  const criterios = obterCriteriosProgramasControle(programas);
  assert.equal(criterios.length, 4);
  assert.equal(criterios.every((item) => item.referencia.includes("Capítulo 3")), true);
  assert.equal(criterios.some((item) => item.titulo.includes("fornecedores são avaliados")), true);
});
