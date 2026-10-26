import assert from "node:assert/strict";
import test from "node:test";

import { botoesDeProvas, provasVisiveis, chipDaAcaoCabeNaBarra, RESERVA_DO_LINK_DE_SUGESTOES, conteudoDeAtualizacoes, conteudoDeEvidencias, contagemDeEvidencias, contextoDoDetalhe, evidenciasSemFoto, rotuloDeRegistrarAtualizacao, selosDoCartao } from "../lib/layoutDeCorrecoes.ts";

const foto = { id: "f1" };
const audio = { id: "a1", tipo: "Áudio" };
const fotoEvidencia = { id: "e1", tipo: "Foto" };
const nc = (extra = {}) => ({ titulo: "Ralo sem tampa", ambiente: "Cozinha", numero: 1, itemNumero: 2, reincidente: false, vezes: 1, status: "Aberta", marcadaFeita: null, par: { antes: [], depois: [] }, historico: [], ...extra });

test("Evidências: vazio, só fotos, só áudio e áudio com fotos no par", () => {
  const vazio = nc();
  assert.equal(conteudoDeEvidencias(vazio, []), false);
  assert.equal(contagemDeEvidencias(vazio, []), 0);
  assert.equal(conteudoDeEvidencias({ historico: [] }, []), false, "sem par");
  const soFotos = nc({ par: { antes: [foto], depois: [foto] } });
  assert.equal(conteudoDeEvidencias(soFotos, [fotoEvidencia, fotoEvidencia]), true);
  assert.equal(contagemDeEvidencias(soFotos, [fotoEvidencia, fotoEvidencia]), 2, "foto não conta duas vezes (par + evidência)");
  assert.equal(conteudoDeEvidencias(nc({ par: { antes: [], depois: [foto] } }), []), true);
  assert.equal(conteudoDeEvidencias(vazio, [audio]), true, "só áudio tem conteúdo");
  assert.equal(contagemDeEvidencias(vazio, [audio]), 1);
  assert.deepEqual(evidenciasSemFoto([audio, fotoEvidencia]), [audio]);
  const misto = nc({ par: { antes: [foto], depois: [] } });
  assert.equal(contagemDeEvidencias(misto, [audio, fotoEvidencia]), 2, "1 foto no par + 1 áudio");
});

test("conteudoDeAtualizacoes: só com histórico", () => {
  assert.equal(conteudoDeAtualizacoes(nc()), false);
  assert.equal(conteudoDeAtualizacoes(nc({ historico: [{ id: "h1" }] })), true);
});

test("botoesDeProvas: sempre no bloco, conforme a permissão; a atualização some só com o formulário aberto", () => {
  const tudo = { podeEditar: true, podeEvidenciar: true };
  assert.deepEqual(botoesDeProvas(tudo), { foto: true, atualizacao: true });
  assert.deepEqual(botoesDeProvas(tudo, true), { foto: true, atualizacao: false });
  assert.deepEqual(botoesDeProvas({ podeEditar: false, podeEvidenciar: true }), { foto: true, atualizacao: false });
  assert.deepEqual(botoesDeProvas({ podeEditar: true, podeEvidenciar: false }), { foto: false, atualizacao: true });
  assert.deepEqual(botoesDeProvas({ podeEditar: false, podeEvidenciar: false }), { foto: false, atualizacao: false }, "sem permissão não há botão");
});

test("provasVisiveis: conteúdo existente ou botão permitido; sem nada, o bloco não existe", () => {
  const sem = { foto: false, atualizacao: false };
  const base = { evidencias: false, atualizacoes: false, registrando: false, botoes: sem };
  assert.equal(provasVisiveis(base), false);
  assert.equal(provasVisiveis({ ...base, evidencias: true }), true);
  assert.equal(provasVisiveis({ ...base, atualizacoes: true }), true);
  assert.equal(provasVisiveis({ ...base, registrando: true }), true);
  assert.equal(provasVisiveis({ ...base, botoes: { foto: true, atualizacao: false } }), true);
});

