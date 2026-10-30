import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { iniciarNovaVersao } from "../lib/popsNorma.ts";
import {
  capacitacoesVigentes,
  leituraDaVersao,
  pendenciasDaEmpresa,
  podeGerenciarPessoas,
  referenciasDeCapacitacao,
  situacaoDaValidade,
  sugerirVencimentoDaCapacitacao,
  validarCapacitacao,
  validarColaborador,
} from "../lib/registrosEmpresa.ts";
import { filtrarEstadoPorUsuario, mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";

const usuario = (perfil, extra = {}) => ({ id: `u-${perfil}`, perfil, status: "Ativo", empresaIds: ["e1"], nome: perfil, email: `${perfil.replace(/\W/g, "")}@x.com`, ...extra });
const PERFIS = ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente", "Executor de campo", "Fiscal"];
const pessoa = (id, ativo = true, empresaId = "e1") => ({ id, empresaId, nome: `Pessoa ${id}`, cargo: "Auxiliar", ativo, criadoEm: "" });
const leitura = (id, colaboradorId, popVersao, data = "2026-10-01") => ({ id, empresaId: "e1", popId: "p1", popVersao, colaboradorId, data, criadoEm: "" });

test("Pessoas: só Administrador, RT, Gestor e Gerente; o cadastro pede só nome e cargo", () => {
  for (const perfil of PERFIS) {
    assert.equal(podeGerenciarPessoas(usuario(perfil)), ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente"].includes(perfil), perfil);
  }
  assert.deepEqual(Object.keys(validarColaborador({ nome: " ", cargo: "" })).sort(), ["cargo", "nome"]);
  assert.deepEqual(validarColaborador({ nome: "Ana", cargo: "Cozinheira" }), {});
});

test("Treinamento: só ativos entram e nova versão do POP zera a leitura", () => {
  const pessoas = [pessoa("a"), pessoa("b"), pessoa("c", false)];
  const leituras = [leitura("l1", "a", "1.0"), leitura("l2", "c", "1.0")];
  let r = leituraDaVersao("p1", "1.0", pessoas, leituras);
  assert.deepEqual([r.lidos, r.total], [1, 2], "inativo não conta");
  assert.deepEqual(r.linhas.map((l) => [l.colaborador.id, l.lido]), [["a", true], ["b", false]]);
  const popAprovado = { id: "p1", versao: "1.0", status: "Aprovado", titulo: "POP", codigo: "POP-01" };
  const nova = iniciarNovaVersao(popAprovado);
  assert.equal(nova.versao, "1.1");
  r = leituraDaVersao("p1", nova.versao, pessoas, leituras);
  assert.deepEqual([r.lidos, r.total], [0, 2], "quem leu a anterior aparece pendente na nova");
  assert.deepEqual(r.linhas.map((l) => l.lido), [false, false]);
  assert.equal(leituraDaVersao("p1", "1.0", pessoas, leituras).lidos, 1, "a leitura antiga continua guardada");
  assert.equal(leituraDaVersao("outro", "1.0", pessoas, leituras).lidos, 0);
});

test("Capacitação: validação, situação com datas de borda e sugestão só quando a norma da empresa traz prazo", () => {
  const ok = { colaboradorId: "a", conteudo: "Boas práticas", cargaHoraria: "8", data: "2026-10-01", venceEm: "2027-10-01" };
  assert.deepEqual(validarCapacitacao(ok), {});
  assert.deepEqual(Object.keys(validarCapacitacao({ colaboradorId: "", conteudo: "", cargaHoraria: "0", data: "", venceEm: "" })).sort(), ["cargaHoraria", "colaboradorId", "conteudo", "data"]);
  assert.equal(validarCapacitacao({ ...ok, cargaHoraria: "8,5" }).cargaHoraria, undefined);
  assert.equal(validarCapacitacao({ ...ok, venceEm: "2026-09-30" }).venceEm, "O vencimento não pode ser antes da data do treinamento.");
  assert.deepEqual(validarCapacitacao({ ...ok, venceEm: "" }), {}, "vencimento é opcional e sempre editável");

  const hoje = "2026-10-20";
  assert.equal(situacaoDaValidade("2026-10-19", hoje), "vencido");
  assert.equal(situacaoDaValidade("2026-10-20", hoje), "vence-em-breve");
  assert.equal(situacaoDaValidade("2026-11-19", hoje), "vence-em-breve");
  assert.equal(situacaoDaValidade("2026-11-20", hoje), "em-dia");

  assert.equal(sugerirVencimentoDaCapacitacao({ normasAplicadas: ["rdc-216-2004"] }, "2026-10-01"), null, "a RDC não traz prazo de capacitação");
  const rs = sugerirVencimentoDaCapacitacao({ normasAplicadas: ["rdc-216-2004", "ses-799-2023-rs"] }, "2026-10-01");
  assert.equal(rs.venceEm, "2027-10-01");
  assert.ok(rs.texto.includes("conferir") && rs.texto.includes("Confira no texto oficial"));
  assert.equal(sugerirVencimentoDaCapacitacao({ normasAplicadas: ["ses-799-2023-rs"] }, ""), null);
});

test("Referências de capacitação: só o que a norma da empresa cita, conferidas no texto (sem a marca conferir)", () => {
  assert.deepEqual(referenciasDeCapacitacao({ normasAplicadas: [] }), []);
  const rs = referenciasDeCapacitacao({ normasAplicadas: ["rdc-216-2004", "ses-799-2023-rs"] });
  assert.ok(rs.length >= 3);
  assert.ok(rs.every((ref) => !ref.conferir));
  assert.ok(rs.some((ref) => ref.orientacao.includes("12 h")));
  assert.ok(rs.some((ref) => ref.orientacao.toLowerCase().includes("admissão")));
});

test("Pendências incluem capacitação vencida ou a vencer, só de pessoa ativa; a renovada tira a antiga", () => {
  const hoje = "2026-10-20";
  const cap = (id, colaboradorId, conteudo, data, venceEm) => ({ id, empresaId: "e1", colaboradorId, conteudo, cargaHoraria: 4, data, venceEm, criadoEm: data });
  const capacitacoes = [
    cap("c1", "a", "Boas práticas", "2025-09-01", "2026-09-01"),
    cap("c2", "a", "Boas práticas", "2026-10-10", "2027-10-10"),
    cap("c3", "b", "Manipulação", "2025-11-01", "2026-11-05"),
    cap("c4", "c", "Manipulação", "2025-01-01", "2026-01-01"),
    cap("c5", "b", "Sem prazo", "2026-01-01", ""),
  ];
  assert.deepEqual(capacitacoesVigentes(capacitacoes).map((c) => c.id).sort(), ["c2", "c3", "c4", "c5"]);
  const comprovantes = [{ id: "z", empresaId: "e1", tipo: "pragas", emissor: "Dedetiz", dataServico: "2026-01-01", validade: "2026-10-01", observacao: "", criadoEm: "" }];
  const lista = pendenciasDaEmpresa("e1", { comprovantes, capacitacoes, colaboradores: [pessoa("a"), pessoa("b"), pessoa("c", false)] }, hoje);
  assert.deepEqual(lista.map((p) => [p.origem, p.id, p.situacao]), [["comprovante", "z", "vencido"], ["capacitacao", "c3", "vence-em-breve"]]);
});

const estado = () => ({
  empresas: { e1: { id: "e1", pops: [] }, e2: { id: "e2", pops: [] } },
  empresaAtualId: "e1",
  visitas: [],
  ncs: [],
  evidencias: [],
  usuarios: [],
  registrosAuditoria: [],
  colaboradores: [pessoa("a"), pessoa("x", true, "e2")],
  capacitacoes: [{ id: "k1", empresaId: "e1", colaboradorId: "a", conteudo: "BPF", cargaHoraria: 4, data: "2026-10-01", venceEm: "", criadoEm: "" }],
  leiturasPop: [leitura("l1", "a", "1.0")],
});

test("Servidor: pessoas, capacitações e leituras só circulam para quem gerencia; Executor e Fiscal não recebem nem gravam", () => {
  for (const perfil of ["Executor de campo", "Fiscal"]) {
    const quem = usuario(perfil, { validoAte: "2099-01-01T00:00:00-03:00" });
    const visto = filtrarEstadoPorUsuario(estado(), quem);
    assert.deepEqual([visto.colaboradores, visto.capacitacoes, visto.leiturasPop], [[], [], []], perfil);
    const recebido = estado();
    recebido.colaboradores = [...recebido.colaboradores, pessoa("novo")];
    const novo = mesclarEstadoPorUsuario(estado(), recebido, quem, "auth");
    assert.deepEqual(novo.colaboradores.map((c) => c.id).sort(), ["a", "x"], perfil);
  }
  const gerente = filtrarEstadoPorUsuario(estado(), usuario("Gerente"));
  assert.deepEqual(gerente.colaboradores.map((c) => c.id), ["a"]);
  assert.equal(gerente.leiturasPop.length, 1);
  const recebido = estado();
  recebido.colaboradores = [pessoa("a"), pessoa("novo"), pessoa("x", true, "e2"), pessoa("alheio", true, "e2")];
  recebido.leiturasPop = [...recebido.leiturasPop, leitura("l2", "novo", "1.0")];
  const novo = mesclarEstadoPorUsuario(estado(), recebido, usuario("Gerente"), "auth-g");
  assert.deepEqual(novo.colaboradores.map((c) => c.id).sort(), ["a", "novo", "x"], "empresa alheia não grava");
  assert.deepEqual(novo.leiturasPop.map((l) => l.id).sort(), ["l1", "l2"]);
});

test("Guarda de dados: cadastro e capacitação não têm campo de CPF, saúde, foto ou nascimento", () => {
  const tipos = readFileSync(new URL("../types/index.ts", import.meta.url), "utf8");
  const trecho = (nome) => {
    const inicio = tipos.indexOf(`export type ${nome} = {`);
    return tipos.slice(inicio, tipos.indexOf("};", inicio)).replace(/\/\*\*[\s\S]*?\*\//g, "");
  };
  for (const nome of ["Colaborador", "Capacitacao", "LeituraPop"]) {
    assert.ok(!/cpf|nascimento|saude|saúde|foto|exame|atestado|laudo/i.test(trecho(nome)), nome);
  }
  const tela = readFileSync(new URL("../components/pc/PcPessoas.tsx", import.meta.url), "utf8");
  assert.ok(tela.includes("AVISO_DADOS_DE_SAUDE_PESSOA") && tela.includes("subtituloDePessoas"));
});
