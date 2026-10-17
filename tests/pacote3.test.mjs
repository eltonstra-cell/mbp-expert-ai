import test from "node:test";
import assert from "node:assert/strict";
import { dataParaArquivo, nomeDoArquivoPdf } from "../lib/reportLabels.ts";
import { estadosDosBotoes } from "../lib/checklistUi.ts";
import { NOME_DAS_ETAPAS, linhaDaCorrecao } from "../lib/correcaoRotulos.ts";
import { calcularCortes } from "../lib/pdfPaginacao.ts";
import { cssDoRodapeDeImpressao, suportaCaixasDeMargem, textoParaCss } from "../lib/printFooter.ts";

test("nome do arquivo do PDF: empresa e data da visita do relatório, mais o tipo", () => {
  assert.equal(nomeDoArquivoPdf("Churrascaria do Chico", "2026-08-10", "parcial"), "relatorio-tecnico-churrascaria-do-chico-2026-08-10-parcial.pdf");
  assert.equal(nomeDoArquivoPdf("Padaria Pão Quente", "10/08/2026", "previa"), "relatorio-tecnico-padaria-pao-quente-2026-08-10-previa.pdf");
  assert.equal(nomeDoArquivoPdf("44.150.273 Maria LTDA", "2026-09-06T10:00:00.000Z", "oficial"), "relatorio-tecnico-maria-ltda-2026-09-06-oficial.pdf");
});

test("nome do arquivo: CNPJ/número no começo do nome não entra", () => {
  assert.equal(nomeDoArquivoPdf("44.150.273 Elton Volmir Strapazon", "2026-08-10", "parcial"), "relatorio-tecnico-elton-volmir-strapazon-2026-08-10-parcial.pdf");
  assert.equal(nomeDoArquivoPdf("44.150.273", "2026-08-10", "previa"), "relatorio-tecnico-44-150-273-2026-08-10-previa.pdf");
});

test("nome do arquivo: duas empresas ou datas diferentes nunca geram o mesmo nome", () => {
  const a = nomeDoArquivoPdf("Empresa A", "2026-08-10", "oficial");
  assert.notEqual(a, nomeDoArquivoPdf("Empresa B", "2026-08-10", "oficial"));
  assert.notEqual(a, nomeDoArquivoPdf("Empresa A", "2026-09-06", "oficial"));
  assert.notEqual(a, nomeDoArquivoPdf("Empresa A", "2026-08-10", "parcial"));
});

test("nome do arquivo: sem dados válidos usa valores seguros, sem caracteres perigosos", () => {
  assert.equal(nomeDoArquivoPdf("", "", "previa"), "relatorio-tecnico-empresa-sem-data-previa.pdf");
  assert.equal(nomeDoArquivoPdf("../../etc/passwd & Cia", "2026-01-02", "oficial"), "relatorio-tecnico-etc-passwd-cia-2026-01-02-oficial.pdf");
  assert.equal(dataParaArquivo("hoje"), "");
});

test("botões de resposta: antes de responder os três são claros; depois o escolhido é cheio e os outros apagados", () => {
  assert.deepEqual(estadosDosBotoes("Pendente"), { Conforme: "claro", "Não Conforme": "claro", "Não se aplica": "claro" });
  assert.deepEqual(estadosDosBotoes("Conforme"), { Conforme: "marcado", "Não Conforme": "apagado", "Não se aplica": "apagado" });
  assert.deepEqual(estadosDosBotoes("Não Conforme"), { Conforme: "apagado", "Não Conforme": "marcado", "Não se aplica": "apagado" });
  assert.deepEqual(estadosDosBotoes("Não se aplica"), { Conforme: "apagado", "Não Conforme": "apagado", "Não se aplica": "marcado" });
  assert.deepEqual(estadosDosBotoes("qualquer coisa"), { Conforme: "claro", "Não Conforme": "claro", "Não se aplica": "claro" });
});

