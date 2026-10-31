import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { preencherIdentificacao, dadosParaOCadastroDoRt, rtVinculadoDaEmpresa, fraseDoPreencher } from "../lib/manualIdentificacao.ts";
import { filtrarEstadoPorUsuario, mesclarEstadoPorUsuario } from "../lib/stateAccess.ts";
import { separarItensInvalidos } from "../lib/limitesDoServidor.ts";

const juntar = (cargo, crn) => [cargo, crn].filter(Boolean).join(" ");
const rt = { id: "u-rt", nome: "Élton Teste Consultor", email: "rt@x.com", perfil: "Consultor/RT", status: "Convidado", empresaIds: ["e1"], criadoEm: "2026-01-01", atualizadoEm: "2026-01-01", cargo: "Nutricionista", crn: "CRN-2 1" };
const admin = { id: "u-adm", nome: "Admin", email: "a@x.com", perfil: "Administrador", status: "Ativo", empresaIds: [], criadoEm: "2026-01-01", atualizadoEm: "2026-01-01" };
const quem = (perfil) => ({ id: `u-${perfil}`, nome: perfil, email: `${perfil}@x.com`, perfil, status: "Ativo", empresaIds: ["e1"], criadoEm: "2026-01-01", atualizadoEm: "2026-01-01" });
const empresa = { id: "e1", nome: "Beyond Nutri", pops: [], consultorNome: "Élton Teste Consultor" };
const base = (usuarios) => ({ empresas: { e1: empresa }, empresaAtualId: "e1", visitas: [], ncs: [], evidencias: [], usuarios, registrosAuditoria: [], colaboradores: [], capacitacoes: [], leiturasPop: [], registrosPop: [], comprovantes: [] });

test("A: RT Convidado e vinculado à empresa fornece o nome para o Administrador; sem vínculo, nenhum RT é usado", () => {
  assert.equal(rtVinculadoDaEmpresa([admin, rt], "e1", admin)?.id, "u-rt");
  assert.equal(rtVinculadoDaEmpresa([admin, { ...rt, status: "Suspenso" }], "e1", admin), undefined);
  assert.equal(rtVinculadoDaEmpresa([admin, { ...rt, empresaIds: ["outra"] }], "e1", admin), undefined, "RT de outra empresa não entra");
  assert.equal(rtVinculadoDaEmpresa([admin], "e1", rt)?.id, "u-rt", "o próprio RT logado vale");
});

test("B: Preencher traz nome, elaborado, revisado e data de hoje; CPF, endereço, telefone e registro vêm do cadastro do RT", () => {
  const r = preencherIdentificacao({}, { rt: { nome: rt.nome, telefone: "(51) 99999-0000", cpfCnpj: "529.982.247-25", endereco: "Rua A, 10", registroProfissional: "Nutricionista RT CRN-2 1" }, juntar, hoje: "2026-10-31", responsavel: "Maria", cargoResponsavel: "Gerente" });
  assert.equal(r.valores.consultorNome, rt.nome);
  assert.equal(r.valores.elaboradoPor, rt.nome);
  assert.equal(r.valores.revisadoPor, rt.nome);
  assert.equal(r.valores.dataElaboracaoManual, "2026-10-31");
  assert.equal(r.valores.consultorCpfCnpj, "529.982.247-25");
  assert.equal(r.valores.consultorEndereco, "Rua A, 10");
  assert.equal(r.valores.consultorTelefone, "(51) 99999-0000");
  assert.equal(r.valores.consultorRegistro, "Nutricionista RT CRN-2 1");
  assert.equal(r.valores.aprovadoPor, "Maria, Gerente");
});

test("B: nunca sobrescreve campo preenchido (nem a data)", () => {
  const atuais = { consultorNome: "Digitado", elaboradoPor: "Outro", dataElaboracaoManual: "2026-01-02", consultorCpfCnpj: "111", consultorEndereco: "X" };
  const r = preencherIdentificacao(atuais, { rt: { nome: "RT", cpfCnpj: "529.982.247-25", endereco: "Rua A" }, juntar, hoje: "2026-10-31" });
  for (const campo of Object.keys(atuais)) assert.equal(r.valores[campo], undefined, campo);
  assert.equal(r.valores.revisadoPor, "Digitado", "revisado usa o nome já digitado");
});

test("B: Administrador sem RT vinculado: o nome vem do mesmo lugar do 'aprovado por' e CPF/endereço ficam para digitar", () => {
  const r = preencherIdentificacao({}, { juntar, hoje: "2026-10-31", responsavel: "Maria", cargoResponsavel: "Gerente", semRtVinculado: true });
  assert.equal(r.valores.consultorNome, "Maria");
  assert.equal(r.valores.elaboradoPor, "Maria");
  assert.equal(r.valores.aprovadoPor, "Maria, Gerente");
  assert.equal(r.valores.consultorCpfCnpj, undefined);
  assert.ok(!r.semFonte.includes("consultorCpfCnpj") && !r.semFonte.includes("consultorEndereco") && r.semFonte.includes("consultorRegistro"));
  assert.equal(fraseDoPreencher(r.preenchidos.length, r.semFonte.length).includes("preencha abaixo"), true);
});

