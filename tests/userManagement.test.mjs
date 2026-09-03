import assert from "node:assert/strict";
import test from "node:test";

import {
  alterarStatusUsuario,
  atualizarUsuarioPreparacao,
  criarUsuarioPreparacao,
} from "../lib/userManagement.ts";

const agora = "2026-09-01T14:00:00.000Z";

test("prepara consultor com e-mail normalizado e empresas sem duplicação", () => {
  const usuario = criarUsuarioPreparacao(
    {
      nome: "  Maria Consultora  ",
      email: " MARIA@EXAMPLE.COM ",
      perfil: "Consultor/RT",
      empresaIds: ["empresa-1", "empresa-1", "empresa-2"],
    },
    [],
    agora,
    "usuario-1"
  );
  assert.equal(usuario.status, "Convidado");
  assert.equal(usuario.email, "maria@example.com");
  assert.deepEqual(usuario.empresaIds, ["empresa-1", "empresa-2"]);
});

test("impede e-mail duplicado mesmo com diferença de maiúsculas", () => {
  const existente = criarUsuarioPreparacao(
    { nome: "Maria", email: "maria@example.com", perfil: "Administrador", empresaIds: [] },
    [],
    agora,
    "usuario-1"
  );
  assert.throws(
    () => criarUsuarioPreparacao(
      { nome: "Outra Maria", email: "MARIA@example.com", perfil: "Administrador", empresaIds: [] },
      [existente]
    ),
    /Já existe um usuário/
  );
});

test("exige empresa para consultor e cliente gestor", () => {
  assert.throws(
    () => criarUsuarioPreparacao(
      { nome: "Cliente", email: "cliente@example.com", perfil: "Cliente Gestor", empresaIds: [] },
      []
    ),
    /Atribua pelo menos uma empresa/
  );
});

test("edição preserva id, criação e status", () => {
  const original = criarUsuarioPreparacao(
    { nome: "Maria", email: "maria@example.com", perfil: "Consultor/RT", empresaIds: ["empresa-1"] },
    [],
    agora,
    "usuario-1"
  );
  const editado = atualizarUsuarioPreparacao(
    original,
    { nome: "Maria Silva", email: "maria@example.com", perfil: "Cliente Gestor", empresaIds: ["empresa-2"] },
    [original],
    "2026-09-01T14:10:00.000Z"
  );
  assert.equal(editado.id, original.id);
  assert.equal(editado.criadoEm, original.criadoEm);
  assert.equal(editado.status, "Convidado");
});

test("protege o último administrador ativo contra suspensão", () => {
  const admin = {
    ...criarUsuarioPreparacao(
      { nome: "Admin", email: "admin@example.com", perfil: "Administrador", empresaIds: [] },
      [],
      agora,
      "admin-1"
    ),
    status: "Ativo",
  };
  assert.throws(
    () => alterarStatusUsuario(admin, "Suspenso", [admin]),
    /último administrador ativo/
  );
});
