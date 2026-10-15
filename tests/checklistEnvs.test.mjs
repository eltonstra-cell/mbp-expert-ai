import assert from "node:assert/strict";
import test from "node:test";

import {
  agruparPorSituacao,
  filtrarAmbientes,
  quantidadeDeAmbientes,
  resumoAmbientes,
  situacaoDoAmbiente,
  vizinhoDoAmbiente,
} from "../lib/checklistEnvs.ts";

const item = (ambiente, status) => ({ ambiente, status });
const ORDEM = ["Cozinha", "Estoque seco", "Câmara fria", "Higienização", "Banheiros"];
const itens = [
  item("Cozinha", "Conforme"),
  item("Cozinha", "Conforme"),
  item("Estoque seco", "Conforme"),
  item("Estoque seco", "Pendente"),
  item("Câmara fria", "Não Conforme"),
  item("Câmara fria", "Pendente"),
  item("Higienização", "Pendente"),
  item("Banheiros", "Não se aplica"),
];

test("situação do ambiente: nc, concluído, em avaliação e pendente", () => {
  assert.equal(situacaoDoAmbiente(3, 1, 1), "nc");
  assert.equal(situacaoDoAmbiente(3, 3, 0), "concluido");
  assert.equal(situacaoDoAmbiente(3, 1, 0), "avaliacao");
  assert.equal(situacaoDoAmbiente(3, 0, 0), "pendente");
  assert.equal(situacaoDoAmbiente(0, 0, 0), "pendente");
});

test("ordem fixa: a faixa segue sempre a ordem da visita, qualquer que seja a situação", () => {
  const infos = resumoAmbientes(ORDEM, itens);
  assert.deepEqual(infos.map((i) => i.nome), ORDEM);
  const trocado = resumoAmbientes(ORDEM, [...itens].reverse());
  assert.deepEqual(trocado.map((i) => i.nome), ORDEM);
  assert.deepEqual(infos.map((i) => i.situacao), ["concluido", "avaliacao", "nc", "pendente", "concluido"]);
});

test("ambientes repetidos na visita aparecem uma vez, na primeira posição", () => {
  const infos = resumoAmbientes(["A", "B", "A", "C"], []);
  assert.deepEqual(infos.map((i) => i.nome), ["A", "B", "C"]);
});

test("uma fonte para a contagem: verificação geral aparece depois e não entra no total", () => {
  const infos = resumoAmbientes(ORDEM, itens, [{ nome: "__programas__", rotulo: "Programas de Controle" }]);
  assert.equal(infos.length, ORDEM.length + 1);
  assert.equal(quantidadeDeAmbientes(infos), ORDEM.length);
  assert.equal(infos.at(-1).geral, true);
  assert.equal(infos.at(-1).rotulo, "Programas de Controle");
});

test("agrupamento por situação mantém a ordem da visita dentro de cada grupo", () => {
  const grupos = agruparPorSituacao(resumoAmbientes(ORDEM, itens));
  assert.deepEqual(grupos.map((g) => g.situacao), ["nc", "avaliacao", "pendente", "concluido"]);
  assert.deepEqual(grupos[0].itens.map((i) => i.nome), ["Câmara fria"]);
  assert.deepEqual(grupos[3].itens.map((i) => i.nome), ["Cozinha", "Banheiros"]);
});

test("busca de ambientes ignora acento e maiúsculas", () => {
  const infos = resumoAmbientes(ORDEM, itens);
  assert.deepEqual(filtrarAmbientes(infos, "CAMARA").map((i) => i.nome), ["Câmara fria"]);
  assert.deepEqual(filtrarAmbientes(infos, "higieniz").map((i) => i.nome), ["Higienização"]);
  assert.equal(filtrarAmbientes(infos, "").length, ORDEM.length);
  assert.equal(filtrarAmbientes(infos, "zzz").length, 0);
});

test("Anterior e Próximo andam pela ordem da visita e param nas pontas", () => {
  const infos = resumoAmbientes(ORDEM, itens);
  assert.equal(vizinhoDoAmbiente(infos, "Estoque seco", 1), "Câmara fria");
  assert.equal(vizinhoDoAmbiente(infos, "Estoque seco", -1), "Cozinha");
  assert.equal(vizinhoDoAmbiente(infos, "Cozinha", -1), null);
  assert.equal(vizinhoDoAmbiente(infos, "Banheiros", 1), null);
  assert.equal(vizinhoDoAmbiente(infos, "Inexistente", 1), null);
});
