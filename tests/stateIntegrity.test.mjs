import test from "node:test";
import assert from "node:assert/strict";
import {
  filtrarEstadoPorUsuario,
  mesclarEstadoPorUsuario,
} from "../lib/stateAccess.ts";
import {
  DEFAULT_MAX_STATE_BYTES,
  estadoExcedeLimite,
  resolverLimiteEstado,
  validarFormaDoEstado,
} from "../lib/stateValidation.ts";
import { deveExibirRecursosDeIa } from "../lib/permissions.ts";

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
  return {
    empresas: {
      "empresa-1": { id: "empresa-1", nomeFantasia: "Permitida" },
      "empresa-2": { id: "empresa-2", nomeFantasia: "Restrita" },
    },
    empresaAtualId: "empresa-1",
    visitas: [
      { id: "visita-1", empresaId: "empresa-1", responsavel: "A" },
      { id: "visita-2", empresaId: "empresa-2", responsavel: "B" },
    ],
    ncs: [
      { id: "nc-1", empresaId: "empresa-1", visitaId: "visita-1", titulo: "Minha" },
      { id: "nc-2", empresaId: "empresa-2", visitaId: "visita-2", titulo: "Restrita" },
    ],
    evidencias: [
      { id: "ev-1", empresaId: "empresa-1", visitaId: "visita-1" },
      { id: "ev-2", empresaId: "empresa-2", visitaId: "visita-2" },
    ],
    usuarios: [
      usuario("Administrador", [], { email: "admin@example.com" }),
      usuario("Consultor/RT", ["empresa-1"], { email: "consultor@example.com" }),
      usuario("Cliente Gestor", ["empresa-1"], { email: "cliente@example.com" }),
    ],
    registrosAuditoria: [],
    configuracaoAcesso: { versao: 1, modo: "Ativo", autenticacao: "Configurada", atualizadoEm: agora },
  };
}

test("id reutilizado de outra empresa é ignorado em visitas, NCs e evidências", () => {
  const atual = estado();
  const consultor = atual.usuarios[1];
  const recebido = filtrarEstadoPorUsuario(atual, consultor);
  recebido.visitas.push({ id: "visita-2", empresaId: "empresa-1", responsavel: "Invasor" });
  recebido.ncs.push({ id: "nc-2", empresaId: "empresa-1", visitaId: "visita-1", titulo: "Invasor" });
  recebido.evidencias.push({ id: "ev-2", empresaId: "empresa-1", visitaId: "visita-1" });

  const mesclado = mesclarEstadoPorUsuario(atual, recebido, consultor, "auth", agora);
  assert.deepEqual(mesclado.visitas.find((v) => v.id === "visita-2"), atual.visitas[1]);
  assert.deepEqual(mesclado.ncs.find((n) => n.id === "nc-2"), atual.ncs[1]);
  assert.deepEqual(mesclado.evidencias.find((e) => e.id === "ev-2"), atual.evidencias[1]);
  assert.equal(mesclado.visitas.length, 2);
  assert.equal(mesclado.ncs.length, 2);
  assert.equal(mesclado.evidencias.length, 2);
});

test("a própria empresa continua podendo criar, alterar e remover evidência", () => {
  const atual = estado();
  const consultor = atual.usuarios[1];
  const recebido = filtrarEstadoPorUsuario(atual, consultor);
  recebido.visitas[0] = { ...recebido.visitas[0], responsavel: "Novo" };
  recebido.visitas.push({ id: "visita-3", empresaId: "empresa-1", responsavel: "Criada" });
  recebido.ncs[0] = { ...recebido.ncs[0], titulo: "Editada" };
  recebido.evidencias = [{ id: "ev-3", empresaId: "empresa-1", visitaId: "visita-1" }];

  const mesclado = mesclarEstadoPorUsuario(atual, recebido, consultor, "auth", agora);
  assert.equal(mesclado.visitas.find((v) => v.id === "visita-1").responsavel, "Novo");
  assert.ok(mesclado.visitas.some((v) => v.id === "visita-3"));
  assert.equal(mesclado.ncs.find((n) => n.id === "nc-1").titulo, "Editada");
  assert.deepEqual(mesclado.evidencias.map((e) => e.id).sort(), ["ev-2", "ev-3"]);
});

test("administrador continua gravando o estado recebido", () => {
  const atual = estado();
  const recebido = { ...estado(), visitas: [] };
  assert.deepEqual(mesclarEstadoPorUsuario(atual, recebido, atual.usuarios[0], "a", agora).visitas, []);
});

