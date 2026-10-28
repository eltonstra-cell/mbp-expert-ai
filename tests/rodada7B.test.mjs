import assert from "node:assert/strict";
import test from "node:test";

import { adicionarEquipamentoNoSetor, mesmoNomeOuSinonimo } from "../lib/equipamentosCadastro.ts";
import { equipamentosSugeridosParaSetor, sugestaoPorCnae } from "../lib/sugestaoPorCnae.ts";
import { limiteSugeridoParaEquipamento } from "../lib/tiposDeEstabelecimento.ts";

const COZINHA = "Cozinha / Produção";
const sugestao = sugestaoPorCnae({ cnae: "5611201", cnaeDescricao: "Restaurantes e similares" });

test("B2: setor com itens ainda oferece as sugestões que faltam, sem repetir por sinônimo", () => {
  const todas = equipamentosSugeridosParaSetor(sugestao, COZINHA, [], mesmoNomeOuSinonimo).map((i) => i.nome);
  assert.ok(todas.includes("Refrigerador") && todas.includes("Fogão"));
  const comGeladeira = equipamentosSugeridosParaSetor(sugestao, COZINHA, ["Geladeira"], mesmoNomeOuSinonimo).map((i) => i.nome);
  assert.equal(comGeladeira.includes("Refrigerador"), false, "Geladeira já cobre o Refrigerador");
  assert.ok(comGeladeira.includes("Fogão"));
  const aposAdicionar = equipamentosSugeridosParaSetor(sugestao, COZINHA, ["Fogão"], mesmoNomeOuSinonimo).map((i) => i.nome);
  assert.equal(aposAdicionar.includes("Fogão"), false, "o que entrou some da lista");
  const tudo = todas.slice();
  assert.equal(equipamentosSugeridosParaSetor(sugestao, COZINHA, tudo, mesmoNomeOuSinonimo).length, 0, "sem sobras: nada a oferecer");
});

test("B2: o toque adiciona com Qtd 1 e o limite sugerido, como no adicionar normal", () => {
  const { criado } = adicionarEquipamentoNoSetor([], { id: "x", setor: COZINHA, nome: "Refrigerador", quantidade: 1, limiteTemperaturaId: limiteSugeridoParaEquipamento("Refrigerador")?.id });
  assert.equal(criado.quantidade, 1);
  assert.equal(criado.limiteTemperaturaId, "refrigerado");
  assert.equal(criado.setor, COZINHA);
});
