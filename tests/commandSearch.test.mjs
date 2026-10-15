import assert from "node:assert/strict";
import test from "node:test";

import {
  buscar,
  buscarComInterpretador,
  construirDestinos,
  distanciaEdicao,
  normalizar,
  pontuar,
  sugestoes,
} from "../lib/commandSearch.ts";
import { itensVisiveis } from "../lib/navigation.ts";
import { PERMISSIONS_BY_PROFILE } from "../lib/permissions.ts";

const ctx = (perfil, dentroDeVisita) => ({
  dentroDeVisita,
  pode: (acao) => PERMISSIONS_BY_PROFILE[perfil].includes(acao),
});

function entrada(perfil, dentroDeVisita = true, extra = {}) {
  const contexto = ctx(perfil, dentroDeVisita);
  const podeChecklist = contexto.pode("visitas.executar");
  return {
    itensMenu: itensVisiveis(contexto),
    empresas: [
      { id: "e1", nome: "Padaria Pão Quente" },
      { id: "e2", nome: "Restaurante Sabor" },
    ],
    empresaAtivaId: "e1",
    visitas: [
      { id: "v1", empresaId: "e1", rotulo: "15/10/2026", status: "Em andamento" },
      { id: "v2", empresaId: "e2", rotulo: "10/10/2026", status: "Concluída" },
    ],
    dentroDeVisita,
    ambientes: podeChecklist ? ["Cozinha", "Câmara fria"] : [],
    itensChecklist: podeChecklist
      ? [
          { id: "i1", ambiente: "Cozinha", titulo: "Paredes lisas e sem rachaduras", status: "Pendente" },
          { id: "i2", ambiente: "Câmara fria", titulo: "Temperatura registrada diariamente", status: "Conforme" },
        ]
      : [],
    visitaEmAndamentoId: "v1",
    podeChecklist,
    ...extra,
  };
}

const titulos = (resultados) => resultados.map((r) => r.destino.titulo);

test("normaliza: sem acento, sem maiúsculas, sem pontuação", () => {
  assert.equal(normalizar("  Não  Conformidades! "), "nao conformidades");
  assert.equal(normalizar("ÁREA de Higienização"), "area de higienizacao");
});

test("distância de edição conta transposição como 1 erro", () => {
  assert.equal(distanciaEdicao("checklist", "chekclist"), 1);
  assert.equal(distanciaEdicao("relatorio", "relatorrio"), 1);
  assert.equal(distanciaEdicao("plano", "prato"), 2);
});

test("busca sem acento e sem diferença de maiúsculas", () => {
  const destinos = construirDestinos(entrada("Administrador"));
  assert.ok(titulos(buscar("NAO CONFORMIDADES", destinos)).includes("Não conformidades"));
  assert.ok(titulos(buscar("camara", destinos)).includes("Câmara fria"));
  assert.ok(titulos(buscar("relatório", destinos)).includes("Relatório"));
});

test("busca por prefixo e por palavras fora de ordem", () => {
  const destinos = construirDestinos(entrada("Administrador"));
  assert.ok(titulos(buscar("conform", destinos)).includes("Não conformidades"));
  assert.ok(titulos(buscar("conformidades nao", destinos)).includes("Não conformidades"));
  assert.ok(titulos(buscar("fria camara", destinos)).includes("Câmara fria"));
  assert.equal(titulos(buscar("temperatura paredes", destinos)).length, 0, "todos os termos precisam casar no mesmo destino");
});

test("tolera 1 erro de digitação, mas não 2", () => {
  const destinos = construirDestinos(entrada("Administrador"));
  assert.ok(titulos(buscar("chekclist", destinos)).includes("Checklist"));
  assert.ok(titulos(buscar("relatorrio", destinos)).includes("Relatório"));
  assert.equal(buscar("chxxklist", destinos).length, 0);
});

test("sinônimos encontram o destino (nc, pdf, fotos)", () => {
  const destinos = construirDestinos(entrada("Administrador"));
  assert.equal(titulos(buscar("nc", destinos))[0], "Não conformidades");
  assert.ok(titulos(buscar("pdf", destinos)).includes("Relatório"));
  assert.ok(titulos(buscar("fotos", destinos)).includes("Evidências"));
});

