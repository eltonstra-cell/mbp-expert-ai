import assert from "node:assert/strict";
import test from "node:test";
import { chaveDaPessoa, mesmaPessoa, nomeCurtoDaPessoa, pessoasUnicas, rotulosDeChipsDePessoas, sugestoesDeResponsavel } from "../lib/pessoas.ts";

test("nomes iguais sem acento, sem maiúsculas e sem espaços sobrando são a mesma pessoa", () => {
  assert.equal(chaveDaPessoa("  Élton   Volmir "), "elton volmir");
  assert.ok(mesmaPessoa("Elton", "Élton"));
  assert.ok(mesmaPessoa("ÉLTON  ", " elton"));
  assert.equal(mesmaPessoa("Elton", "Élton Volmir Strapazon"), false);
  assert.equal(mesmaPessoa("", ""), false);
  assert.deepEqual(pessoasUnicas(["Elton", "Élton", "elton ", "Marivane", ""]), ["Elton", "Marivane"]);
});

test("chips de responsável: só pessoas cadastradas e o usuário atual, em ordem alfabética (sem acento nem caixa), no máximo 3, sem a pessoa já escolhida", () => {
  const cadastradas = ["Teste Responsável", "Élton Volmir Strapazon", "marivane", "Ana Quarta"];
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas }), ["Ana Quarta", "Élton Volmir Strapazon", "marivane"]);
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas, escolhido: "ANA quarta" }), ["Élton Volmir Strapazon", "marivane", "Teste Responsável"]);
  // a ordem não depende do último responsável do ambiente: é a mesma em toda correção
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas, ultimoDoAmbiente: "Teste Responsável" }), sugestoesDeResponsavel({ cadastradas }));
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas: [...cadastradas].reverse() }), sugestoesDeResponsavel({ cadastradas }));
  // nome digitado à mão em outra correção (não cadastrado) nunca vira sugestão
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas: ["Marivane"] }), ["Marivane"]);
  // o usuário atual entra no lugar alfabético, sem repetir quem já está na lista
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas: ["Marivane"], usuarioAtual: "Élton" }), ["Élton", "Marivane"]);
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas: ["Elton"], usuarioAtual: "Élton" }), ["Elton"]);
  assert.deepEqual(sugestoesDeResponsavel({ cadastradas, limite: 2 }), ["Ana Quarta", "Élton Volmir Strapazon"]);
});

test("nome do chip: primeiro nome + último sobrenome; duas pessoas com o mesmo resultado usam o nome completo", () => {
  assert.equal(nomeCurtoDaPessoa("Elton Volmir Strapazon"), "Elton Strapazon");
  assert.equal(nomeCurtoDaPessoa("  Maria   da Silva  Santos "), "Maria Santos");
  assert.equal(nomeCurtoDaPessoa("Marivane"), "Marivane");
  assert.equal(nomeCurtoDaPessoa("Francisco José Vasconcelos Neto"), "Francisco Vasconcelos");
  assert.equal(nomeCurtoDaPessoa("João Carlos Silva Júnior"), "João Silva");
  assert.equal(nomeCurtoDaPessoa("Pedro Alves Jr."), "Pedro Alves");
  assert.equal(nomeCurtoDaPessoa("Ana Neto"), "Ana Neto");
  assert.equal(nomeCurtoDaPessoa("Ana Lima"), "Ana Lima");
  assert.equal(nomeCurtoDaPessoa(""), "");
  assert.deepEqual(rotulosDeChipsDePessoas(["Elton Volmir Strapazon", "Marivane Souza Lima", "Ana"]), ["Elton Strapazon", "Marivane Lima", "Ana"]);
  assert.deepEqual(rotulosDeChipsDePessoas(["Élton Volmir Strapazon", "Elton Carlos Strapazon", "Ana"]), ["Élton Volmir Strapazon", "Elton Carlos Strapazon", "Ana"]);
  assert.deepEqual(rotulosDeChipsDePessoas([]), []);
});
