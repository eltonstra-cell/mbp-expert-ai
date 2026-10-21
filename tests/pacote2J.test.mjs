import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { conferenciaDoRelatorio, faltasDaAssinatura } from "../lib/reportCheck.ts";
import { motivoDoBotaoDesabilitado } from "../lib/relatorioEmitido.ts";
import { camposDoPerfilProprio, comPerfilProprio } from "../lib/userManagement.ts";
import { mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");
const agora = "2026-10-21T10:00:00.000Z";
const usuario = (id, perfil, extra = {}) => ({ id, nome: `Nome ${id}`, email: `${id}@example.com`, perfil, status: "Ativo", empresaIds: ["e1"], authId: `auth-${id}`, criadoEm: agora, atualizadoEm: agora, ...extra });

function estado(usuarios) {
  return { empresas: { e1: { id: "e1", nomeFantasia: "E1", pops: [] } }, empresaAtualId: "e1", usuarios, visitas: [], ncs: [], evidencias: [], registrosAuditoria: [] };
}

test("RT altera o PRÓPRIO CRN, cargo e telefone sem passar por Acessos", () => {
  const rt = usuario("rt", "Consultor/RT");
  const atual = estado([rt, usuario("outro", "Cliente Gestor")]);
  const recebido = estado([{ ...rt, crn: " CRN-2   12345 ", cargo: ", Nutricionista RT", telefone: "(51) 99999-0000 abc" }]);
  const resultado = mesclarEstadoPorUsuario(atual, recebido, rt, "auth-rt", agora);
  const salvo = resultado.usuarios.find((item) => item.id === "rt");
  assert.equal(salvo.crn, "CRN-2 12345");
  assert.equal(salvo.cargo, "Nutricionista RT");
  assert.equal(salvo.telefone, "(51) 99999-0000");
  assert.equal(salvo.perfil, "Consultor/RT");
});

test("RT não altera perfil, e-mail, status, nome nem dados de outra pessoa", () => {
  const rt = usuario("rt", "Consultor/RT", { crn: "CRN-2 1" });
  const outro = usuario("outro", "Cliente Gestor", { crn: "original" });
  const atual = estado([rt, outro]);
  const recebido = estado([
    { ...rt, perfil: "Administrador", email: "invasor@example.com", status: "Suspenso", nome: "Outro Nome", empresaIds: ["e1", "e2"], crn: "CRN-2 999" },
    { ...outro, crn: "CRN-INVASOR", cargo: "Dono", perfil: "Administrador", status: "Suspenso" },
  ]);
  const resultado = mesclarEstadoPorUsuario(atual, recebido, rt, "auth-rt", agora);
  const meu = resultado.usuarios.find((item) => item.id === "rt");
  assert.equal(meu.perfil, "Consultor/RT");
  assert.equal(meu.email, "rt@example.com");
  assert.equal(meu.status, "Ativo");
  assert.equal(meu.nome, "Nome rt");
  assert.deepEqual(meu.empresaIds, ["e1"]);
  assert.equal(meu.crn, "CRN-2 999", "só o CRN próprio muda");
  const dele = resultado.usuarios.find((item) => item.id === "outro");
  assert.equal(dele.crn, "original", "dados de outra pessoa são recusados");
  assert.equal(dele.cargo, undefined);
  assert.equal(dele.perfil, "Cliente Gestor");
  assert.equal(dele.status, "Ativo");
});

test("tentar mudar o próprio registro enviando o id de outro usuário: recusado", () => {
  const rt = usuario("rt", "Consultor/RT");
  const outro = usuario("outro", "Cliente Gestor", { crn: "original" });
  const atual = estado([rt, outro]);
  // o navegador troca o id do próprio registro pelo da outra pessoa
  const recebido = estado([{ ...rt, id: "outro", crn: "CRN-INVASOR", cargo: "Dono" }]);
  const resultado = mesclarEstadoPorUsuario(atual, recebido, rt, "auth-rt", agora);
  assert.equal(resultado.usuarios.find((item) => item.id === "outro").crn, "original");
  assert.equal(resultado.usuarios.find((item) => item.id === "rt").crn, undefined);
});

test("outros perfis não editam esses campos pelo estado: só o RT (e o Administrador, que já gerencia Acessos)", () => {
  for (const perfil of ["Cliente Gestor", "Gerente", "Executor de campo", "Fiscal"]) {
    const pessoa = usuario("p", perfil);
    const recebido = estado([{ ...pessoa, crn: "CRN-2 1", cargo: "X", telefone: "123" }]);
    const resultado = mesclarEstadoPorUsuario(estado([pessoa]), recebido, pessoa, "auth-p", agora);
    assert.equal(resultado.usuarios[0].crn, undefined, perfil);
    assert.equal(resultado.usuarios[0].telefone, undefined, perfil);
  }
});

test("perfil próprio: limpeza dos três campos e remoção quando vazios", () => {
  assert.deepEqual(camposDoPerfilProprio({ crn: "  ", cargo: ",", telefone: "" }), { crn: undefined, cargo: undefined, telefone: undefined });
  const base = usuario("rt", "Consultor/RT", { crn: "velho", cargo: "velho", telefone: "1" });
  const novo = comPerfilProprio(base, { crn: "", cargo: "Nutricionista RT", telefone: "" });
  assert.equal(novo.crn, undefined);
  assert.equal(novo.cargo, "Nutricionista RT");
  assert.equal(novo.telefone, undefined);
  assert.equal(novo.perfil, "Consultor/RT");
  assert.ok(ler("../components/pc/MeuPerfilModal.tsx").includes("camposDoPerfilProprio"));
});

const dadosBase = { respondidos: 1, totalChecklist: 1, ncsAbertas: 0, ncsSemResponsavelOuPrazo: 0, evidencias: 1, popsPendentes: 0, popsSugeridos: 0, cadastroPreenchidos: 1, cadastroTotal: 1 };

test("conferência: linha 'Responsável pela assinatura' com pendência igual às outras", () => {
  assert.equal(conferenciaDoRelatorio(dadosBase).some((linha) => linha.chave === "assinatura"), false, "sem dados da assinatura a linha não aparece");
  const semCrn = conferenciaDoRelatorio({ ...dadosBase, assinatura: { nome: "Ana", cargo: "Nutricionista RT", crn: "", podeAbrirCadastro: true } }).find((linha) => linha.chave === "assinatura");
  assert.equal(semCrn.ok, false);
  assert.equal(semCrn.resumo, "Falta CRN");
  assert.equal(semCrn.acao, "Abrir cadastro");
  const comum = conferenciaDoRelatorio({ ...dadosBase, assinatura: { nome: "Ana", cargo: "Nutricionista RT", crn: "", podeAbrirCadastro: false } }).find((linha) => linha.chave === "assinatura");
  assert.equal(comum.acao, null);
  assert.equal(comum.semAcao, "Peça ao Administrador");
  const completa = conferenciaDoRelatorio({ ...dadosBase, assinatura: { nome: "Ana", cargo: "Nutricionista RT", crn: "CRN-2 1", podeAbrirCadastro: true } }).find((linha) => linha.chave === "assinatura");
  assert.equal(completa.ok, true);
  assert.equal(completa.resumo, "Ana · Nutricionista RT · CRN-2 1");
  assert.equal(faltasDaAssinatura({ nome: "Ana" }), "cargo e CRN");
  assert.equal(faltasDaAssinatura({}), "nome, cargo e CRN");
  assert.equal(faltasDaAssinatura({ nome: "A", cargo: "B", crn: "C" }), "");
  assert.ok(ler("../components/pc/PcRelatorio.tsx").includes("linha.semAcao"));
});

test("modal de emissão: linha pequena com o motivo do botão desabilitado", () => {
  assert.equal(motivoDoBotaoDesabilitado({ crn: "", confirmouSemCrn: false, precisaMotivo: true, motivoValido: false }), "Marque a caixa ou preencha o CRN, e informe o motivo.");
  assert.equal(motivoDoBotaoDesabilitado({ crn: "", confirmouSemCrn: false, precisaMotivo: false, motivoValido: true }), "Marque a caixa ou preencha o CRN.");
  assert.equal(motivoDoBotaoDesabilitado({ crn: "", confirmouSemCrn: true, precisaMotivo: true, motivoValido: false }), "");
  assert.equal(motivoDoBotaoDesabilitado({ crn: "CRN-2 1", confirmouSemCrn: false, precisaMotivo: true, motivoValido: false }), "");
  const modal = ler("../components/pc/PcEmitirRelatorio.tsx");
  assert.ok(modal.includes('id="emitir-motivo-bloqueio"') && modal.includes("motivoDoBotaoDesabilitado("));
  const lista = ler("../components/pc/PcRelatoriosEmitidos.tsx");
  assert.ok(lista.includes('{aberta ? "▾" : "▸"}'));
});

import { textoDaPendencia, textoDaPendenciaCurta } from "../lib/companyReadiness.ts";

test("Empresas: 'Falta: …' em uma linha, primeira pendência + N, lista inteira na dica", () => {
  assert.equal(textoDaPendenciaCurta([]), "");
  assert.equal(textoDaPendenciaCurta(["horário de funcionamento"]), "Falta: horário de funcionamento");
  assert.equal(textoDaPendenciaCurta(["horário de funcionamento", "setores", "POPs"]), "Falta: horário de funcionamento +2");
  assert.equal(textoDaPendencia(["horário de funcionamento", "setores", "POPs"]), "Falta: horário de funcionamento, setores e POPs");
  const tela = ler("../components/pc/PcEmpresas.tsx");
  assert.ok(tela.includes("title={textoDaPendencia(empresa.faltas)}") && tela.includes("textoDaPendenciaCurta(empresa.faltas)"));
  assert.match(ler("../app/globals.css"), /\.pc-cadastro-status \.pc-pendencia\{display:block;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap\}/);
  assert.ok(ler("../app/page.tsx").includes('secaoEmpresa === "dados" && pendenciasDaEmpresa(empresaGerenciada).length > 0'));
});
