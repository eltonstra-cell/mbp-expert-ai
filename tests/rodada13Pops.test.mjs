import assert from "node:assert/strict";
import { test } from "node:test";
import { CAMPOS_GUIADOS, INDICACAO_DA_NORMA, campoGuiadoDaHigienizacao, textoDoCampoGuiado } from "../lib/popModelosGuiados.ts";
import { OPCOES_DE_FREQUENCIA, diasDaFrequenciaDoPop, frequenciaDoPop, tipoReconhecidoNoTexto } from "../lib/popFrequencia.ts";
import { secoesDoEditor, FREQUENCIA_A_DEFINIR } from "../lib/popDocumento.ts";
import { readFileSync } from "node:fs";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("campos guiados: só pergunta, indicação e fonte, todos marcados conferir, sem valor pronto", () => {
  const todos = [...Object.values(CAMPOS_GUIADOS), ...["superficie", "metodo", "produto", "principioAtivo", "concentracao", "tempoContato", "temperatura"].flatMap((chave) => [campoGuiadoDaHigienizacao(chave, false), campoGuiadoDaHigienizacao(chave, true)])];
  assert.ok(todos.length >= 20);
  for (const guia of todos) {
    assert.equal(guia.conferir, true);
    assert.match(guia.fonte, /RDC 216\/2004, 4\.11\.\d/);
    assert.match(guia.fonte, /Portaria SES 799\/2023, Anexo II, 13\.\d+/);
    assert.ok(guia.pergunta.endsWith("?"));
    assert.ok(!/\d+\s*(ppm|mg|°C|minutos|min\b|%)/i.test(guia.pergunta), "nenhum valor numérico");
    assert.ok(textoDoCampoGuiado(guia).includes(INDICACAO_DA_NORMA));
  }
  assert.equal(campoGuiadoDaHigienizacao("inexistente", false), null);
});

test("frequência: Semestral, Anual e Outra existem e são reconhecidas", () => {
  assert.deepEqual(OPCOES_DE_FREQUENCIA.map((o) => o.rotulo), ["Diária", "Semanal", "Mensal", "Semestral", "Anual", "Outra"]);
  assert.equal(tipoReconhecidoNoTexto("Semestral"), "semestral");
  assert.equal(tipoReconhecidoNoTexto("anual"), "anual");
  assert.equal(frequenciaDoPop({ frequenciaEstruturada: { tipo: "semestral" } })?.tipo, "semestral");
  assert.equal(diasDaFrequenciaDoPop({ frequenciaEstruturada: { tipo: "semestral" } }, () => null), 182);
  assert.equal(diasDaFrequenciaDoPop({ frequenciaEstruturada: { tipo: "anual" } }, () => null), 365);
});

test("frequência definida tira a pendência do índice e a folha avisa 'frequência a definir' só sem ela", () => {
  assert.equal(FREQUENCIA_A_DEFINIR, "frequência a definir");
  const origem = ler("../lib/popDocumento.ts");
  assert.ok(origem.includes("a frequência") && origem.includes("opcoes.marcarBranco && executor"));
  assert.equal(typeof secoesDoEditor, "function");
  const folha = ler("../components/pc/PopFolha.tsx");
  assert.ok(folha.includes("pfolha-definir"));
});

test("aba Documento: índice, seletor, folha, rodapé sem enviar para aprovação", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  for (const trecho of ["pdoc-secoes", "pdoc-estreito", "Ver folha", "Ir para Conferir", "Salvar rascunho", "pdoc-ajuda-passos"]) assert.ok(editor.includes(trecho), trecho);
  assert.ok(!editor.includes("Enviar para aprovação"), "o envio só existe na etapa 3 do Resumo");
  assert.ok(editor.indexOf("Ir para Conferir") < editor.lastIndexOf("Salvar rascunho"));
});
