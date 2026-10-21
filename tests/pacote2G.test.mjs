import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { nomeProprio } from "../lib/nomeCargo.ts";
import { responsavelEfetivo } from "../lib/responsavelEstabelecimento.ts";
import { limparTelefone, criarUsuarioPreparacao } from "../lib/userManagement.ts";
import { aprovarPop } from "../lib/popsNorma.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("nomes na tela de acessos: capitalizados só na exibição, o dado salvo fica como está", () => {
  const salvo = "maria teste";
  assert.equal(nomeProprio(salvo), "Maria Teste");
  assert.equal(salvo, "maria teste");
  assert.equal(nomeProprio("JOÃO DA SILVA"), "João da Silva");
  assert.ok(ler("../components/pc/PcAcessos.tsx").includes("titulo={nomeProprio(usuario.nome)}"));
  assert.ok(ler("../components/pc/PcAcessos.tsx").includes("value={formulario.nome}"), "o campo de edição mostra o valor salvo");
});

test("responsável do estabelecimento: com usuário vinculado, nome e cargo vêm do cadastro dele", () => {
  const empresa = { responsavelEstabelecimento: { nome: "texto antigo", cargo: "cargo antigo", usuarioId: "u1" }, pops: [] };
  const usuarios = [{ id: "u1", nome: "Elton", cargo: ", Nutricionista RT" }];
  const efetivo = responsavelEfetivo(empresa, usuarios);
  assert.equal(efetivo.nome, "Elton");
  assert.equal(efetivo.cargo, "Nutricionista RT");
  assert.equal(efetivo.vinculado, true);
  // sem cargo no usuário, vale o de Dados; sem lista de usuários, o comportamento antigo
  assert.equal(responsavelEfetivo(empresa, [{ id: "u1", nome: "Elton" }]).cargo, "cargo antigo");
  assert.equal(responsavelEfetivo(empresa).nome, "texto antigo");
});

test("aprovar POP assina com o cargo do usuário que aprova", () => {
  const pop = { id: "p", codigo: "POP-01", titulo: "x", versao: "1.0", status: "Aguardando aprovação", conteudo: {} };
  const empresa = { responsavelEstabelecimento: { nome: "Elton", cargo: "cargo de Dados", usuarioId: "u1" }, normasAplicadas: [] };
  const aprovado = aprovarPop(pop, { id: "u1", nome: "Elton", cargo: "Nutricionista RT", status: "Ativo" }, empresa, "2026-10-21T10:00:00.000Z", []);
  assert.equal(aprovado.aprovacao.cargo, "Nutricionista RT");
  const semCargo = aprovarPop(pop, { id: "u1", nome: "Elton", status: "Ativo" }, empresa, "2026-10-21T10:00:00.000Z", []);
  assert.equal(semCargo.aprovacao.cargo, "cargo de Dados");
});

test("telefone do RT: opcional, limpo, só para RT e Administrador", () => {
  assert.equal(limparTelefone(" (51) 99999-0000 abc "), "(51) 99999-0000");
  assert.equal(limparTelefone(""), undefined);
  assert.equal(limparTelefone(undefined), undefined);
  assert.equal(limparTelefone("1234567890123456789012345").length, 20);
  const base = { nome: "Ana", email: "ana@example.com", empresaIds: ["e1"], telefone: "(51) 3333-4444" };
  assert.equal(criarUsuarioPreparacao({ ...base, perfil: "Consultor/RT" }, [], "2026-10-21T10:00:00.000Z", "id1").telefone, "(51) 3333-4444");
  assert.equal(criarUsuarioPreparacao({ ...base, perfil: "Gerente" }, [], "2026-10-21T10:00:00.000Z", "id2").telefone, undefined);
  assert.equal(criarUsuarioPreparacao({ ...base, telefone: "", perfil: "Consultor/RT" }, [], "2026-10-21T10:00:00.000Z", "id3").telefone, undefined);
  assert.ok(ler("../components/pc/PcRelatoriosEmitidos.tsx").includes("aberto.assinatura.telefone ?"), "relatório mostra o telefone só quando existe");
});
