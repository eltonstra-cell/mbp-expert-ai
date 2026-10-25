import assert from "node:assert/strict";
import test from "node:test";
import { chaveDaPessoa, mesmaPessoa, pessoasUnicas, sugestoesDeResponsavel } from "../lib/pessoas.ts";

test("nomes iguais sem acento, sem maiúsculas e sem espaços sobrando são a mesma pessoa", () => {
  assert.equal(chaveDaPessoa("  Élton   Volmir "), "elton volmir");
  assert.ok(mesmaPessoa("Elton", "Élton"));
  assert.ok(mesmaPessoa("ÉLTON  ", " elton"));
  assert.equal(mesmaPessoa("Elton", "Élton Volmir Strapazon"), false);
  assert.equal(mesmaPessoa("", ""), false);
  assert.deepEqual(pessoasUnicas(["Elton", "Élton", "elton ", "Marivane", ""]), ["Elton", "Marivane"]);
});

test("chips de responsável: só pessoas cadastradas e o usuário atual, no máximo 3, sem a pessoa já escolhida, o último do ambiente primeiro", () => {
  const cadastradas = ["Élton Volmir Strapazon", "Marivane", "Teste Responsável", "Quarta Pessoa"];
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas }), ["Élton Volmir Strapazon", "Marivane", "Teste Responsável"]);
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas, ultimoDoAmbiente: "marivane" }), ["Marivane", "Élton Volmir Strapazon", "Teste Responsável"]);
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas, escolhido: "MARIVANE" }), ["Élton Volmir Strapazon", "Teste Responsável", "Quarta Pessoa"]);
  // nome digitado à mão em outra correção (não cadastrado) nunca vira sugestão
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas: ["Marivane"], ultimoDoAmbiente: "Fulano digitado" }), ["Marivane"]);
  // o usuário atual entra, sem repetir quem já está na lista
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas: ["Marivane"], usuarioAtual: "Élton" }), ["Marivane", "Élton"]);
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas: ["Elton"], usuarioAtual: "Élton" }), ["Elton"]);
});
