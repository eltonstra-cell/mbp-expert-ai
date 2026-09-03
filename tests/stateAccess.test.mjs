import test from "node:test";
import assert from "node:assert/strict";
import {
  filtrarEstadoPorUsuario,
  localizarUsuarioAutenticado,
  mesclarEstadoPorUsuario,
} from "../lib/stateAccess.ts";

const agora = "2026-09-03T10:00:00.000Z";

function usuario(perfil, empresaIds, extra = {}) {
  return {
    id: `usuario-${perfil}`,
    nome: perfil,
    email: `${perfil.replace(/\W/g, "")}@example.com`,
    perfil,
    status: "Ativo",
    empresaIds,
    criadoEm: agora,
    atualizadoEm: agora,
    ...extra,
  };
}

function estado() {
  const admin = usuario("Administrador", [], { email: "admin@example.com", authId: "auth-admin" });
  const consultor = usuario("Consultor/RT", ["empresa-1"], { email: "consultor@example.com" });
  const cliente = usuario("Cliente Gestor", ["empresa-1"], { email: "cliente@example.com" });
  return {
    empresas: {
      "empresa-1": { id: "empresa-1", nomeFantasia: "Permitida" },
      "empresa-2": { id: "empresa-2", nomeFantasia: "Restrita" },
    },
    empresaAtualId: "empresa-2",
    visitas: [
      { id: "visita-1", empresaId: "empresa-1", status: "Em andamento" },
      { id: "visita-2", empresaId: "empresa-2", status: "Concluída" },
    ],
    ncs: [
      { id: "nc-1", empresaId: "empresa-1", visitaId: "visita-1", status: "Aberta", titulo: "Original" },
      { id: "nc-2", empresaId: "empresa-2", visitaId: "visita-2", status: "Aberta", titulo: "Restrita" },
    ],
    evidencias: [
      { id: "ev-1", empresaId: "empresa-1", visitaId: "visita-1" },
      { id: "ev-2", empresaId: "empresa-2", visitaId: "visita-2" },
    ],
    usuarios: [admin, consultor, cliente],
    registrosAuditoria: [],
    configuracaoAcesso: {
      versao: 1,
      modo: "Ativo",
      autenticacao: "Configurada",
      atualizadoEm: agora,
    },
  };
}

test("localiza conta preparada pelo e-mail antes do primeiro vínculo", () => {
  const data = estado();
  const encontrado = localizarUsuarioAutenticado(
    data,
    "novo-auth-id",
    " CONSULTOR@EXAMPLE.COM "
  );
  assert.equal(encontrado?.perfil, "Consultor/RT");
});

test("consultor recebe somente dados das empresas autorizadas", () => {
  const data = estado();
  const consultor = data.usuarios[1];
  const filtrado = filtrarEstadoPorUsuario(data, consultor);
  assert.deepEqual(Object.keys(filtrado.empresas), ["empresa-1"]);
  assert.deepEqual(filtrado.visitas.map((item) => item.id), ["visita-1"]);
  assert.deepEqual(filtrado.evidencias.map((item) => item.id), ["ev-1"]);
  assert.deepEqual(filtrado.usuarios.map((item) => item.id), [consultor.id]);
  assert.equal(filtrado.empresaAtualId, "empresa-1");
});

test("salvamento do consultor preserva dados fora do seu escopo", () => {
  const atual = estado();
  const consultor = atual.usuarios[1];
  const recebido = filtrarEstadoPorUsuario(atual, consultor);
  recebido.visitas[0] = { ...recebido.visitas[0], responsavel: "Atualizado" };
  const mesclado = mesclarEstadoPorUsuario(
    atual,
    recebido,
    consultor,
    "auth-consultor",
    agora
  );
  assert.equal(mesclado.visitas.find((item) => item.id === "visita-1")?.responsavel, "Atualizado");
  assert.ok(mesclado.visitas.some((item) => item.id === "visita-2"));
  assert.equal(mesclado.usuarios.length, 3);
  assert.equal(mesclado.usuarios.find((item) => item.id === consultor.id)?.authId, "auth-consultor");
});

test("cliente altera acompanhamento sem reescrever o conteúdo técnico da NC", () => {
  const atual = estado();
  const cliente = atual.usuarios[2];
  const recebido = filtrarEstadoPorUsuario(atual, cliente);
  recebido.ncs[0] = {
    ...recebido.ncs[0],
    titulo: "Tentativa de alteração",
    acompanhamento: "Correção informada",
    status: "Em tratamento",
  };
  const mesclado = mesclarEstadoPorUsuario(atual, recebido, cliente, "auth-cliente", agora);
  const nc = mesclado.ncs.find((item) => item.id === "nc-1");
  assert.equal(nc?.titulo, "Original");
  assert.equal(nc?.acompanhamento, "Correção informada");
  assert.equal(nc?.status, "Em tratamento");
});