test("C: salvar o Manual grava no cadastro do RT só o que é novo e válido, sem apagar nada", () => {
  const manual = { consultorCpfCnpj: "529.982.247-25", consultorEndereco: "Rua A, 10", consultorTelefone: "(51) 99999-0000", consultorRegistro: "Nutricionista RT CRN-2 1" };
  const semCargoNemCrn = { ...rt, cargo: undefined, crn: undefined };
  assert.deepEqual(dadosParaOCadastroDoRt(manual, semCargoNemCrn), { cpfCnpj: "529.982.247-25", endereco: "Rua A, 10", registroProfissional: "Nutricionista RT CRN-2 1", telefone: "(51) 99999-0000" });
  assert.deepEqual(dadosParaOCadastroDoRt(manual, rt), { cpfCnpj: "529.982.247-25", endereco: "Rua A, 10", telefone: "(51) 99999-0000" }, "com cargo/CRN o registro não é gravado");
  assert.equal(dadosParaOCadastroDoRt(manual, { cpfCnpj: "529.982.247-25", endereco: "Rua A, 10", registroProfissional: "Nutricionista RT CRN-2 1", telefone: "(51) 99999-0000" }), null);
  assert.equal(dadosParaOCadastroDoRt({ consultorCpfCnpj: "123", consultorTelefone: "(51) 9" }, rt), null, "CPF e telefone inválidos não vão");
  assert.equal(dadosParaOCadastroDoRt({ consultorEndereco: "" }, rt), null, "campo vazio não apaga");
});

test("C: o RT grava os próprios dados pessoais pelo servidor; os demais perfis não gravam nada no cadastro", () => {
  const atual = base([admin, rt]);
  const recebido = base([{ ...rt, cpfCnpj: "529.982.247-25", endereco: "Rua A, 10", registroProfissional: "RT CRN-2 1", telefone: "(51) 99999-0000" }]);
  const gravado = mesclarEstadoPorUsuario(atual, recebido, rt, "auth-rt", "2026-10-31T00:00:00.000Z").usuarios.find((u) => u.id === "u-rt");
  assert.equal(gravado.cpfCnpj, "529.982.247-25");
  assert.equal(gravado.endereco, "Rua A, 10");
  assert.equal(gravado.registroProfissional, "RT CRN-2 1");
  assert.equal(gravado.perfil, "Consultor/RT");
  for (const perfil of ["Executor de campo", "Fiscal", "Cliente Gestor", "Gerente"]) {
    const eu = quem(perfil);
    const tentativa = base([{ ...eu, cpfCnpj: "529.982.247-25", endereco: "Rua B" }, { ...rt, cpfCnpj: "999", endereco: "Rua B" }]);
    const resultado = mesclarEstadoPorUsuario(base([admin, rt, eu]), tentativa, eu, "auth-x", "2026-10-31T00:00:00.000Z");
    const proprio = resultado.usuarios.find((u) => u.id === eu.id);
    const doRt = resultado.usuarios.find((u) => u.id === "u-rt");
    assert.equal(proprio.cpfCnpj, undefined, perfil);
    assert.equal(proprio.endereco, undefined, perfil);
    assert.equal(doRt.cpfCnpj, undefined, perfil);
  }
});

test("C: Executor, Fiscal e demais perfis não recebem CPF/CNPJ nem endereço do RT (GET); o RT e o Administrador recebem", () => {
  const comDados = { ...rt, cpfCnpj: "529.982.247-25", endereco: "Rua A, 10", registroProfissional: "RT CRN-2 1" };
  const estado = base([admin, comDados, { ...quem("Executor de campo"), cpfCnpj: "111.111.111-11" }]);
  for (const perfil of ["Executor de campo", "Fiscal", "Cliente Gestor", "Gerente"]) {
    const json = JSON.stringify(filtrarEstadoPorUsuario(estado, quem(perfil)));
    assert.equal(json.includes("529.982.247-25") || json.includes("Rua A, 10") || json.includes("RT CRN-2 1"), false, perfil);
  }
  const doExecutor = filtrarEstadoPorUsuario(estado, { ...quem("Executor de campo"), cpfCnpj: "111.111.111-11" });
  assert.equal(JSON.stringify(doExecutor).includes("111.111.111-11"), false);
  assert.equal(filtrarEstadoPorUsuario(estado, comDados).usuarios[0].cpfCnpj, "529.982.247-25");
  assert.equal(filtrarEstadoPorUsuario(estado, admin).usuarios.find((u) => u.id === "u-rt").cpfCnpj, "529.982.247-25");
});

test("C: limite por campo — o servidor recusa sem truncar e devolve rejeitados", () => {
  const atual = base([{ ...rt, endereco: "Rua antiga" }]);
  const recebido = base([{ ...rt, cpfCnpj: "5".repeat(19), endereco: "x".repeat(121), registroProfissional: "y".repeat(81) }]);
  const { estado, rejeitados } = separarItensInvalidos(atual, recebido);
  assert.deepEqual(rejeitados.map((r) => r.campo).sort(), ["cpfCnpj", "endereco", "registroProfissional"]);
  assert.equal(rejeitados.every((r) => r.colecao === "usuarios"), true);
  const u = estado.usuarios[0];
  assert.equal(u.endereco, "Rua antiga", "volta ao gravado");
  assert.equal("cpfCnpj" in u, false);
  const dentro = separarItensInvalidos(atual, base([{ ...rt, cpfCnpj: "5".repeat(18), endereco: "x".repeat(120), registroProfissional: "y".repeat(80) }]));
  assert.equal(dentro.rejeitados.length, 0);
});

test("D: Atividades cresce com o texto e o link do cadastro do RT saiu", () => {
  const tela = readFileSync(new URL("../components/pc/PcManualDocumento.tsx", import.meta.url), "utf8");
  assert.equal(tela.includes("Completar o cadastro do RT"), false);
  assert.equal(tela.includes("onCompletarCadastroDoRt"), false);
  assert.ok(tela.includes("scrollHeight") && tela.includes("Sem RT vinculado: dados salvos só neste Manual"));
});
