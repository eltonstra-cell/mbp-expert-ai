import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { podeAcessarEmpresa, podeExecutar } from "../lib/permissions.ts";
import { permissoesEfetivas, telasEfetivas } from "../lib/screenAccess.ts";
import { filtrarEstadoPorUsuario, mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";
import { encerrarAcessoFiscal, criarUsuarioPreparacao, renovarAcessoFiscal } from "../lib/userManagement.ts";
import { acessoVigente, calcularValidade, dataDaValidade, diasRestantes, expiracoesSemRegistro, faixaDeLeitura, textoDoConvite } from "../lib/validadeDeAcesso.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

const pop = (id, status) => ({ id, codigo: id, titulo: `POP ${id}`, versao: "1.0", status, programaRelacionado: "", responsavel: "", proximaRevisao: "" });
const empresa = (id, pops = []) => ({ id, nomeFantasia: id, razaoSocial: id, pops });
const nc = (id, empresaId, visitaId, extra = {}) => ({ id, empresaId, visitaId, status: "Aberta", checklistItemId: "i1", titulo: "Piso", observacao: "", ...extra });

const base = () => ({
  empresas: { e1: empresa("e1", [pop("p1", "Aprovado"), pop("p2", "Rascunho")]), e2: empresa("e2", [pop("p3", "Aprovado")]) },
  empresaAtualId: "e1",
  visitas: [
    { id: "v1", empresaId: "e1", status: "Em andamento", checklist: [{ id: "i1", status: "Pendente" }], progresso: 10, observacoes: "x" },
    { id: "v2", empresaId: "e2", status: "Em andamento", checklist: [], progresso: 0 },
  ],
  ncs: [nc("v1:i0", "e1", "v1", { acaoCorretiva: "Trocar", status: "Em tratamento" }), nc("v2:i0", "e2", "v2")],
  evidencias: [{ id: "ev1", empresaId: "e1", visitaId: "v1" }, { id: "ev2", empresaId: "e2", visitaId: "v2" }],
  usuarios: [],
  registrosAuditoria: [],
});

const executor = { id: "u1", perfil: "Executor de campo", status: "Ativo", empresaIds: ["e1"], nome: "Ex", email: "ex@x.com" };
const fiscal = (extra = {}) => ({ id: "u2", perfil: "Fiscal", status: "Ativo", empresaIds: ["e1"], nome: "Fi", email: "fi@x.com", validoAte: "2026-12-31T23:59:59-03:00", ...extra });
const AGORA_ANTES = new Date("2026-12-01T12:00:00-03:00");

test("Executor: só Início, Checklist e Evidências (com Registrar), nas empresas atribuídas", () => {
  assert.deepEqual([...permissoesEfetivas(executor)].sort(), ["empresas.ver", "evidencias.adicionar", "visitas.executar"]);
  const telas = telasEfetivas(executor);
  for (const oculta of ["correcoes", "relatorio", "empresas", "pops", "ambientes", "acessos", "administracao", "visitas", "central", "popsVisita"]) assert.equal(telas[oculta], "oculta", oculta);
  assert.equal(telas.checklist, "editar");
  assert.equal(telas.evidencias, "editar");
  assert.equal(telas.inicio, "simples");
});

test("Executor: o servidor nega correções, relatório, acessos, empresas e empresa não atribuída", () => {
  for (const acao of ["ncs.acompanhar", "ncs.marcar_feita", "relatorios.exportar", "relatorios.aprovar", "usuarios.gerenciar", "empresas.editar", "visitas.criar", "visitas.concluir", "ia.analisar", "auditoria.ver"]) {
    assert.equal(podeExecutar(executor, acao, "e1"), false, acao);
  }
  assert.equal(podeExecutar(executor, "visitas.executar", "e1"), true);
  assert.equal(podeExecutar(executor, "evidencias.adicionar", "e1"), true);
  assert.equal(podeAcessarEmpresa(executor, "e2"), false);
  assert.equal(podeExecutar(executor, "evidencias.adicionar", "e2"), false);
});

test("Executor: não recebe correções nem outras empresas; dos POPs, só os aprovados (Ver POP)", () => {
  const estado = base();
  estado.empresas.e1.pops.push({ id: "p2", status: "Rascunho", titulo: "Rascunho" }, { id: "p3", status: "Aprovado", arquivado: true, titulo: "Arquivado" });
  const visto = filtrarEstadoPorUsuario(estado, executor);
  assert.deepEqual(Object.keys(visto.empresas), ["e1"]);
  assert.deepEqual(visto.ncs, []);
  assert.deepEqual(visto.empresas.e1.pops.map((pop) => pop.id), ["p1"]);
  assert.deepEqual(visto.visitas.map((v) => v.id), ["v1"]);
});

test("Executor: grava checklist e NC derivada, mas não plano, status, visita nova nem outra empresa", () => {
  const atual = base();
  const recebido = base();
  recebido.visitas[0].checklist = [{ id: "i1", status: "Não Conforme" }];
  recebido.visitas[0].status = "Concluída";
  recebido.visitas[0].progresso = 55;
  recebido.visitas.push({ id: "v9", empresaId: "e1", status: "Em andamento", checklist: [] });
  recebido.visitas[1].checklist = [{ id: "x", status: "Conforme" }];
  recebido.empresas.e1 = { ...recebido.empresas.e1, nomeFantasia: "Hackeada" };
  recebido.ncs = [
    nc("v1:i1", "e1", "v1", { status: "Resolvida", acaoCorretiva: "inventada" }),
    nc("v1:i0", "e1", "v1", { status: "Resolvida", acaoCorretiva: "Apagar", observacao: "nova obs" }),
    nc("v2:i1", "e2", "v2"),
  ];
  const novo = mesclarEstadoPorUsuario(atual, recebido, executor, "auth-1");
  const v1 = novo.visitas.find((v) => v.id === "v1");
  assert.equal(v1.checklist[0].status, "Não Conforme");
  assert.equal(v1.progresso, 55);
  assert.equal(v1.status, "Em andamento");
  assert.equal(novo.visitas.some((v) => v.id === "v9"), false);
  assert.deepEqual(novo.visitas.find((v) => v.id === "v2").checklist, []);
  assert.equal(novo.empresas.e1.nomeFantasia, "e1");
  const criada = novo.ncs.find((n) => n.id === "v1:i1");
  assert.equal(criada.status, "Aberta");
  assert.equal(criada.acaoCorretiva, undefined);
  const existente = novo.ncs.find((n) => n.id === "v1:i0");
  assert.equal(existente.status, "Em tratamento");
  assert.equal(existente.acaoCorretiva, "Trocar");
  assert.equal(existente.observacao, "nova obs");
  assert.equal(novo.ncs.some((n) => n.id === "v2:i1"), false);
});

test("Executor: NC inativa que volta a Não conforme reabre com histórico", () => {
  const atual = base();
  atual.ncs = [nc("v1:i1", "e1", "v1", { status: "Resolvida", inativaNoChecklist: true, resolvidaEm: "2026-10-01" })];
  const recebido = base();
  recebido.ncs = [nc("v1:i1", "e1", "v1", { inativaNoChecklist: false })];
  const novo = mesclarEstadoPorUsuario(atual, recebido, executor, "auth-1", "2026-10-20T10:00:00.000Z");
  const reaberta = novo.ncs[0];
  assert.equal(reaberta.status, "Aberta");
  assert.equal(reaberta.resolvidaEm, undefined);
  assert.equal(reaberta.historicoAcompanhamento.at(-1).observacao, "Reaberta: item voltou a Não conforme");
});

test("Fiscal: permissão só de leitura, sem ajuste que eleve", () => {
  assert.deepEqual(permissoesEfetivas(fiscal()), ["empresas.ver"]);
  const elevado = fiscal({ telas: { checklist: "editar", correcoes: "concluir", pops: "editar", inicio: "completo", relatorio: "editar", acessos: "ver" } });
  const telas = telasEfetivas(elevado);
  for (const tela of ["checklist", "evidencias", "correcoes", "relatorio", "pops", "acessos", "empresas", "visitas"]) assert.equal(telas[tela], "oculta", tela);
  assert.deepEqual(permissoesEfetivas(elevado), ["empresas.ver"]);
});

test("Fiscal: escrita sempre negada e dados filtrados (só POPs aprovados)", () => {
  for (const acao of ["visitas.executar", "evidencias.adicionar", "empresas.editar", "ncs.acompanhar", "ncs.marcar_feita", "relatorios.aprovar", "usuarios.gerenciar", "ia.analisar"]) {
    assert.equal(podeExecutar(fiscal(), acao, "e1", AGORA_ANTES), false, acao);
  }
  const visto = filtrarEstadoPorUsuario(base(), fiscal());
  assert.deepEqual(visto.visitas, []);
  assert.deepEqual(visto.ncs, []);
  assert.deepEqual(visto.evidencias, []);
  assert.deepEqual(visto.empresas.e1.pops.map((p) => p.id), ["p1"]);
  assert.deepEqual(Object.keys(visto.empresas), ["e1"]);

  const atual = base();
  const recebido = base();
  recebido.visitas[0].checklist = [{ id: "i1", status: "Conforme" }];
  recebido.empresas.e1 = { ...recebido.empresas.e1, nomeFantasia: "Hackeada" };
  recebido.ncs = [];
  recebido.evidencias = [];
  const novo = mesclarEstadoPorUsuario(atual, recebido, fiscal(), "auth-2");
  assert.deepEqual(novo.visitas, atual.visitas);
  assert.deepEqual(novo.ncs, atual.ncs);
  assert.deepEqual(novo.evidencias, atual.evidencias);
  assert.equal(novo.empresas.e1.nomeFantasia, "e1");
});

test("Fiscal: leitura permitida antes da validade, negada depois de expirar e depois de Encerrar agora", () => {
  const dentro = fiscal({ validoAte: calcularValidade(7, new Date()) });
  assert.equal(acessoVigente(dentro), true);
  assert.equal(podeExecutar(dentro, "empresas.ver", "e1"), true);
  assert.equal(podeAcessarEmpresa(dentro, "e1"), true);

  const vencido = fiscal({ validoAte: "2020-01-01T23:59:59-03:00" });
  assert.equal(acessoVigente(vencido), false);
  assert.equal(podeExecutar(vencido, "empresas.ver", "e1"), false);
  assert.equal(podeAcessarEmpresa(vencido, "e1"), false);
  assert.deepEqual(Object.keys(filtrarEstadoPorUsuario(base(), vencido).empresas), []);

  const encerrado = encerrarAcessoFiscal(dentro);
  assert.equal(acessoVigente(encerrado), false);
  assert.equal(podeExecutar(encerrado, "empresas.ver", "e1"), false);

  const renovado = renovarAcessoFiscal(encerrado, 15);
  assert.equal(acessoVigente(renovado), true);
  assert.equal(renovado.acessoEncerradoEm, undefined);
});

test("Validade: só 3, 7, 15 ou 30 dias, texto do convite e faixa", () => {
  const agora = new Date("2026-11-10T15:00:00-03:00");
  const ate = calcularValidade(7, agora);
  assert.equal(ate, "2026-11-17T23:59:59-03:00");
  assert.equal(dataDaValidade(ate), "17/11/2026");
  assert.equal(textoDoConvite(ate), "Expira em 17/11/2026 às 23:59. Depois disso a pessoa não entra mais; você pode renovar.");
  assert.equal(diasRestantes(ate, agora), 8);
  assert.equal(faixaDeLeitura(ate, agora), "Acesso de leitura até 17/11. Restam 8 dias.");
  assert.equal(faixaDeLeitura(calcularValidade(3, agora), new Date("2026-11-13T10:00:00-03:00")), "Acesso de leitura até 13/11. Resta 1 dia.");
  assert.equal(acessoVigente({ validoAte: ate }, new Date("2026-11-17T23:59:00-03:00")), true);
  assert.equal(acessoVigente({ validoAte: ate }, new Date("2026-11-18T00:00:01-03:00")), false);
  assert.equal(acessoVigente({}), true);
  for (const invalido of [undefined, 0, 1, 10, 60]) {
    assert.throws(() => criarUsuarioPreparacao({ nome: "Fiscal Um", email: "f@x.com", perfil: "Fiscal", empresaIds: ["e1"], validadeDias: invalido }, []), /3, 7, 15 ou 30/);
  }
  const criado = criarUsuarioPreparacao({ nome: "Fiscal Um", email: "f@x.com", perfil: "Fiscal", empresaIds: ["e1"], validadeDias: 30 }, [], agora.toISOString());
  assert.equal(criado.validoAte, "2026-12-10T23:59:59-03:00");
  assert.throws(() => renovarAcessoFiscal(criado, 5), /3, 7, 15 ou 30/);
});

test("Histórico: expiração sem registro aparece uma vez só", () => {
  const pessoa = fiscal({ validoAte: "2026-11-01T23:59:59-03:00" });
  const agora = new Date("2026-11-05T10:00:00-03:00");
  assert.equal(expiracoesSemRegistro([pessoa], [], agora).length, 1);
  assert.equal(expiracoesSemRegistro([pessoa], [{ entidadeId: "u2", acao: "Acesso expirou em 01/11/2026" }], agora).length, 0);
  assert.equal(expiracoesSemRegistro([encerrarAcessoFiscal(pessoa)], [], agora).length, 0);
});

test("O servidor aplica a validade em toda requisição (acesso, estado e evidências)", () => {
  assert.ok(ler("../lib/serverAccess.ts").includes("!acessoVigente(encontrado)"));
  assert.ok(ler("../app/api/state/route.ts").includes("!acessoVigente(usuario)"));
  assert.ok(ler("../app/api/evidencias/file/route.ts").includes('perfil === "Fiscal"'));
});

test("Perfis novos aparecem em Acessos com etiqueta novo, Pode e Não pode", () => {
  const tela = ler("../components/pc/PcAcessos.tsx");
  assert.ok(tela.includes("perfil-novo") && tela.includes(">Pode<") && tela.includes("Não pode"));
  assert.ok(tela.includes("Encerrar agora") && tela.includes("Renovar"));
  assert.ok(ler("../components/FiscalInicio.tsx").includes("em breve"));
});
