import assert from "node:assert/strict";
import test from "node:test";
import {
  criarFluxosOperacionaisPadrao,
  normalizarFluxosOperacionais,
  obterCriteriosOperacionaisParaSetor,
} from "../lib/operationalFlows.ts";

test("cria os 11 fluxos do Capítulo 2 sem presumir que se aplicam", () => {
  const fluxos = criarFluxosOperacionaisPadrao();
  assert.equal(fluxos.length, 11);
  assert.equal(fluxos.every((fluxo) => fluxo.aplicavel === false), true);
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
