import assert from "node:assert/strict";
import test from "node:test";
import {
  adequarFluxosAosSetores,
  criarFluxosOperacionaisPadrao,
  normalizarFluxosOperacionais,
  obterCriteriosOperacionaisParaSetor,
  obterSetorSugeridoParaFluxo,
} from "../lib/operationalFlows.ts";

test("cria os 11 fluxos do Capítulo 2 sem presumir que se aplicam", () => {
  const fluxos = criarFluxosOperacionaisPadrao();
  assert.equal(fluxos.length, 11);
  assert.equal(fluxos.every((fluxo) => fluxo.aplicavel === false), true);
});

test("corrige vínculo antigo de fluxo ativo ao carregar a lista detalhada", () => {
  const fluxos = criarFluxosOperacionaisPadrao();
  const congelamento = fluxos.find((fluxo) => fluxo.tipo === "Congelamento");
  congelamento.aplicavel = true;
  const corrigidos = adequarFluxosAosSetores(fluxos, [
    "Recebimento de Mercadorias",
    "Cozinha",
    "Armazenamento Congelado (Freezers)",
  ]);
  assert.equal(
    corrigidos.find((fluxo) => fluxo.tipo === "Congelamento").setorVinculado,
    "Armazenamento Congelado (Freezers)"
  );
});

test("sugere os ambientes reais corretos para os fluxos do restaurante", () => {
  const setores = [
    "Recebimento de Mercadorias",
    "Cozinha",
    "Higienização de Hortifrutigranjeiros",
    "Armazenamento Congelado (Freezers)",
    "Armazenamento Temporário de Resíduos",
    "Sanitários/Vestiários de Funcionários",
  ];
  assert.equal(obterSetorSugeridoParaFluxo("Recebimento", setores), "Recebimento de Mercadorias");
  assert.equal(obterSetorSugeridoParaFluxo("Higienização de FLV", setores), "Higienização de Hortifrutigranjeiros");
  assert.equal(obterSetorSugeridoParaFluxo("Congelamento", setores), "Armazenamento Congelado (Freezers)");
  assert.equal(obterSetorSugeridoParaFluxo("Manejo de resíduos", setores), "Armazenamento Temporário de Resíduos");
  assert.equal(obterSetorSugeridoParaFluxo("Entrada e saída de colaboradores", setores), "Sanitários/Vestiários de Funcionários");
});

test("preserva os dados confirmados ao normalizar os fluxos", () => {
  const recebimento = criarFluxosOperacionaisPadrao()[0];
  const fluxos = normalizarFluxosOperacionais([
    {
      ...recebimento,
      aplicavel: true,
      responsavel: "Encarregado",
      descricao: "Conferência no ato da entrega.",
    },
  ]);
  assert.equal(fluxos[0].aplicavel, true);
  assert.equal(fluxos[0].responsavel, "Encarregado");
  assert.equal(fluxos[0].descricao, "Conferência no ato da entrega.");
  assert.equal(fluxos[1].aplicavel, false);
});

test("gera critérios somente para fluxo ativo e setor vinculado", () => {
  const fluxos = criarFluxosOperacionaisPadrao();
  fluxos[0] = { ...fluxos[0], aplicavel: true };

  const recebimento = obterCriteriosOperacionaisParaSetor(
    fluxos,
    fluxos[0].setorVinculado
  );
  const cozinha = obterCriteriosOperacionaisParaSetor(fluxos, "Cozinha / Produção");

  assert.equal(recebimento.length, 3);
  assert.equal(recebimento.every((item) => item.referencia.includes("Capítulo 2")), true);
  assert.equal(cozinha.length, 0);
});
