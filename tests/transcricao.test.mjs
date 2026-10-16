import test from "node:test";
import assert from "node:assert/strict";
import { INSTRUCAO_DE_TRANSCRICAO, avaliarTranscricao, ehEcoDaInstrucao, ehSilencio } from "../lib/transcricao.ts";

test("silêncio: pico de volume abaixo do limite não é enviado", () => {
  assert.equal(ehSilencio(0), true);
  assert.equal(ehSilencio(0.01), true);
  assert.equal(ehSilencio(0.049), true);
  assert.equal(ehSilencio(0.05), false);
  assert.equal(ehSilencio(0.4), false);
  assert.equal(ehSilencio(Number.NaN), true);
});

test("eco da instrução: o texto da própria instrução nunca vira fala", () => {
  assert.equal(ehEcoDaInstrucao(INSTRUCAO_DE_TRANSCRICAO), true);
  assert.equal(ehEcoDaInstrucao("Transcreva fielmente em português do Brasil."), true);
  assert.equal(ehEcoDaInstrucao("transcreva fielmente em português do brasil preserve termos técnicos"), true);
  assert.equal(ehEcoDaInstrucao("Preserve termos técnicos de segurança dos alimentos, higiene, checklist"), true);
  assert.equal(ehEcoDaInstrucao("Legenda: Transcreva fielmente em português do Brasil. Obrigado."), true);
});

test("fala real passa, mesmo usando palavras do vocabulário técnico", () => {
  assert.equal(ehEcoDaInstrucao("A câmara fria está com a temperatura em nove graus"), false);
  assert.equal(ehEcoDaInstrucao("Falta POP de higiene das mãos e o checklist está incompleto"), false);
  assert.equal(ehEcoDaInstrucao("Treinar a equipe em segurança dos alimentos"), false);
  assert.deepEqual(avaliarTranscricao("  Piso com rachaduras perto do ralo  "), { ok: true, texto: "Piso com rachaduras perto do ralo" });
});

test("avaliação: vazio, eco e curto demais para a duração são descartados", () => {
  assert.deepEqual(avaliarTranscricao(""), { ok: false, motivo: "vazio" });
  assert.deepEqual(avaliarTranscricao("  ... "), { ok: false, motivo: "vazio" });
  assert.deepEqual(avaliarTranscricao(INSTRUCAO_DE_TRANSCRICAO), { ok: false, motivo: "eco" });
  assert.deepEqual(avaliarTranscricao("ok", 25), { ok: false, motivo: "curto" });
  assert.equal(avaliarTranscricao("ok", 3).ok, true);
  assert.equal(avaliarTranscricao("ok", undefined).ok, true);
});
