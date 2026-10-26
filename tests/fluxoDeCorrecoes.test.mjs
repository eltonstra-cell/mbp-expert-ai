import assert from "node:assert/strict";
import test from "node:test";

import { agruparCorrecoes, aposSalvarPlano, ordemVisual, primeiraSemPlano, proximaSemPlano, restantesSemPlano } from "../lib/fluxoDeCorrecoes.ts";
import { rodapeDoSalvar } from "../lib/correcaoRotulos.ts";

const nc = (id, extra = {}) => ({ id, status: "Aberta", acaoCorretiva: "", responsavelAcao: "", prazo: "", gravidade: "Rotina", ambiente: "Cozinha", ...extra });
const comPlano = (id, extra = {}) => nc(id, { acaoCorretiva: "Trocar", responsavelAcao: "Bia", prazo: "2030-01-01", ...extra });

test("proximaSemPlano: segue a ordem, dá a volta e exclui a atual", () => {
  const lista = [nc("a"), comPlano("b"), nc("c"), nc("d")];
  assert.equal(proximaSemPlano(lista, "a"), "c");
  assert.equal(proximaSemPlano(lista, "c"), "d");
  assert.equal(proximaSemPlano(lista, "d"), "a");
  assert.equal(proximaSemPlano(lista, "b"), "c");
});

test("proximaSemPlano: null com lista vazia, só a atual ou nenhuma sem plano", () => {
  assert.equal(proximaSemPlano([], "a"), null);
  assert.equal(proximaSemPlano([nc("a")], "a"), null);
  assert.equal(proximaSemPlano([nc("a"), comPlano("b")], "a"), null);
});

test("proximaSemPlano: faltando só o prazo ou só o responsável ainda é sem plano; acompanhamento e resolvidas nunca", () => {
  const lista = [comPlano("a"), comPlano("b", { prazo: "" }), comPlano("c", { responsavelAcao: " " }), comPlano("d", { status: "Em tratamento", prazo: "" }), nc("e", { status: "Resolvida" })];
  assert.equal(proximaSemPlano(lista, "a"), "b");
  assert.equal(proximaSemPlano(lista, "b"), "c");
  assert.equal(proximaSemPlano(lista, "c"), "b");
  assert.equal(proximaSemPlano([comPlano("a"), lista[3], lista[4]], "a"), null);
});

test("restantesSemPlano não conta a correção salva, mesmo que o estado ainda a mostre sem plano", () => {
  const lista = [nc("a"), nc("b"), comPlano("c")];
  assert.equal(restantesSemPlano(lista, "a"), 1);
  assert.equal(restantesSemPlano(lista, "c"), 2);
});

test("agrupar por gravidade e por ambiente; a ordem visual achatada segue o agrupamento", () => {
  const itens = [
    nc("1", { gravidade: "Crítica", ambiente: "Estoque" }),
    nc("2", { gravidade: "Rotina", ambiente: "Cozinha" }),
    nc("3", { gravidade: "Crítica", ambiente: "Cozinha" }),
    nc("4", { gravidade: "Importante", ambiente: "" }),
  ];
  const porGravidade = agruparCorrecoes(itens, "gravidade");
  assert.deepEqual(porGravidade.map((g) => [g.rotulo, g.itens.map((x) => x.id)]), [["CRÍTICAS", ["1", "3"]], ["IMPORTANTES", ["4"]], ["LEVES", ["2"]]]);
  const porAmbiente = agruparCorrecoes(itens, "ambiente");
  assert.deepEqual(porAmbiente.map((g) => [g.rotulo, g.itens.map((x) => x.id)]), [["ESTOQUE", ["1"]], ["COZINHA", ["2", "3"]], ["SEM AMBIENTE", ["4"]]]);
  assert.deepEqual(ordemVisual(itens, "gravidade").map((x) => x.id), ["1", "3", "4", "2"]);
  assert.deepEqual(ordemVisual(itens, "ambiente").map((x) => x.id), ["1", "2", "3", "4"]);
  assert.equal(proximaSemPlano(ordemVisual(itens, "ambiente"), "1"), "2");
  assert.equal(proximaSemPlano(ordemVisual(itens, "gravidade"), "1"), "3");
});

test("aposSalvarPlano: em Identificadas com próxima, fica na aba e abre a próxima", () => {
  const r = aposSalvarPlano({ etapaAntes: "identificadas", proximoId: "b", idSalvo: "a", restantes: 3 });
  assert.deepEqual(r, { etapa: "identificadas", selecionar: "b", limparFiltros: false, aviso: "Plano salvo. Faltam 3 sem plano." });
  assert.equal(aposSalvarPlano({ etapaAntes: "identificadas", proximoId: "b", idSalvo: "a", restantes: 1 }).aviso, "Plano salvo. Falta 1 sem plano.");
});

