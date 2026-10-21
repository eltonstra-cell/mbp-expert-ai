import assert from "node:assert/strict";
import test from "node:test";

import { descartarRascunho, iniciarNovaVersao, podeDescartarRascunho, popComoVigente, popVigente } from "../lib/popsNorma.ts";
import { filtrarEstadoPorUsuario, mesclarEstadoPorUsuario, preservarConclusaoDeVisitas } from "../lib/stateAccess.ts";

const agora = "2026-10-21T10:00:00.000Z";
const aprovado = () => ({
  id: "p1", codigo: "POP-01", titulo: "Higienização", versao: "1.0", status: "Aprovado", proximaRevisao: "2027-10-21",
  conteudo: { objetivo: "versão aprovada" }, aprovacao: { nome: "Elton", cargo: "RT", em: agora },
});
const usuario = (perfil, empresaIds) => ({ id: `u-${perfil}`, nome: perfil, email: `${perfil.length}@x.com`, perfil, status: "Ativo", empresaIds, criadoEm: agora, atualizadoEm: agora });

test("descartar rascunho: volta à versão aprovada, que continua vigente durante o rascunho", () => {
  const rascunho = { ...iniciarNovaVersao(aprovado()), conteudo: { objetivo: "texto do rascunho" } };
  assert.equal(rascunho.status, "Rascunho");
  assert.equal(popVigente(rascunho).conteudo.objetivo, "versão aprovada");
  assert.equal(podeDescartarRascunho(rascunho), true);
  const volta = descartarRascunho(rascunho);
  assert.equal(volta.status, "Aprovado");
  assert.equal(volta.versao, "1.0");
  assert.equal(volta.conteudo.objetivo, "versão aprovada");
  assert.equal(volta.aprovacao.nome, "Elton");
  assert.equal(volta.proximaRevisao, "2027-10-21");
  // pode editar de novo e gerar nova versão
  assert.equal(iniciarNovaVersao(volta).status, "Rascunho");
});

test("descartar rascunho: primeiro rascunho (sem versão aprovada) não tem descarte", () => {
  const primeiro = { id: "p2", codigo: "POP-02", titulo: "x", versao: "1.0", status: "Rascunho", proximaRevisao: "" };
  assert.equal(podeDescartarRascunho(primeiro), false);
  assert.throws(() => descartarRascunho(primeiro));
  assert.equal(popComoVigente(primeiro), null);
  assert.equal(podeDescartarRascunho(aprovado()), false);
});

function estadoComRascunho() {
  const rascunho = { ...iniciarNovaVersao(aprovado()), conteudo: { objetivo: "texto do rascunho" } };
  const empresa = (id) => ({ id, nomeFantasia: id, pops: id === "e1" ? [rascunho] : [] });
  return {
    empresas: { e1: empresa("e1"), e2: empresa("e2") },
    empresaAtualId: "e1",
    usuarios: [], visitas: [], ncs: [], evidencias: [], registrosAuditoria: [],
  };
}

test("Executor e Fiscal continuam vendo o POP vigente enquanto há rascunho, sem o texto do rascunho", () => {
  for (const perfil of ["Executor de campo", "Fiscal"]) {
    const visto = filtrarEstadoPorUsuario(estadoComRascunho(), usuario(perfil, ["e1"]));
    const pops = visto.empresas.e1.pops;
    assert.equal(pops.length, 1, perfil);
    assert.equal(pops[0].status, "Aprovado");
    assert.equal(pops[0].conteudo.objetivo, "versão aprovada");
    assert.ok(!JSON.stringify(pops).includes("texto do rascunho"), perfil);
  }
});

const visita = (id, empresaId, extra = {}) => ({ id, empresaId, data: "2026-10-01", status: "Em andamento", responsavel: "x", observacoes: "", progresso: 0, criadoEm: agora, ...extra });

test("arquivar/concluir visita: sem visitas.concluir o servidor mantém o gravado", () => {
  const atuais = [visita("v1", "e1")];
  const recebidas = [visita("v1", "e1", { arquivada: true, arquivadaEm: agora, status: "Concluída" })];
  const sem = preservarConclusaoDeVisitas(recebidas, atuais, false);
  assert.equal(sem[0].arquivada, undefined);
  assert.equal(sem[0].status, "Em andamento");
  assert.equal(preservarConclusaoDeVisitas(recebidas, atuais, true)[0].arquivada, true);
});

test("arquivar visita de outra empresa: o servidor ignora (RT da empresa 1 não mexe na visita da empresa 2)", () => {
  const rt = usuario("Consultor/RT", ["e1"]);
  const atual = { ...estadoComRascunho(), usuarios: [rt], visitas: [visita("v1", "e1"), visita("v2", "e2")] };
  const recebido = { ...atual, visitas: [visita("v1", "e1", { arquivada: true, arquivadaEm: agora }), visita("v2", "e2", { arquivada: true, arquivadaEm: agora })] };
  const resultado = mesclarEstadoPorUsuario(atual, recebido, rt, "auth", agora);
  assert.equal(resultado.visitas.find((item) => item.id === "v1").arquivada, true, "da própria empresa vale");
  assert.equal(resultado.visitas.find((item) => item.id === "v2").arquivada, undefined, "de outra empresa não");
  // mesmo reaproveitando o id da visita alheia com a própria empresa
  const roubo = { ...atual, visitas: [visita("v2", "e1", { arquivada: true })] };
  const depois = mesclarEstadoPorUsuario(atual, roubo, rt, "auth", agora);
  assert.equal(depois.visitas.find((item) => item.id === "v2").empresaId, "e2");
  assert.equal(depois.visitas.find((item) => item.id === "v2").arquivada, undefined);
});

test("Gestor e Gerente não arquivam visita pelo servidor (não têm visitas.executar nem concluir)", () => {
  for (const perfil of ["Cliente Gestor", "Gerente"]) {
    const pessoa = usuario(perfil, ["e1"]);
    const atual = { ...estadoComRascunho(), usuarios: [pessoa], visitas: [visita("v1", "e1")] };
    const recebido = { ...atual, visitas: [visita("v1", "e1", { arquivada: true })] };
    assert.equal(mesclarEstadoPorUsuario(atual, recebido, pessoa, "auth", agora).visitas[0].arquivada, undefined, perfil);
  }
});
