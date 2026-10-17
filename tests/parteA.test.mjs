import test from "node:test";
import assert from "node:assert/strict";
import { nomeSemNumerosNoInicio, iniciaisDaEmpresa } from "../lib/navigation.ts";
import { nomeDoArquivoPdf } from "../lib/reportLabels.ts";
import { mensagemDeFaltas, primeiroCampoComProblema } from "../lib/correcaoRotulos.ts";
import { contarEtapas } from "../lib/actionPlan.ts";

// Item 4: nome de exibição sem CNPJ/número no começo (só exibição).
test("nome sem número no começo: casos pedidos", () => {
  assert.equal(nomeSemNumerosNoInicio("44.150.273 Elton Volmir Strapazon"), "Elton Volmir Strapazon");
  assert.equal(nomeSemNumerosNoInicio("44150273 Empresa X"), "Empresa X");
  assert.equal(nomeSemNumerosNoInicio("Empresa Y"), "Empresa Y");
  assert.equal(nomeSemNumerosNoInicio("44.150.273"), "44.150.273"); // só número: mantém o original
  assert.equal(nomeSemNumerosNoInicio(""), "");
  assert.equal(nomeSemNumerosNoInicio("Padaria 24 Horas"), "Padaria 24 Horas"); // número no meio não some
});

test("slug do arquivo do PDF não leva número do começo", () => {
  assert.equal(nomeDoArquivoPdf("44.150.273 Elton Volmir Strapazon", "2026-08-10", "parcial"), "relatorio-tecnico-elton-volmir-strapazon-2026-08-10-parcial.pdf");
  assert.equal(nomeDoArquivoPdf("44150273 Empresa X", "2026-08-10", "previa"), "relatorio-tecnico-empresa-x-2026-08-10-previa.pdf");
  assert.equal(nomeDoArquivoPdf("Empresa Y", "2026-08-10", "oficial"), "relatorio-tecnico-empresa-y-2026-08-10-oficial.pdf");
  assert.equal(nomeDoArquivoPdf("44.150.273", "2026-08-10", "parcial"), "relatorio-tecnico-44-150-273-2026-08-10-parcial.pdf");
  assert.equal(nomeDoArquivoPdf("", "2026-08-10", "parcial"), "relatorio-tecnico-empresa-2026-08-10-parcial.pdf");
});

test("monograma só com letras para os mesmos nomes", () => {
  assert.equal(iniciaisDaEmpresa("44.150.273 Elton Volmir Strapazon"), "EV");
  assert.equal(iniciaisDaEmpresa("44150273 Empresa X"), "EX");
  assert.equal(iniciaisDaEmpresa("Empresa Y"), "EY");
  assert.equal(iniciaisDaEmpresa("44.150.273", "Élton"), "É");
  assert.equal(iniciaisDaEmpresa("", ""), "?");
});

// Item 2: mensagem "Falta informar" para cada combinação de campo faltante.
test("Falta informar: todas as combinações de ação, responsável e prazo", () => {
  const esperado = {
    "acao": "Falta informar: o que será feito",
    "responsavel": "Falta informar: responsável",
    "prazo": "Falta informar: prazo",
    "acao,responsavel": "Falta informar: o que será feito e responsável",
    "acao,prazo": "Falta informar: o que será feito e prazo",
    "responsavel,prazo": "Falta informar: responsável e prazo",
    "acao,responsavel,prazo": "Falta informar: o que será feito, responsável e prazo",
  };
  for (const [chave, texto] of Object.entries(esperado)) {
    const campos = chave.split(",");
    assert.equal(mensagemDeFaltas(campos), texto, chave);
    // a ordem em que os campos chegam não muda a mensagem
    assert.equal(mensagemDeFaltas([...campos].reverse()), texto, chave + " (invertida)");
  }
  assert.equal(mensagemDeFaltas([]), "");
});

test("foco vai para o primeiro campo faltante, na ordem da tela", () => {
  assert.equal(primeiroCampoComProblema(["prazo", "responsavel", "acao"]), "acao");
  assert.equal(primeiroCampoComProblema(["prazo", "responsavel"]), "responsavel");
  assert.equal(primeiroCampoComProblema(["prazo"]), "prazo");
  assert.equal(primeiroCampoComProblema([]), null);
});

// Item 5: a faixa "Com plano" conta só as correções com plano (a mesma conta usada no subtítulo).
test("contagem por etapa: 0, 1 e várias correções com plano", () => {
  const base = { status: "Aberta", acaoCorretiva: "", responsavelAcao: "", prazo: "" };
  const comPlano = { ...base, acaoCorretiva: "Trocar", responsavelAcao: "Ana", prazo: "2026-12-01" };
  const emAcompanhamento = { ...comPlano, status: "Em tratamento" };
  const resolvida = { ...comPlano, status: "Resolvida" };
  assert.equal(contarEtapas([base, base]).plano, 0);
  assert.equal(contarEtapas([comPlano, base]).plano, 1);
  assert.equal(contarEtapas([comPlano, comPlano, comPlano, base]).plano, 3);
  // em acompanhamento e resolvidas ficam nas próprias etapas, fora de "Com plano"
  const misto = contarEtapas([comPlano, emAcompanhamento, resolvida, base]);
  assert.deepEqual([misto.identificadas, misto.plano, misto.acompanhamento, misto.resolvidas], [1, 1, 1, 1]);
});
