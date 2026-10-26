import assert from "node:assert/strict";
import test from "node:test";
import { chaveDaPessoa, mesmaPessoa, nomeCurtoDaPessoa, pessoasDaLista, pessoasUnicas, rotulosDeChipsDePessoas } from "../lib/pessoas.ts";

test("nomes iguais sem acento, sem maiúsculas e sem espaços sobrando são a mesma pessoa", () => {
  assert.equal(chaveDaPessoa("  Élton   Volmir "), "elton volmir");
  assert.ok(mesmaPessoa("Elton", "Élton"));
  assert.ok(mesmaPessoa("ÉLTON  ", " elton"));
  assert.equal(mesmaPessoa("Elton", "Élton Volmir Strapazon"), false);
  assert.equal(mesmaPessoa("", ""), false);
  assert.deepEqual(pessoasUnicas(["Elton", "Élton", "elton ", "Marivane", ""]), ["Elton", "Marivane"]);
});

test("lista de responsáveis: só pessoas cadastradas e o usuário atual, em ordem alfabética (sem acento nem caixa), no máximo 3, igual em toda correção", () => {
  const cadastradas = ["Teste Responsável", "Élton Volmir Strapazon", "marivane", "Ana Quarta"];
  assert.deepEqual(pessoasDaLista({ cadastradas }), ["Ana Quarta", "Élton Volmir Strapazon", "marivane"]);
  assert.deepEqual(pessoasDaLista({ cadastradas: [...cadastradas].reverse() }), pessoasDaLista({ cadastradas }));
  assert.deepEqual(pessoasDaLista({ cadastradas: ["Marivane"], usuarioAtual: "Élton" }), ["Élton", "Marivane"]);
  assert.deepEqual(pessoasDaLista({ cadastradas: ["Elton"], usuarioAtual: "Élton" }), ["Elton"]);
  assert.deepEqual(pessoasDaLista({ cadastradas, limite: 2 }), ["Ana Quarta", "Élton Volmir Strapazon"]);
});

test("lista de responsáveis: a pessoa escolhida fica marcada na lista e a que está fora das 3 primeiras entra no fim (espaços e caixa não importam)", () => {
  const cadastradas = ["Marcos Souza", "Isabel", "Ana Quarta", "Zeca Silva"];
  assert.deepEqual(pessoasDaLista({ cadastradas, escolhido: "  marcos   souza " }), ["Ana Quarta", "Isabel", "Marcos Souza"], "já está na lista: não repete, mesmo com espaços duplos");
  assert.deepEqual(pessoasDaLista({ cadastradas, escolhido: "zeca  silva" }), ["Ana Quarta", "Isabel", "Marcos Souza", "Zeca Silva"], "cadastrada fora das 3: entra no fim com a grafia do cadastro");
  assert.deepEqual(pessoasDaLista({ cadastradas, escolhido: "Isabel" }), ["Ana Quarta", "Isabel", "Marcos Souza"]);
  assert.deepEqual(pessoasDaLista({ cadastradas: ["Beto"], usuarioAtual: "Ana", escolhido: "Fulano   de Tal" }), ["Ana", "Beto", "Fulano de Tal"], "nome à mão só aparece depois de escolhido, com espaços normalizados");
  assert.deepEqual(pessoasDaLista({ cadastradas, escolhido: "" }), pessoasDaLista({ cadastradas }), "texto vazio não cria linha");
  assert.deepEqual(pessoasDaLista({ cadastradas: [] }), []);
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
