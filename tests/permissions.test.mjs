import assert from "node:assert/strict";
import test from "node:test";

import {
  criarRegistroAuditoria,
  podeAcessarEmpresa,
  podeExecutar,
  possuiPermissao,
} from "../lib/permissions.ts";

function usuario(perfil, empresaIds = ["empresa-1"], status = "Ativo") {
  return {
    id: `usuario-${perfil}`,
    nome: "Pessoa de teste",
    email: "teste@example.com",
    perfil,
    status,
    empresaIds,
    criadoEm: "2026-09-01T12:00:00.000Z",
    atualizadoEm: "2026-09-01T12:00:00.000Z",
  };
}

test("administrador gerencia usuários e acessa qualquer empresa", () => {
  const admin = usuario("Administrador", []);
  assert.equal(possuiPermissao(admin, "usuarios.gerenciar"), true);
  assert.equal(podeAcessarEmpresa(admin, "empresa-fora-da-lista"), true);
});

test("consultor executa visita apenas dentro do seu escopo", () => {
  const consultor = usuario("Consultor/RT", ["empresa-1"]);
  assert.equal(podeExecutar(consultor, "visitas.executar", "empresa-1"), true);
  assert.equal(podeExecutar(consultor, "visitas.executar", "empresa-2"), false);
  assert.equal(possuiPermissao(consultor, "usuarios.gerenciar"), false);
});

test("cliente gestor não usa IA nem edita empresa", () => {
  const cliente = usuario("Cliente Gestor", ["empresa-1"]);
  assert.equal(podeExecutar(cliente, "ncs.acompanhar", "empresa-1"), true);
  assert.equal(podeExecutar(cliente, "ia.analisar", "empresa-1"), false);
  assert.equal(podeExecutar(cliente, "empresas.editar", "empresa-1"), false);
});

test("usuário suspenso perde imediatamente todas as permissões", () => {
  const suspenso = usuario("Administrador", [], "Suspenso");
  assert.equal(possuiPermissao(suspenso, "usuarios.gerenciar"), false);
  assert.equal(podeAcessarEmpresa(suspenso, "empresa-1"), false);
});

test("registro de auditoria normaliza os detalhes", () => {
  const registro = criarRegistroAuditoria(
    {
      usuarioId: "usuario-1",
      usuarioNome: "Elton",
      acao: "usuario.preparado",
      entidade: "Usuário",
      detalhes: "  Usuário preparado.  ",
    },
    "2026-09-01T13:30:00.000Z",
    "auditoria-1"
  );
  assert.equal(registro.id, "auditoria-1");
  assert.equal(registro.detalhes, "Usuário preparado.");
});