test("aposSalvarPlano: em Identificadas sem próxima vai a Com plano, limpa filtros e mantém a correção", () => {
  const r = aposSalvarPlano({ etapaAntes: "identificadas", proximoId: null, idSalvo: "a", restantes: 0 });
  assert.deepEqual(r, { etapa: "plano", selecionar: "a", limparFiltros: true, aviso: "Plano salvo. Não há mais correções sem plano." });
});

test("aposSalvarPlano: em Com plano e Em acompanhamento não avança", () => {
  for (const etapa of ["plano", "acompanhamento"]) {
    const r = aposSalvarPlano({ etapaAntes: etapa, proximoId: "b", idSalvo: "a", restantes: 2 });
    assert.deepEqual(r, { etapa, selecionar: "a", limparFiltros: false, aviso: "Plano salvo." });
  }
});

test("rodapeDoSalvar: falta, próxima, última sem plano e outras etapas", () => {
  assert.equal(rodapeDoSalvar({ faltas: ["a ação", "o responsável"], proximoTitulo: "Piso", etapa: "identificadas" }), "Falta: a ação e o responsável");
  assert.equal(rodapeDoSalvar({ faltas: [], proximoTitulo: "Piso quebrado", etapa: "identificadas" }), "Depois de salvar, abre: Piso quebrado");
  assert.equal(rodapeDoSalvar({ faltas: [], proximoTitulo: null, etapa: "identificadas" }), "Esta é a última sem plano");
  assert.equal(rodapeDoSalvar({ faltas: [], proximoTitulo: null, etapa: "plano" }), "");
  assert.equal(rodapeDoSalvar({ faltas: [], proximoTitulo: null, etapa: "acompanhamento" }), "");
});

test("proximaSemPlano com idAtual ausente da lista (filtro escondeu a atual) parte do começo", () => {
  const lista = [comPlano("a"), nc("b"), nc("c")];
  assert.equal(proximaSemPlano(lista, "fora"), "b");
  assert.equal(proximaSemPlano([comPlano("a")], "fora"), null);
});

test("restantesSemPlano com a lista COMPLETA conta as escondidas pelo filtro (lista visível é menor que a aba)", () => {
  const todas = [nc("a", { reincidente: true }), nc("b"), nc("c"), comPlano("d")];
  const visiveis = todas.filter((x) => x.reincidente);
  assert.equal(restantesSemPlano(visiveis, "a"), 0);
  assert.equal(restantesSemPlano(todas, "a"), 2);
  assert.equal(proximaSemPlano(visiveis, "a"), null);
  assert.equal(primeiraSemPlano(todas, "a"), "b");
  assert.equal(primeiraSemPlano([todas[0], comPlano("z")], "a"), null);
});

test("aposSalvarPlano: sem próxima visível mas com outras fora do filtro, fica em Identificadas, limpa filtros e abre a primeira", () => {
  const r = aposSalvarPlano({ etapaAntes: "identificadas", proximoId: null, foraDoFiltroId: "b", idSalvo: "a", restantes: 2 });
  assert.deepEqual(r, { etapa: "identificadas", selecionar: "b", limparFiltros: true, aviso: "Plano salvo. Faltam 2 sem plano." });
  assert.equal(aposSalvarPlano({ etapaAntes: "identificadas", proximoId: null, foraDoFiltroId: "b", idSalvo: "a", restantes: 1 }).aviso, "Plano salvo. Falta 1 sem plano.");
});

test("aposSalvarPlano: a próxima visível tem prioridade e não limpa filtros", () => {
  const r = aposSalvarPlano({ etapaAntes: "identificadas", proximoId: "c", foraDoFiltroId: "b", idSalvo: "a", restantes: 2 });
  assert.deepEqual(r, { etapa: "identificadas", selecionar: "c", limparFiltros: false, aviso: "Plano salvo. Faltam 2 sem plano." });
});

test("aposSalvarPlano: só vai a Com plano quando não sobra nenhuma, nem fora do filtro", () => {
  const r = aposSalvarPlano({ etapaAntes: "identificadas", proximoId: null, foraDoFiltroId: null, idSalvo: "a", restantes: 0 });
  assert.equal(r.etapa, "plano");
  assert.equal(r.aviso, "Plano salvo. Não há mais correções sem plano.");
});

test("rodapeDoSalvar: com outras sem plano fora do filtro não diz 'última' e não cita título", () => {
  assert.equal(rodapeDoSalvar({ faltas: [], proximoTitulo: null, etapa: "identificadas", haOutraSemPlano: true }), "Depois de salvar, abre a próxima sem plano");
  assert.equal(rodapeDoSalvar({ faltas: [], proximoTitulo: null, etapa: "identificadas", haOutraSemPlano: false }), "Esta é a última sem plano");
  assert.equal(rodapeDoSalvar({ faltas: [], proximoTitulo: null, etapa: "plano", haOutraSemPlano: true }), "");
  assert.equal(rodapeDoSalvar({ faltas: ["a ação"], proximoTitulo: null, etapa: "identificadas", haOutraSemPlano: true }), "Falta: a ação");
});