test("lista de correções: o título é o nome do item; o ambiente fica embaixo; o código é curto", () => {
  const linha = linhaDaCorrecao({ titulo: "  Piso liso e lavável  ", ambiente: "Recebimento", numero: 3 });
  assert.deepEqual(linha, { titulo: "Piso liso e lavável", ambiente: "Recebimento", codigo: "NC03" });
  assert.equal(linhaDaCorrecao({ titulo: "x", ambiente: "", numero: 12 }).ambiente, "Sem ambiente");
  assert.equal(linhaDaCorrecao({ titulo: "x", ambiente: "A", numero: 12 }).codigo, "NC12");
  // dois itens do mesmo ambiente se distinguem pelo título
  const a = linhaDaCorrecao({ titulo: "Piso", ambiente: "Recebimento", numero: 1 });
  const b = linhaDaCorrecao({ titulo: "Paredes", ambiente: "Recebimento", numero: 2 });
  assert.notEqual(a.titulo, b.titulo);
  assert.equal(NOME_DAS_ETAPAS.length, 4);
});

test("paginação: nenhum cartão é cortado no meio e as páginas se enchem", () => {
  // um bloco grande (pai) contendo cartões menores, como a seção de evidências
  const pai = { top: 100, bottom: 2900, height: 2800 };
  const filhos = [];
  for (let i = 0; i < 9; i += 1) filhos.push({ top: 150 + i * 300, bottom: 150 + i * 300 + 270, height: 270 });
  const cortes = calcularCortes({ alturaTotal: 3000, alturaPagina: 1000, folga: 20, blocos: [pai, ...filhos] });
  for (const corte of cortes.slice(0, -1)) {
    for (const filho of filhos) assert.equal(corte.fim > filho.top + 1 && corte.fim < filho.bottom - 1, false, `corte ${corte.fim} dentro de cartão ${filho.top}`);
  }
  // cobre tudo, sem lacunas nem sobreposição
  assert.equal(cortes[0].inicio, 0);
  assert.equal(cortes.at(-1).fim, 3000);
  for (let i = 1; i < cortes.length; i += 1) assert.equal(cortes[i].inicio, cortes[i - 1].fim);
  // páginas cheias: nenhuma (exceto a última) abaixo de 70% da folha
  for (const corte of cortes.slice(0, -1)) assert.ok(corte.fim - corte.inicio >= 700, `página curta: ${corte.fim - corte.inicio}`);
});

test("paginação: bloco montado à mão (título + primeira foto) vai junto, e conteúdo curto cabe em uma página", () => {
  const sintetico = { top: 900, bottom: 1300, height: 400, sintetico: true };
  const cartao = { top: 1000, bottom: 1300, height: 300 };
  const cortes = calcularCortes({ alturaTotal: 2000, alturaPagina: 1100, folga: 20, blocos: [sintetico, cartao] });
  assert.ok(cortes[0].fim <= 900, "o corte deve cair antes do título da seção");
  assert.deepEqual(calcularCortes({ alturaTotal: 500, alturaPagina: 1000, folga: 20, blocos: [] }), [{ inicio: 0, fim: 500 }]);
});