test("rotuloDeRegistrarAtualizacao: correção resolvida vira 'Registrar nova atualização / reabrir'", () => {
  assert.equal(rotuloDeRegistrarAtualizacao(true), "Registrar nova atualização / reabrir");
  assert.equal(rotuloDeRegistrarAtualizacao(false), "+ Registrar atualização");
});

test("selosDoCartao: ambiente só na Gravidade; selos Reincidente e Feita, a confirmar", () => {
  assert.deepEqual(selosDoCartao(nc(), "gravidade"), { ambiente: "Cozinha", selos: [], temLinha: true });
  assert.deepEqual(selosDoCartao(nc(), "ambiente"), { ambiente: null, selos: [], temLinha: false }, "sem selo, sem segunda linha");
  assert.deepEqual(selosDoCartao(nc({ reincidente: true }), "ambiente"), { ambiente: null, selos: ["Reincidente"], temLinha: true });
  const feita = nc({ marcadaFeita: { em: "2026-01-01", por: "Ana" } });
  assert.deepEqual(selosDoCartao(feita, "ambiente").selos, ["Feita, a confirmar"]);
  assert.deepEqual(selosDoCartao({ ...feita, reincidente: true }, "gravidade").selos, ["Reincidente", "Feita, a confirmar"]);
  assert.deepEqual(selosDoCartao({ ...feita, status: "Resolvida" }, "ambiente").selos, [], "resolvida não aguarda confirmação");
  assert.equal(selosDoCartao(nc({ ambiente: "" }), "gravidade").ambiente, "Sem ambiente");
});

test("contextoDoDetalhe: gravidade, ambiente, item e reincidência; o código fica à parte", () => {
  assert.deepEqual(contextoDoDetalhe(nc(), "Importante"), { texto: "Importante · Cozinha · item 2", codigo: "NC01" });
  assert.equal(contextoDoDetalhe(nc({ reincidente: true, vezes: 2 }), "Importante").texto, "Importante · Cozinha · item 2 · pela 2ª vez");
  assert.equal(contextoDoDetalhe(nc({ itemNumero: 0 }), "Leve").texto, "Leve · Cozinha");
});

test("chip 'Ação que funcionou antes' fica na barra só quando cabe inteiro; senão entra em '+N sugestões'", () => {
  assert.equal(chipDaAcaoCabeNaBarra({ larguraDaBarra: 700, ferramentas: 190, chip: 290, reservaDoMais: 120 }), true);
  assert.equal(chipDaAcaoCabeNaBarra({ larguraDaBarra: 590, ferramentas: 190, chip: 290, reservaDoMais: 120 }), false);
  // sem outras sugestões não precisa reservar o link
  assert.equal(chipDaAcaoCabeNaBarra({ larguraDaBarra: 500, ferramentas: 190, chip: 290, reservaDoMais: 0 }), true);
  assert.equal(chipDaAcaoCabeNaBarra({ larguraDaBarra: 480, ferramentas: 190, chip: 290, reservaDoMais: 0 }), false);
});

test("chip da ação: limite exato da largura (cabe com folga zero, não cabe com 1 px a menos) e reserva do link '+N sugestões'", () => {
  // ferramentas 190 + chip 290 + link 150 + 2 espaços de 8 = 646
  assert.equal(RESERVA_DO_LINK_DE_SUGESTOES, 150);
  assert.equal(chipDaAcaoCabeNaBarra({ larguraDaBarra: 646, ferramentas: 190, chip: 290, reservaDoMais: 150 }), true);
  assert.equal(chipDaAcaoCabeNaBarra({ larguraDaBarra: 645, ferramentas: 190, chip: 290, reservaDoMais: 150 }), false);
  // sem outras sugestões: 190 + 290 + 1 espaço de 8 = 488
  assert.equal(chipDaAcaoCabeNaBarra({ larguraDaBarra: 488, ferramentas: 190, chip: 290, reservaDoMais: 0 }), true);
  assert.equal(chipDaAcaoCabeNaBarra({ larguraDaBarra: 487, ferramentas: 190, chip: 290, reservaDoMais: 0 }), false);
});