test("estado legítimo (completo ou filtrado por perfil) passa na validação", () => {
  const atual = estado();
  assert.equal(validarFormaDoEstado(atual).ok, true);
  for (const u of atual.usuarios) {
    assert.equal(validarFormaDoEstado(filtrarEstadoPorUsuario(atual, u)).ok, true, u.perfil);
  }
  assert.equal(
    validarFormaDoEstado({ ...atual, empresaAtualId: null, usuarios: undefined }).ok,
    true
  );
});

test("rejeita chave de topo desconhecida e formas inválidas", () => {
  const base = estado();
  const casos = [
    null,
    [],
    "texto",
    { ...base, empresas: [] },
    { ...base, empresas: { "empresa-1": "x" } },
    { ...base, visitas: {} },
    { ...base, ncs: undefined },
    { ...base, evidencias: "x" },
    { ...base, visitas: [{ empresaId: "empresa-1" }] },
    { ...base, ncs: [{ id: 5 }] },
    { ...base, evidencias: [null] },
    { ...base, usuarios: [{ nome: "sem id" }] },
    { ...base, registrosAuditoria: {} },
    { ...base, empresaAtualId: 3 },
    { ...base, configuracaoAcesso: "x" },
  ];
  casos.forEach((caso, i) => {
    assert.equal(validarFormaDoEstado(caso).ok, false, `caso ${i}`);
  });
});

test("limite de tamanho: padrão de 4 MB e configurável por variável", () => {
  assert.equal(DEFAULT_MAX_STATE_BYTES, 4 * 1024 * 1024);
  assert.equal(resolverLimiteEstado({}), DEFAULT_MAX_STATE_BYTES);
  assert.equal(resolverLimiteEstado({ MBP_MAX_STATE_BYTES: "1000" }), 1000);
  for (const ruim of ["", "abc", "-5", "0", "1.5"]) {
    assert.equal(resolverLimiteEstado({ MBP_MAX_STATE_BYTES: ruim }), DEFAULT_MAX_STATE_BYTES, ruim);
  }
  assert.equal(estadoExcedeLimite(1000, 1000), false);
  assert.equal(estadoExcedeLimite(1001, 1000), true);
});

test("botões de IA: escondidos só para quem foi identificado sem ia.analisar", () => {
  assert.equal(deveExibirRecursosDeIa(usuario("Administrador", [])), true);
  assert.equal(deveExibirRecursosDeIa(usuario("Consultor/RT", ["e"])), true);
  assert.equal(deveExibirRecursosDeIa(usuario("Cliente Gestor", ["e"])), false);
  assert.equal(deveExibirRecursosDeIa(usuario("Consultor/RT", ["e"], { status: "Suspenso" })), false);
  assert.equal(deveExibirRecursosDeIa(null), true);
  assert.equal(deveExibirRecursosDeIa(undefined), true);
});

test("chave de topo desconhecida é descartada sem erro e o restante é mantido", () => {
  const base = estado();
  const resultado = validarFormaDoEstado({ ...base, extra: 1, legado: { a: 1 } });
  assert.equal(resultado.ok, true);
  assert.deepEqual(Object.keys(resultado.estado).sort(), Object.keys(base).sort());
  assert.deepEqual(resultado.estado.visitas, base.visitas);
  assert.equal("extra" in resultado.estado, false);
  assert.equal("legado" in resultado.estado, false);
});

test("chave extra não impede a mesclagem e não chega ao estado gravado", () => {
  const atual = estado();
  const consultor = atual.usuarios[1];
  const recebido = { ...filtrarEstadoPorUsuario(atual, consultor), extra: "x" };
  const validado = validarFormaDoEstado(recebido);
  assert.equal(validado.ok, true);
  const mesclado = mesclarEstadoPorUsuario(atual, validado.estado, consultor, "auth", agora);
  assert.equal("extra" in mesclado, false);
  assert.equal(mesclado.visitas.length, 2);
});

test("colisão de id registra aviso só com coleção, id e empresas", () => {
  const atual = estado();
  const consultor = atual.usuarios[1];
  const recebido = filtrarEstadoPorUsuario(atual, consultor);
  recebido.visitas.push({ id: "visita-2", empresaId: "empresa-1", responsavel: "SEGREDO" });
  const avisos = [];
  const original = console.warn;
  console.warn = (...args) => avisos.push(args.join(" "));
  try {
    mesclarEstadoPorUsuario(atual, recebido, consultor, "auth", agora);
  } finally {
    console.warn = original;
  }
  assert.equal(avisos.length, 1);
  assert.match(avisos[0], /visitas/);
  assert.match(avisos[0], /visita-2/);
  assert.match(avisos[0], /empresa-2/);
  assert.match(avisos[0], /empresa-1/);
  assert.ok(!avisos[0].includes("SEGREDO"));
});
