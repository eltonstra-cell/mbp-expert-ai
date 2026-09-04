import assert from "node:assert/strict";
import test from "node:test";

import {
  confirmarSugestaoFotoIA,
  descartarSugestaoFotoIA,
  registrarSugestaoFotoIA,
  ultimaAnaliseConfirmada,
} from "../lib/photoAnalysis.ts";

const resultado = {
  analisavel: true,
  situacao: "Possível não conformidade",
  resumo: "Recipiente observado sem proteção completa.",
  classificacao: "Possível evidência de não conformidade",
  achados: [
    {
      titulo: "Proteção do alimento",
      descricao: "A cobertura parece incompleta na área visível.",
      acaoSugerida: "Cobrir completamente o recipiente.",
      confianca: "Média",
      requerConfirmacao: true,
    },
  ],
  alertasPrivacidade: [],
  observacoesLimitacoes: ["Não é possível verificar temperatura pela foto."],
};

test("registra sugestão como pendente e exige revisão profissional", () => {
  const analise = registrarSugestaoFotoIA(
    resultado,
    "modelo-teste",
    "2026-08-23T13:00:00.000Z",
    "analise-1"
  );

  assert.equal(analise.status, "Aguardando revisão");
  assert.equal(analise.id, "analise-1");
  assert.match(analise.textoRevisado, /Proteção do alimento/);
  assert.match(analise.textoRevisado, /Ação sugerida: Cobrir completamente/);
  assert.equal(analise.revisadaEm, undefined);
});

test("confirma texto editado sem alterar o resultado original", () => {
  const sugestao = registrarSugestaoFotoIA(resultado, "modelo-teste", "2026-08-23T13:00:00.000Z", "analise-2");
  const confirmada = confirmarSugestaoFotoIA(
    sugestao,
    "Descrição revisada pelo consultor.",
    "Elton",
    "2026-08-23T13:05:00.000Z"
  );

  assert.equal(confirmada.status, "Confirmada");
  assert.equal(confirmada.textoRevisado, "Descrição revisada pelo consultor.");
  assert.equal(confirmada.revisadaPor, "Elton");
  assert.equal(sugestao.status, "Aguardando revisão");
});

test("mantém análises descartadas no histórico e localiza a última confirmada", () => {
  const primeira = confirmarSugestaoFotoIA(
    registrarSugestaoFotoIA(resultado, "modelo", "2026-08-23T13:00:00.000Z", "a1"),
    "Primeira confirmação.",
    "Elton"
  );
  const descartada = descartarSugestaoFotoIA(
    registrarSugestaoFotoIA(resultado, "modelo", "2026-08-23T13:10:00.000Z", "a2"),
    "Elton"
  );

  assert.equal(descartada.status, "Descartada");
  assert.equal(ultimaAnaliseConfirmada([primeira, descartada])?.id, "a1");
});