test("contexto: etapas da visita em andamento ganham prioridade sobre o resto", () => {
  const dentro = construirDestinos(entrada("Administrador", true));
  const fora = construirDestinos(entrada("Administrador", false));
  const pontosDentro = buscar("checklist", dentro).find((r) => r.destino.id === "ir:checklist").pontos;
  const pontosFora = buscar("checklist", fora).find((r) => r.destino.id === "ir:checklist").pontos;
  assert.ok(pontosDentro > pontosFora);
});

test("ordena por relevância: título que começa com o termo vem antes", () => {
  const destinos = construirDestinos(entrada("Administrador"));
  const resultados = buscar("visitas", destinos);
  assert.equal(resultados[0].destino.titulo, "Visitas");
  // palavra exata do título supera prefixo: "visita" leva à visita em andamento (contexto)
  assert.equal(buscar("visita", destinos)[0].destino.id, "vis:v1");
});

test("Cliente Gestor só encontra o que o menu dele mostra", () => {
  const destinos = construirDestinos(entrada("Cliente Gestor", true));
  const todos = destinos.map((d) => d.titulo);
  for (const proibido of ["Checklist", "Evidências", "Acessos", "POPs e documentos", "Ambientes", "Registrar", "Continuar inspeção"]) {
    assert.ok(!todos.includes(proibido), proibido);
  }
  assert.equal(destinos.filter((d) => d.grupo === "itens").length, 0, "sem itens do checklist");
  assert.equal(buscar("checklist", destinos).length, 0);
  assert.equal(buscar("registrar", destinos).length, 0);
  assert.ok(titulos(buscar("nao conformidades", destinos)).includes("Não conformidades"));
});

test("Administrador encontra Registrar, Continuar inspeção e itens do checklist", () => {
  const destinos = construirDestinos(entrada("Administrador", true));
  assert.ok(titulos(buscar("registrar", destinos)).includes("Registrar"));
  assert.ok(titulos(buscar("continuar", destinos)).includes("Continuar inspeção"));
  assert.ok(titulos(buscar("rachaduras", destinos)).includes("Paredes lisas e sem rachaduras"));
});

test("visitas só da empresa ativa; empresas conforme a lista recebida", () => {
  const destinos = construirDestinos(entrada("Administrador", true));
  const visitas = destinos.filter((d) => d.id.startsWith("vis:"));
  assert.deepEqual(visitas.map((d) => d.id), ["vis:v1"]);
  assert.ok(titulos(buscar("padaria", destinos)).includes("Padaria Pão Quente"));
  assert.ok(titulos(buscar("sabor", destinos)).includes("Restaurante Sabor"));
});

test("sem consulta, sugere destinos de navegação e ações (sem itens do checklist)", () => {
  const destinos = construirDestinos(entrada("Consultor/RT", true));
  const s = sugestoes(destinos);
  assert.ok(s.length > 0);
  assert.ok(s.every((r) => r.destino.grupo === "ir" || r.destino.grupo === "agir"));
});

test("consulta vazia não retorna resultados de busca", () => {
  const destinos = construirDestinos(entrada("Administrador"));
  assert.equal(buscar("   ", destinos).length, 0);
  assert.equal(pontuar("", destinos[0]), 0);
});

test("ponto de extensão: interpretador entra antes e a busca normal é o plano B", async () => {
  const destinos = construirDestinos(entrada("Administrador"));
  const alvo = destinos.find((d) => d.id === "ir:relatorio");
  const viaIa = await buscarComInterpretador("quero o pdf", destinos, async () => [{ destino: alvo, pontos: 99 }]);
  assert.equal(viaIa[0].destino.id, "ir:relatorio");
  const falha = await buscarComInterpretador("relatorio", destinos, async () => {
    throw new Error("sem rede");
  });
  assert.ok(titulos(falha).includes("Relatório"));
  const nulo = await buscarComInterpretador("relatorio", destinos, async () => null);
  assert.ok(titulos(nulo).includes("Relatório"));
  const semInterpretador = await buscarComInterpretador("relatorio", destinos);
  assert.ok(titulos(semInterpretador).includes("Relatório"));
});
