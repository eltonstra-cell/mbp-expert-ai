import test from "node:test";
import assert from "node:assert/strict";
import { preencherIdentificacao } from "../lib/manualIdentificacao.ts";

const juntar = (cargo, crn) => [cargo, crn].filter(Boolean).join(" ");

test("Rodada 7 · D.2: cadastro do RT sem nome + usuário Consultor/RT → o nome dele entra como sugestão", () => {
  const r = preencherIdentificacao({}, { rt: { cargo: "Nutricionista", crn: "CRN-3 1234" }, juntar, nomeDoUsuarioRt: "Ana Consultora" });
  assert.equal(r.valores.consultorNome, "Ana Consultora");
  assert.equal(r.valores.elaboradoPor, "Ana Consultora");
  assert.equal(r.valores.revisadoPor, "Ana Consultora");
});

test("Rodada 7 · D.2: sem nomeDoUsuarioRt (perfil que não é Consultor/RT) o nome continua vazio", () => {
  const r = preencherIdentificacao({}, { rt: { cargo: "Nutricionista" }, juntar });
  assert.equal(r.valores.consultorNome, undefined);
  assert.equal(r.valores.elaboradoPor, undefined);
  assert.ok(r.semFonte.includes("consultorNome"));
});

test("Rodada 7 · D.2: o nome do cadastro do RT vale mais que o do usuário e o digitado nunca é trocado", () => {
  assert.equal(preencherIdentificacao({}, { rt: { nome: "Beto RT" }, juntar, nomeDoUsuarioRt: "Ana" }).valores.consultorNome, "Beto RT");
  assert.equal(preencherIdentificacao({ consultorNome: "Digitado" }, { juntar, nomeDoUsuarioRt: "Ana" }).valores.consultorNome, undefined);
});

test("Rodada 7 · D.2: nunca inventa CPF/CNPJ, endereço ou telefone", () => {
  const r = preencherIdentificacao({}, { juntar, nomeDoUsuarioRt: "Ana" });
  for (const campo of ["consultorCpfCnpj", "consultorEndereco", "consultorTelefone"]) assert.equal(r.valores[campo], undefined, campo);
});
