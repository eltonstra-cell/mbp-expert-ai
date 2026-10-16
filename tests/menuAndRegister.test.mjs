import assert from "node:assert/strict";
import test from "node:test";
import { acoesDaEmpresa, acoesDaVisita, acoesDoAcesso, acoesDoPop, listaSemArquivadas, marcarArquivada } from "../lib/menuActions.ts";
import { arquivarPop, duplicarPop, normalizarPops, popsAtivos } from "../lib/pops.ts";
import { maisRecentesPrimeiro, visitaPadraoParaRegistro } from "../lib/registerTarget.ts";
import { passosDaTrilha } from "../lib/visitTrail.ts";

const abertas = [
  { id: "v1", empresaId: "e1", data: "2026-10-01", criadoEm: "2026-10-01T10:00:00Z" },
  { id: "v2", empresaId: "e2", data: "2026-10-10", criadoEm: "2026-10-10T10:00:00Z" },
  { id: "v3", empresaId: "e1", data: "2026-10-05", criadoEm: "2026-10-05T10:00:00Z" },
];

test("Registrar agora: usa a visita em que se está trabalhando", () => {
  assert.equal(visitaPadraoParaRegistro(abertas, "v1", "e2")?.id, "v1");
});

test("Registrar agora: sem visita ativa, a mais recente da empresa ativa (nunca a primeira da lista)", () => {
  assert.equal(visitaPadraoParaRegistro(abertas, null, "e1")?.id, "v3");
  assert.equal(visitaPadraoParaRegistro(abertas, "inexistente", "e1")?.id, "v3");
});

test("Registrar agora: empresa ativa sem visita aberta cai na mais recente de todas; sem visitas, nada", () => {
  assert.equal(visitaPadraoParaRegistro(abertas, null, "e9")?.id, "v2");
  assert.equal(visitaPadraoParaRegistro([], "v1", "e1"), undefined);
  assert.deepEqual(maisRecentesPrimeiro(abertas).map((v) => v.id), ["v2", "v3", "v1"]);
});

test("⋯ de Empresas por perfil", () => {
  assert.deepEqual(acoesDaEmpresa({ podeEditar: true, podeGerenciarAcessos: true, arquivada: false }), ["editar", "historico", "acessos", "arquivar"]);
  assert.deepEqual(acoesDaEmpresa({ podeEditar: true, podeGerenciarAcessos: false, arquivada: true }), ["editar", "historico", "desarquivar"]);
  assert.deepEqual(acoesDaEmpresa({ podeEditar: false, podeGerenciarAcessos: false, arquivada: false }), ["historico"]);
});

test("⋯ de Visitas por perfil e situação", () => {
  const base = { status: "Em andamento", podeContinuar: true, podeRelatorio: true, podeConcluir: true, podeExcluir: false };
  assert.deepEqual(acoesDaVisita(base), ["abrir", "relatorio", "encerrar"]);
  assert.deepEqual(acoesDaVisita({ ...base, podeExcluir: true }), ["abrir", "relatorio", "encerrar", "excluir"]);
  assert.deepEqual(acoesDaVisita({ ...base, status: "Concluída" }), ["abrir", "relatorio"]);
  // Cliente Gestor: só consulta o relatório da visita concluída.
  assert.deepEqual(acoesDaVisita({ status: "Concluída", podeContinuar: false, podeRelatorio: true, podeConcluir: false, podeExcluir: false }), ["abrir", "relatorio"]);
  assert.deepEqual(acoesDaVisita({ status: "Em andamento", podeContinuar: false, podeRelatorio: false, podeConcluir: false, podeExcluir: false }), []);
});

test("⋯ de POPs e de Acessos", () => {
  assert.deepEqual(acoesDoPop({ arquivado: false, podeEditar: true }), ["abrir", "duplicar", "arquivar", "excluir"]);
  assert.deepEqual(acoesDoPop({ arquivado: true, podeEditar: true }), ["abrir", "duplicar", "desarquivar", "excluir"]);
  assert.deepEqual(acoesDoPop({ arquivado: false, podeEditar: false }), ["abrir"]);
  assert.deepEqual(acoesDoAcesso({ status: "Ativo", podeGerenciar: true }), ["editar", "desativar"]);
  assert.deepEqual(acoesDoAcesso({ status: "Suspenso", podeGerenciar: true }), ["editar", "reativar"]);
  assert.deepEqual(acoesDoAcesso({ status: "Ativo", podeGerenciar: false }), []);
});

test("arquivar e desarquivar empresa não apaga nada", () => {
  const empresa = { id: "e1", nomeFantasia: "Chico", pops: [{ id: "p" }] };
  const arquivada = marcarArquivada(empresa, true, "2026-10-15T10:00:00Z");
  assert.equal(arquivada.arquivada, true);
  assert.deepEqual(arquivada.pops, empresa.pops);
  assert.equal(arquivada.nomeFantasia, "Chico");
  const volta = marcarArquivada(arquivada, false, "x");
  assert.equal(volta.arquivada, false);
  assert.equal("arquivadaEm" in volta, false);
  assert.equal(listaSemArquivadas([empresa, arquivada], false).length, 1);
  assert.equal(listaSemArquivadas([empresa, arquivada], true).length, 2);
});

test("duplicar e arquivar POP preservam os originais", () => {
  const pop = { id: "p1", codigo: "POP-01", titulo: "Higienização", versao: "3.0", status: "Aprovado", programaRelacionado: "x", responsavel: "Ana", proximaRevisao: "2027-01-01" };
  const dup = duplicarPop([pop], "p1", "p2");
  assert.equal(dup.length, 2);
  assert.deepEqual(dup[0], pop);
  assert.equal(dup[1].titulo, "Higienização (cópia)");
  assert.equal(dup[1].codigo, "");
  assert.equal(dup[1].status, "Rascunho");
  const arq = arquivarPop(dup, "p1", true);
  assert.equal(arq.length, 2, "nada é apagado");
  assert.equal(popsAtivos(arq).length, 1);
  assert.equal(arquivarPop(arq, "p1", false).find((p) => p.id === "p1").arquivado, false);
  assert.equal(normalizarPops(arq).find((p) => p.id === "p1").arquivado, true, "a normalização preserva o arquivamento");
  assert.equal(duplicarPop([pop], "inexistente", "x").length, 1);
});

test("grupo Visita atual: 6 passos na ordem do menu, com os contadores certos", () => {
  const passos = passosDaTrilha({ respondidos: 29, total: 221, evidencias: 2, correcoesAbertas: 9, popsPendentes: 1 });
  assert.deepEqual(passos.map((p) => p.rotulo), ["Central da visita", "Checklist", "Evidências", "Correções", "POPs da visita", "Relatório"]);
  assert.deepEqual(passos.map((p) => p.contador), [null, "29/221", "2", "9", "1", null]);
});
