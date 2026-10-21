import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buscar, construirDestinos } from "../lib/commandSearch.ts";
import { chaveAtiva, itensVisiveis } from "../lib/navigation.ts";
import { acoesDaEmpresa } from "../lib/menuActions.ts";
import { caminhoDaFicha } from "../lib/caminhoDaFicha.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

const entrada = {
  itensMenu: [],
  empresas: [],
  empresaAtivaId: "e1",
  visitas: [],
  dentroDeVisita: false,
  ambientes: [],
  itensChecklist: [],
  visitaEmAndamentoId: null,
  podeChecklist: false,
  subabasCentral: ["dados", "norma", "pops", "comprovantes"],
  nomeEmpresaAtiva: "Padaria Teste",
  abasRelatorios: ["emitidos", "resumo", "dossie", "evolucao"],
};

test("B4: 'central', 'empresa', 'pop' e 'norma' acham a Central e suas sub-abas, com o caminho", () => {
  const destinos = construirDestinos(entrada);
  const titulos = (consulta) => buscar(consulta, destinos).map((item) => item.destino.titulo);
  assert.equal(titulos("central")[0], "Central da Empresa · Padaria Teste");
  assert.ok(titulos("central").includes("POPs da empresa") && titulos("central").includes("Dados da empresa"));
  assert.ok(titulos("empresa").includes("Dados da empresa"));
  assert.ok(titulos("pop").includes("POPs da empresa"));
  assert.ok(titulos("norma").includes("Norma aplicável"));
  const pops = destinos.find((destino) => destino.id === "ir:central:pops");
  assert.equal(pops.detalhe, "Central › Documentos › POPs");
  assert.equal(destinos.find((destino) => destino.id === "ir:central:dados").detalhe, "Central › Empresa › Dados");
});

test("B4: relatórios, resumo, dossiê e evolução entram na busca", () => {
  const destinos = construirDestinos(entrada);
  for (const [consulta, id] of [["dossie", "ir:relatorios:dossie"], ["resumo", "ir:relatorios:resumo"], ["evolucao", "ir:relatorios:evolucao"], ["emitidos", "ir:relatorios:emitidos"]]) {
    assert.ok(buscar(consulta, destinos).some((item) => item.destino.id === id), consulta);
  }
});

test("B4: 'central' abre a última sub-aba usada, senão Empresa › Dados", () => {
  const padrao = construirDestinos(entrada).find((destino) => destino.id === "ir:central-empresa");
  assert.deepEqual(padrao.acao, { tipo: "central", subaba: "dados" });
  const lembrada = construirDestinos({ ...entrada, subabaCentralInicial: "pops" }).find((destino) => destino.id === "ir:central-empresa");
  assert.deepEqual(lembrada.acao, { tipo: "central", subaba: "pops" });
});

test("B1: o menu da empresa tem 'Central da Empresa' e não tem mais 'Editar empresa'", () => {
  assert.equal(acoesDaEmpresa({ podeEditar: true, podeGerenciarAcessos: false, arquivada: false })[0], "central");
  const tela = ler("../components/pc/PcEmpresas.tsx");
  assert.ok(!tela.includes("Editar empresa") && tela.includes("Central da Empresa"));
  assert.ok(tela.includes('className="ui-btn ui-btn--secondary" onClick={() => onGerenciar(empresa.id)}'));
});

test("B2: ficha do POP mostra só o caminho e o cabeçalho fica fixo", () => {
  assert.deepEqual(caminhoDaFicha("POP-01"), ["Central", "Documentos", "POPs", "POP-01"]);
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".ficha-topo{position:sticky;top:0"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("fichaAbertaRotulo && subabaDosDocumentos") && pagina.includes("aoMudarFicha={setFichaAbertaRotulo}"));
});

test("B3: Relatórios é item do menu e ativa nas quatro telas", () => {
  for (const view of ["relatoriosemitidos", "resumo", "dossie", "evolucao"]) assert.equal(chaveAtiva(view), "relatorios", view);
  const pode = () => true;
  assert.ok(itensVisiveis({ dentroDeVisita: false, pode }).some((item) => item.key === "relatorios"));
  assert.ok(!itensVisiveis({ dentroDeVisita: false, pode: () => false }).some((item) => item.key === "relatorios"));
});

test("B5: Início com um só número de correções, preparação com itens clicáveis e painel Hoje com 3 + Ver todos", () => {
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(!inicio.includes("Correções abertas na empresa") && inicio.includes("Visitas em andamento"));
  assert.ok(inicio.includes("prep-faltam") && inicio.includes("item.onAbrir"));
  assert.ok(!inicio.includes("useCabem"), "Visitas recentes inteiro, rolando por dentro");
  const painel = ler("../components/PainelHoje.tsx");
  assert.ok(painel.includes("ITENS_INICIAIS = 3") && painel.includes("Ver todos ("));
});

test("B6: Trocar empresa usa os nomes da lista e Fechar cinza; Nova empresa laranja", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("nome: nomeParaExibir(db.empresas[opcao.id])"));
  assert.ok(ler("../components/campo/TrocarEmpresaPainel.tsx").includes("campo-btn--cinza"));
  assert.ok(ler("../components/pc/PcEmpresas.tsx").includes('className="ui-btn ui-btn--criar" onClick={onNova}'));
});
