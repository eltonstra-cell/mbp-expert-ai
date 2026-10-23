import assert from "node:assert/strict";
import test from "node:test";

import { interpretarDitadoDoAmbiente, propostaCompleta, temperaturaFalada } from "../lib/vozDoAmbiente.ts";

const item = (id, titulo, status = "Pendente") => ({ id, ambiente: "Câmara fria", titulo, categoria: "Higiene", status, observacao: "" });
const itens = [
  item("t1", "Temperatura da câmara fria dentro do limite"),
  item("p1", "Piso liso, lavável, conservado e com escoamento adequado"),
  item("v1", "Vedação das portas íntegra"),
];

test("lê temperatura falada: número por extenso, negativa, decimal e composta", () => {
  assert.equal(temperaturaFalada("sete graus"), 7);
  assert.equal(temperaturaFalada("menos dezoito graus"), -18);
  assert.equal(temperaturaFalada("4,5 °C"), 4.5);
  assert.equal(temperaturaFalada("vinte e cinco graus"), 25);
  assert.equal(temperaturaFalada("piso sujo"), null);
});

test("'câmara fria, sete graus, piso com sujidade' vira duas propostas (o lugar é só contexto)", () => {
  const propostas = interpretarDitadoDoAmbiente("câmara fria, sete graus, piso com sujidade", itens);
  assert.equal(propostas.length, 2);
  const [temp, piso] = propostas;
  assert.equal(temp.itemId, "t1");
  assert.equal(temp.temperatura.valor, 7);
  assert.equal(temp.temperatura.limiteId, "refrigerado");
  assert.equal(temp.status, "Não Conforme", "7 °C num refrigerado passa de 5 °C");
  assert.equal(piso.itemId, "p1");
  assert.equal(piso.status, "Não Conforme");
  assert.match(piso.observacao, /sujidade/);
  assert.ok(propostas.every(propostaCompleta));
});

test("trecho positivo vira Conforme; sem pista de resposta fica para o RT definir; sem item fica sem item", () => {
  const propostas = interpretarDitadoDoAmbiente("vedação das portas ok, etiqueta da prateleira do fundo ilegível", itens);
  assert.equal(propostas[0].itemId, "v1");
  assert.equal(propostas[0].status, "Conforme");
  assert.equal(propostas[1].itemId, null);
  assert.equal(propostas[1].status, null);
  assert.equal(propostaCompleta(propostas[1]), false);
});

test("temperatura sem limite conhecido não é classificada", () => {
  const so = [item("t9", "Temperatura registrada")];
  const [p] = interpretarDitadoDoAmbiente("oito graus", so);
  assert.equal(p.itemId, "t9");
  assert.equal(p.status, null);
  assert.equal(p.temperatura, undefined);
});

test("texto vazio não gera proposta", () => {
  assert.deepEqual(interpretarDitadoDoAmbiente("  ", itens), []);
});