test("rodapé de impressão: texto escapado e caixas de margem só no Chromium 131+", () => {
  assert.equal(textoParaCss('Bar "do" Zé\\\nLtda'), 'Bar \\"do\\" Zé\\\\ Ltda');
  assert.equal(suportaCaixasDeMargem([{ brand: "Chromium", version: "142" }]), true);
  assert.equal(suportaCaixasDeMargem([{ brand: "Chromium", version: "120" }]), false);
  assert.equal(suportaCaixasDeMargem(undefined, "Mozilla/5.0 Chrome/131.0.0.0 Safari/537.36"), true);
  assert.equal(suportaCaixasDeMargem(undefined, "Mozilla/5.0 Firefox/130.0"), false);
  const css = cssDoRodapeDeImpressao({ empresa: "Churrascaria do Chico", selo: "RELATÓRIO PARCIAL", comCaixasDeMargem: true });
  assert.match(css, /@bottom-left\{content:"Churrascaria do Chico"/);
  assert.match(css, /@bottom-center\{content:"RELATÓRIO PARCIAL"/);
  assert.match(css, /content:"Página " counter\(page\) " de " counter\(pages\)/);
  assert.equal(cssDoRodapeDeImpressao({ empresa: "X", selo: "PRÉVIA", comCaixasDeMargem: false }), "");
});

test("monograma da empresa no menu: só letras, sem número no começo, com reserva", async () => {
  const { iniciaisDaEmpresa, nomeSemNumerosNoInicio } = await import("../lib/navigation.ts");
  assert.equal(iniciaisDaEmpresa("Churrascaria do Chico"), "CC");
  assert.equal(iniciaisDaEmpresa("Beyond Nutri"), "BN");
  assert.equal(iniciaisDaEmpresa("44.150.273 Elton Volmir Strapazon"), "EV");
  assert.equal(iniciaisDaEmpresa("Elton Volmir"), "EV");
  assert.equal(iniciaisDaEmpresa("Padaria"), "P");
  assert.equal(iniciaisDaEmpresa("44.150.273", "Élton"), "É");
  assert.equal(iniciaisDaEmpresa("", ""), "?");
  assert.equal(nomeSemNumerosNoInicio("44.150.273 Elton Volmir Strapazon"), "Elton Volmir Strapazon");
  assert.equal(nomeSemNumerosNoInicio("12.345.678/0001-90 Padaria X"), "Padaria X");
  assert.equal(nomeSemNumerosNoInicio("44.150.273"), "44.150.273");
});

test("nome do ambiente: 'Câmara fria' e variações aparecem como 'Câmara refrigerada'; o resto não muda", async () => {
  const { nomeDeExibicaoDoAmbiente, resumoAmbientes } = await import("../lib/checklistEnvs.ts");
  for (const nome of ["Câmara Fria", "Câmara fria", "câmara  fria", "CÂMARA FRIA", "Camara refrigerada", "Câmara frigorífica"]) {
    assert.equal(nomeDeExibicaoDoAmbiente(nome), "Câmara refrigerada", nome);
  }
  for (const nome of ["Cozinha", "Câmara de congelamento", "Estoque seco", ""]) assert.equal(nomeDeExibicaoDoAmbiente(nome), nome);
  // o dado salvo (nome) não muda; só o rótulo exibido
  const infos = resumoAmbientes(["Câmara Fria"], [{ ambiente: "Câmara Fria", status: "Pendente" }]);
  assert.equal(infos[0].nome, "Câmara Fria");
  assert.equal(infos[0].rotulo, "Câmara refrigerada");
  assert.equal(linhaDaCorrecao({ titulo: "x", ambiente: "Câmara Fria", numero: 1 }).ambiente, "Câmara refrigerada");
});

test("plano de correção: mensagem de campos faltantes e foco no primeiro", async () => {
  const { mensagemDeFaltas, primeiroCampoComProblema } = await import("../lib/correcaoRotulos.ts");
  assert.equal(mensagemDeFaltas([]), "");
  assert.equal(mensagemDeFaltas(["prazo"]), "Falta informar: prazo");
  assert.equal(mensagemDeFaltas(["prazo", "responsavel"]), "Falta informar: responsável e prazo");
  assert.equal(mensagemDeFaltas(["prazo", "acao", "responsavel"]), "Falta informar: o que será feito, responsável e prazo");
  assert.equal(mensagemDeFaltas([], ["prazo"]), "Corrija: prazo");
  assert.equal(mensagemDeFaltas(["acao"], ["prazo"]), "Falta informar: o que será feito. Corrija: prazo");
  assert.equal(primeiroCampoComProblema(["prazo", "responsavel"]), "responsavel");
  assert.equal(primeiroCampoComProblema([], ["prazo"]), "prazo");
  assert.equal(primeiroCampoComProblema([]), null);
});
