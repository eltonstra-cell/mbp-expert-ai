import assert from "node:assert/strict";
import test from "node:test";

import { acrescimosNaLinhaDasEvidencias, chipDaAcaoCabeNaBarra, RESERVA_DO_LINK_DE_SUGESTOES, acrescimosVazios, conteudoDeAtualizacoes, conteudoDeEvidencias, contagemDeEvidencias, contextoDoDetalhe, evidenciasSemFoto, rotuloDeRegistrarAtualizacao, selosDoCartao } from "../lib/layoutDeCorrecoes.ts";

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

test("acrescimosVazios: só o que está vazio E permitido (cada combinação)", () => {
  const tudo = { podeEditar: true, podeEvidenciar: true };
  assert.deepEqual(acrescimosVazios(nc(), [], tudo), { foto: true, atualizacao: true });
  assert.deepEqual(acrescimosVazios(nc({ historico: [{ id: "h" }] }), [], tudo), { foto: true, atualizacao: false });
  assert.deepEqual(acrescimosVazios(nc({ par: { antes: [foto], depois: [] } }), [], tudo), { foto: false, atualizacao: true });
  assert.deepEqual(acrescimosVazios(nc({ par: { antes: [foto], depois: [] }, historico: [{ id: "h" }] }), [], tudo), { foto: false, atualizacao: false });
  assert.deepEqual(acrescimosVazios(nc(), [audio], tudo), { foto: true, atualizacao: true }, "só áudio: o link + Foto continua (não há foto)");
  assert.deepEqual(acrescimosVazios(nc(), [], { podeEditar: false, podeEvidenciar: true }), { foto: true, atualizacao: false });
  assert.deepEqual(acrescimosVazios(nc(), [], { podeEditar: true, podeEvidenciar: false }), { foto: false, atualizacao: true });
  assert.deepEqual(acrescimosVazios(nc(), [], { podeEditar: false, podeEvidenciar: false }), { foto: false, atualizacao: false }, "sem permissão não há linha");
});

test("acrescimosVazios: correção resolvida mantém as regras e o rótulo vira 'Registrar nova atualização / reabrir'", () => {
  const resolvida = nc({ status: "Resolvida" });
  assert.deepEqual(acrescimosVazios(resolvida, [], { podeEditar: true, podeEvidenciar: true }), { foto: true, atualizacao: true });
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

test("acrescimosNaLinhaDasEvidencias: só com evidências e sem bloco de atualizações", () => {
  assert.equal(acrescimosNaLinhaDasEvidencias(true, false), true);
  assert.equal(acrescimosNaLinhaDasEvidencias(true, true), false, "com atualizações os acréscimos vão ao fim do corpo");
  assert.equal(acrescimosNaLinhaDasEvidencias(false, false), false, "sem evidências não há linha onde ancorar");
  assert.equal(acrescimosNaLinhaDasEvidencias(false, true), false);
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
