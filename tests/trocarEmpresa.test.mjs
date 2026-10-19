import test from "node:test";
import assert from "node:assert/strict";
import { opcoesDeEmpresa } from "../lib/trocarEmpresa.ts";

const empresas = [
  { id: "e1", nomeFantasia: "Padaria Pão Quente" },
  { id: "e2", nomeFantasia: "44.150.273 Beyond Nutri" },
  { id: "e3", nomeFantasia: "Churrascaria do Chico" },
  { id: "e4", nomeFantasia: "Antiga", arquivada: true },
];
const usuario = (perfil, empresaIds, status = "Ativo") => ({ id: "u", nome: "Teste", email: "t@teste.com", perfil, status, empresaIds });

test("Administrador vê todas, menos arquivadas, em ordem alfabética e sem número no começo", () => {
  const lista = opcoesDeEmpresa(empresas, usuario("Administrador", []), "e2");
  assert.deepEqual(lista.map((o) => o.nome), ["Beyond Nutri", "Churrascaria do Chico", "Padaria Pão Quente"]);
  assert.equal(lista.find((o) => o.id === "e2").ativa, true);
  assert.equal(lista.filter((o) => o.ativa).length, 1);
});

test("Cliente Gestor vê só as empresas liberadas para ele (isolamento)", () => {
  const lista = opcoesDeEmpresa(empresas, usuario("Cliente Gestor", ["e3"]), "e3");
  assert.deepEqual(lista.map((o) => o.id), ["e3"]);
});

test("usuário suspenso ou ausente não vê nenhuma empresa", () => {
  assert.deepEqual(opcoesDeEmpresa(empresas, usuario("Consultor/RT", ["e1"], "Suspenso"), "e1"), []);
  assert.deepEqual(opcoesDeEmpresa(empresas, null, "e1"), []);
});

test("empresa arquivada só aparece se for a ativa; sem nome usa a razão social", () => {
  const lista = opcoesDeEmpresa([...empresas, { id: "e5", nomeFantasia: "", razaoSocial: "Razão Social LTDA" }], usuario("Administrador", []), "e4");
  assert.ok(lista.some((o) => o.id === "e4" && o.ativa));
  assert.ok(lista.some((o) => o.nome === "Razão Social LTDA"));
});

import { visitaDaEmpresaAtiva } from "../lib/trocarEmpresa.ts";

const visitasDeTeste = [
  { id: "a1", empresaId: "A", status: "Em andamento", criadoEm: "2026-10-01T10:00:00Z" },
  { id: "a2", empresaId: "A", status: "Em andamento", criadoEm: "2026-10-05T10:00:00Z" },
  { id: "b1", empresaId: "B", status: "Em andamento", criadoEm: "2026-10-10T10:00:00Z" },
  { id: "b0", empresaId: "B", status: "Concluída", criadoEm: "2026-10-11T10:00:00Z" },
];

test("Início: mostra a visita em andamento da empresa ativa, a mais recente se houver mais de uma", () => {
  assert.equal(visitaDaEmpresaAtiva(visitasDeTeste, "A", null)?.id, "a2");
  assert.equal(visitaDaEmpresaAtiva(visitasDeTeste, "B", null)?.id, "b1");
  assert.equal(visitaDaEmpresaAtiva(visitasDeTeste, "A", "a1")?.id, "a1");
});

test("Início: a visita aberta de outra empresa não vale; sem visita na empresa ativa, nada", () => {
  assert.equal(visitaDaEmpresaAtiva(visitasDeTeste, "A", "b1")?.id, "a2");
  assert.equal(visitaDaEmpresaAtiva(visitasDeTeste, "C", "b1"), undefined);
  assert.equal(visitaDaEmpresaAtiva(visitasDeTeste.filter((v) => v.status === "Concluída"), "B", null), undefined);
});

test("Início: sem empresa ativa, a mais recente em andamento de todas", () => {
  assert.equal(visitaDaEmpresaAtiva(visitasDeTeste, null, null)?.id, "b1");
});
