import assert from "node:assert/strict";
import test from "node:test";
import { chaveDaPessoa, mesmaPessoa, nomeCurtoDaPessoa, pessoasDaLista, pessoasUnicas, rotulosDasPessoas, nomeNormalizado, valoresDeLoteNormalizados } from "../lib/pessoas.ts";

test("nomes iguais sem acento, sem maiúsculas e sem espaços sobrando são a mesma pessoa", () => {
  assert.equal(chaveDaPessoa("  Élton   Volmir "), "elton volmir");
  assert.ok(mesmaPessoa("Elton", "Élton"));
  assert.ok(mesmaPessoa("ÉLTON  ", " elton"));
  assert.equal(mesmaPessoa("Elton", "Élton Volmir Strapazon"), false);
  assert.equal(mesmaPessoa("", ""), false);
  assert.deepEqual(pessoasUnicas(["Elton", "Élton", "elton ", "Marivane", ""]), ["Elton", "Marivane"]);
});

test("lista de responsáveis: todas as pessoas cadastradas e o usuário atual, em ordem alfabética (sem acento nem caixa), sem limite, igual em toda correção", () => {
  const cadastradas = ["Teste Responsável", "Élton Volmir Strapazon", "marivane", "Ana Quarta"];
  assert.deepEqual(pessoasDaLista({ cadastradas }), ["Ana Quarta", "Élton Volmir Strapazon", "marivane", "Teste Responsável"]);
  assert.deepEqual(pessoasDaLista({ cadastradas: [...cadastradas].reverse() }), pessoasDaLista({ cadastradas }));
  assert.deepEqual(pessoasDaLista({ cadastradas: ["Marivane"], usuarioAtual: "Élton" }), ["Élton", "Marivane"]);
  assert.deepEqual(pessoasDaLista({ cadastradas: ["Elton"], usuarioAtual: "Élton" }), ["Elton"]);
  const muitas = ["Joana", "Ana", "Caio", "Bia", "Edu", "Davi", "Fábio", "Gil"];
  assert.deepEqual(pessoasDaLista({ cadastradas: muitas }), ["Ana", "Bia", "Caio", "Davi", "Edu", "Fábio", "Gil", "Joana"], "mais de 3 pessoas: nenhuma fica de fora");
});

test("lista de responsáveis: a pessoa escolhida entra na ordem alfabética uma só vez (espaços e caixa não importam)", () => {
  const cadastradas = ["Marcos Souza", "Isabel", "Ana Quarta", "Zeca Silva"];
  assert.deepEqual(pessoasDaLista({ cadastradas, escolhido: "  marcos   souza " }), ["Ana Quarta", "Isabel", "Marcos Souza", "Zeca Silva"], "já está na lista: não repete, mesmo com espaços duplos");
  assert.deepEqual(pessoasDaLista({ cadastradas, escolhido: "Isabel" }), pessoasDaLista({ cadastradas }));
  assert.deepEqual(pessoasDaLista({ cadastradas: ["Beto"], usuarioAtual: "Ana", escolhido: "Fulano   de Tal" }), ["Ana", "Beto", "Fulano de Tal"], "nome à mão entra depois de escolhido, com espaços normalizados e em ordem alfabética");
  assert.deepEqual(pessoasDaLista({ cadastradas, escolhido: "" }), pessoasDaLista({ cadastradas }), "texto vazio não cria linha");
  assert.deepEqual(pessoasDaLista({ cadastradas: [] }), []);
});

test("nome curto: primeiro nome + último sobrenome; duas pessoas com o mesmo resultado usam o nome completo", () => {
  assert.equal(nomeCurtoDaPessoa("Elton Volmir Strapazon"), "Elton Strapazon");
  assert.equal(nomeCurtoDaPessoa("  Maria   da Silva  Santos "), "Maria Santos");
  assert.equal(nomeCurtoDaPessoa("Marivane"), "Marivane");
  assert.equal(nomeCurtoDaPessoa("Francisco José Vasconcelos Neto"), "Francisco Vasconcelos");
  assert.equal(nomeCurtoDaPessoa("João Carlos Silva Júnior"), "João Silva");
  assert.equal(nomeCurtoDaPessoa("Pedro Alves Jr."), "Pedro Alves");
  assert.equal(nomeCurtoDaPessoa("Ana Neto"), "Ana Neto");
  assert.equal(nomeCurtoDaPessoa("Ana Lima"), "Ana Lima");
  assert.equal(nomeCurtoDaPessoa(""), "");
  assert.deepEqual(rotulosDasPessoas(["Elton Volmir Strapazon", "Marivane Souza Lima", "Ana"]), ["Elton Strapazon", "Marivane Lima", "Ana"]);
  assert.deepEqual(rotulosDasPessoas(["Élton Volmir Strapazon", "Elton Carlos Strapazon", "Ana"]), ["Élton Volmir Strapazon", "Elton Carlos Strapazon", "Ana"]);
  assert.deepEqual(rotulosDasPessoas([]), []);
});

test("lista de responsáveis: usuário atual igual ao escolhido não repete", () => {
  assert.deepEqual(pessoasDaLista({ cadastradas: ["Ana"], usuarioAtual: "Élton", escolhido: "elton" }), ["Ana", "Élton"]);
});

test("nome normalizado: usa a grafia do cadastro ou espaços únicos", () => {
  assert.equal(nomeNormalizado("  marcos   souza ", ["Marcos Souza", "Isabel"]), "Marcos Souza");
  assert.equal(nomeNormalizado("  Fulano   de  Tal ", ["Isabel"]), "Fulano de Tal");
  assert.equal(nomeNormalizado("   ", ["Isabel"]), "");
});

test("nome normalizado: Élton e Elton são a mesma pessoa e a lista de cadastradas pode estar vazia", () => {
  assert.equal(nomeNormalizado("  elton ", ["Élton"]), "Élton");
  assert.equal(nomeNormalizado("Élton", ["Elton"]), "Elton");
  assert.equal(nomeNormalizado("  ana   maria ", []), "ana maria");
  assert.equal(nomeNormalizado("", []), "");
});

test("lote: o responsável é gravado com a grafia do cadastro e o prazo passa como veio", () => {
  const cadastradas = ["Marcos Souza", "Isabel"];
  assert.deepEqual(valoresDeLoteNormalizados({ responsavel: "  marcos   souza ", prazo: "2026-11-01" }, cadastradas), { responsavel: "Marcos Souza", prazo: "2026-11-01" });
  assert.deepEqual(valoresDeLoteNormalizados({ responsavel: " Fulano   de  Tal", prazo: "" }, cadastradas), { responsavel: "Fulano de Tal", prazo: "" });
  assert.deepEqual(valoresDeLoteNormalizados({ responsavel: "   ", prazo: "2026-11-01" }, cadastradas), { responsavel: "", prazo: "2026-11-01" });
});
