import test from "node:test";
import assert from "node:assert/strict";
import { filtrarEstadoPorUsuario } from "../lib/stateAccess.ts";
import { validarLimitesDeTexto } from "../lib/limitesDoServidor.ts";

const aprovacao = { nome: "Maria Aprovadora", cargo: "Nutricionista", usuarioId: "u-maria", em: "2026-10-01T10:00:00.000Z", versao: "1.0", hashDoConteudo: "abc" };
const pop = {
  id: "p1", codigo: "POP-01", titulo: "Higienização", status: "Aprovado", versao: "1.0", conteudo: {}, aprovacao,
  versoes: [{ versao: "1.0", status: "Aprovado", conteudo: {}, aprovacao }],
  conferencia: { conferido: true, por: { nome: "Carlos Conferente", cargo: "RT" }, em: "2026-09-30T10:00:00.000Z" },
  arquivamento: { motivo: "x", porNome: "Joana Arquivadora", porId: "u-joana", em: "2026-10-02T10:00:00.000Z" },
};
const empresa = { id: "e1", nome: "Beyond Nutri", pops: [pop], consultorNome: "Consultor", consultorCpfCnpj: "529.982.247-25", consultorEndereco: "Rua A, 10", consultorTelefone: "(11) 98888-7777" };
const base = { empresas: { e1: empresa }, empresaAtualId: "e1", visitas: [], ncs: [], evidencias: [], usuarios: [], registrosAuditoria: [], colaboradores: [], capacitacoes: [], leiturasPop: [], registrosPop: [], comprovantes: [] };
const quem = (perfil) => ({ id: `u-${perfil}`, nome: perfil, email: `${perfil}@x.com`, perfil, status: "Ativo", empresaIds: ["e1"], permissoes: [], criadoEm: "2026-01-01T00:00:00.000Z" });
const texto = (valor) => JSON.stringify(valor);

test("D1: o Executor de campo não recebe nomes de aprovação, conferência nem arquivamento", () => {
  const recebido = filtrarEstadoPorUsuario(base, quem("Executor de campo"));
  const json = texto(recebido);
  for (const nome of ["Maria Aprovadora", "Carlos Conferente", "Joana Arquivadora", "u-maria", "u-joana"]) assert.equal(json.includes(nome), false, nome);
  const vigente = recebido.empresas.e1.pops[0];
  assert.equal(vigente.aprovacao.nome, "Responsável");
  assert.equal(vigente.aprovacao.em, aprovacao.em);
  assert.equal(vigente.aprovacao.hashDoConteudo, "abc");
});

test("D1: gestão e Fiscal continuam recebendo os nomes", () => {
  for (const perfil of ["Consultor/RT", "Cliente Gestor", "Gerente", "Fiscal"]) {
    const json = texto(filtrarEstadoPorUsuario(base, quem(perfil)));
    assert.equal(json.includes("Maria Aprovadora"), true, perfil);
  }
});

test("D3: CPF/CNPJ, endereço e telefone do consultor só vão para gestão e consultor", () => {
  for (const perfil of ["Executor de campo", "Fiscal"]) {
    const e = filtrarEstadoPorUsuario(base, quem(perfil)).empresas.e1;
    assert.equal(e.consultorCpfCnpj, undefined, perfil);
    assert.equal(e.consultorEndereco, undefined, perfil);
    assert.equal(e.consultorTelefone, undefined, perfil);
    assert.equal(e.consultorNome, "Consultor");
  }
  for (const perfil of ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente"]) {
    const e = filtrarEstadoPorUsuario(base, quem(perfil)).empresas.e1;
    assert.equal(e.consultorCpfCnpj, "529.982.247-25", perfil);
  }
});

test("D2: limites e campos permitidos de pessoas, registros e responsável", () => {
  const ok = (recebido, atual = {}) => validarLimitesDeTexto(atual, recebido).ok;
  const pessoa = (extra = {}) => ({ id: "c1", empresaId: "e1", nome: "Ana", cargo: "Cozinheira", ativo: true, criadoEm: "2026-10-01T00:00:00.000Z", ...extra });
  assert.equal(ok({ colaboradores: [pessoa()] }), true);
  assert.equal(ok({ colaboradores: [pessoa({ nome: "a".repeat(81) })] }), false);
  assert.equal(ok({ colaboradores: [pessoa({ nome: "a".repeat(80) })] }), true);
  assert.equal(ok({ colaboradores: [pessoa({ cargo: "c".repeat(61) })] }), false);
  const extra = validarLimitesDeTexto({}, { colaboradores: [pessoa({ cpf: "123" })] });
  assert.equal(extra.ok, false);
  assert.match(extra.mensagem, /Campo não permitido/);
  // Dado antigo fora do limite, sem mudança, não bloqueia.
  const antigo = pessoa({ cargo: "c".repeat(75) });
  assert.equal(ok({ colaboradores: [antigo] }, { colaboradores: [antigo] }), true);
  const registro = (extra = {}) => ({ id: "r1", empresaId: "e1", popId: "p1", popVersao: "1.0", dataHora: "2026-10-01T10:00", responsavel: "Ana", descricao: "ok", criadoEm: "2026-10-01T10:00:00.000Z", ...extra });
  assert.equal(ok({ registrosPop: [registro()] }), true);
  for (const campo of ["descricao", "verificacao", "acaoCorretiva"]) assert.equal(ok({ registrosPop: [registro({ [campo]: "x".repeat(501) })] }), false, campo);
  assert.equal(ok({ registrosPop: [registro({ laudo: "x" })] }), false);
  const comResponsavel = (nome, cargo) => ({ empresas: { e1: { ...empresa, pops: [{ ...pop, conteudo: { responsavelExecucao: { nome, cargo } } }] } } });
  assert.equal(ok(comResponsavel("Ana", "Cozinheira")), true);
  assert.equal(ok(comResponsavel("a".repeat(81), "Cozinheira")), false);
  assert.equal(ok(comResponsavel("Ana", "c".repeat(61))), false);
});

import { erroDoCpfCnpj, treinamentoDaPessoa } from "../lib/documentosCentral.ts";

test("C3/B3: plural de dígitos e rótulo Inativo", () => {
  assert.match(erroDoCpfCnpj("1234567890"), /^Falta 1 dígito no CPF ou 4 no CNPJ\./);
  assert.match(erroDoCpfCnpj("12345"), /^Faltam 6 dígitos no CPF/);
  assert.match(erroDoCpfCnpj("1234567890123"), /^Falta 1 dígito no CNPJ\./);
  assert.equal(treinamentoDaPessoa({ id: "c", ativo: false }, [], "2026-10-30").texto, "Inativo");
});

test("D2: chaves em outra ordem não contam como mudança; cargo ausente em dado antigo vale", () => {
  const gravada = { id: "c1", empresaId: "e1", nome: "Ana", cargo: "x".repeat(75), ativo: true, criadoEm: "2026-10-01T00:00:00.000Z" };
  const reordenada = { criadoEm: gravada.criadoEm, ativo: true, cargo: gravada.cargo, nome: "Ana", empresaId: "e1", id: "c1" };
  assert.equal(validarLimitesDeTexto({ colaboradores: [gravada] }, { colaboradores: [reordenada] }).ok, true);
  const semCargo = { id: "c2", empresaId: "e1", nome: "Bia", ativo: true, criadoEm: "2026-10-01T00:00:00.000Z" };
  assert.equal(validarLimitesDeTexto({}, { colaboradores: [semCargo] }).ok, true);
  assert.equal(validarLimitesDeTexto({}, { colaboradores: "lixo", registrosPop: [null] }).ok, true);
});
