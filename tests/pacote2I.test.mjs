import { nomeDeExibicaoDaEmpresa } from "../lib/nomeEmpresa.ts";
import assert from "node:assert/strict";
import test from "node:test";

import { AVISO_SECAO_VAZIA, TEXTO_SECAO_VAZIA, compararItensDeNorma, folhaDoPop, referenciasCompactas } from "../lib/popDocumento.ts";

const ref = (norma, item) => ({ norma, item, orientacao: "x" });
const SES = "Portaria SES 799/2023 (RS)";
const pop = (conteudo, extra = {}) => ({ codigo: "POP-01", titulo: "Higienização", versao: "1.1", status: "Rascunho", conteudo, ...extra });

test("referências: itens da RDC em ordem numérica e Portaria agrupada por anexo, sem a menção solta", () => {
  const linhas = referenciasCompactas([
    ref("RDC 216/2004", "4.11.2"), ref("RDC 216/2004", "4.11.4"), ref("RDC 216/2004", "4.11.5"), ref("RDC 216/2004", "4.11.3"),
    ref(SES, "Anexo II (item a conferir)"), ref(SES, "Anexo II, 13.7 (a–d)"), ref(SES, "Anexo I, 13.2"), ref(SES, "Anexo II, 13.2"), ref(SES, "Anexo II"),
  ]);
  assert.deepEqual(linhas, [
    "RDC 216/2004 (4.11.2; 4.11.3; 4.11.4; 4.11.5) · conferir",
    `${SES} (Anexo I: 13.2 · Anexo II: 13.2, 13.7 (a–d)) · conferir`,
  ]);
  assert.ok(linhas.length <= 2 && linhas.every((linha) => linha.endsWith("· conferir")));
});

test("referências: anexo sem detalhe é mantido quando é tudo o que existe; ordem natural (4.11.10 depois de 4.11.9)", () => {
  assert.deepEqual(referenciasCompactas([ref(SES, "Anexo II (item a conferir)")]), [`${SES} (Anexo II) · conferir`]);
  assert.ok(compararItensDeNorma("4.11.9", "4.11.10") < 0);
  assert.ok(compararItensDeNorma("13.2", "13.7 (a–d)") < 0);
  assert.equal(compararItensDeNorma("4.11.2", "4.11.2"), 0);
});

test("folha: toda seção sem texto mostra 'Não preenchida'; Registro e Detalhes opcionais não aparecem vazios", () => {
  const folha = folhaDoPop(pop({}), { nome: "Padaria" });
  const titulos = folha.blocos.map((bloco) => bloco.titulo);
  assert.deepEqual(titulos, ["Objetivo", "Responsável e frequência", "Passos", "Ação corretiva"]);
  assert.ok(folha.blocos.every((bloco) => bloco.vazia && bloco.linhas[0] === TEXTO_SECAO_VAZIA));
  const preenchido = folhaDoPop(pop({ objetivo: "Limpar", passos: [{ id: "1", texto: "a" }], acaoCorretiva: "Repetir", frequencia: "diária", responsavelExecucao: { nome: "A", cargo: "B" } }), {});
  assert.ok(preenchido.blocos.every((bloco) => !bloco.vazia));
  const passosVazios = folhaDoPop(pop({ passos: [{ id: "1", texto: " " }] }), {});
  assert.equal(passosVazios.blocos.find((bloco) => bloco.titulo === "Passos").vazia, true);
});

test("folha: aviso 'Seção vazia' em Ação corretiva só com a SES 799/2023 ativa", () => {
  const vazia = pop({ objetivo: "x" });
  const com = folhaDoPop(vazia, {}, { exigeAcaoCorretiva: true }).blocos.find((bloco) => bloco.titulo === "Ação corretiva");
  assert.equal(com.aviso, AVISO_SECAO_VAZIA);
  const sem = folhaDoPop(vazia, {}, { exigeAcaoCorretiva: false }).blocos.find((bloco) => bloco.titulo === "Ação corretiva");
  assert.equal(sem.aviso, undefined);
  const preenchida = folhaDoPop(pop({ acaoCorretiva: "Repetir" }), {}, { exigeAcaoCorretiva: true }).blocos.find((bloco) => bloco.titulo === "Ação corretiva");
  assert.equal(preenchida.aviso, undefined);
  const objetivo = folhaDoPop(vazia, {}, { exigeAcaoCorretiva: true }).blocos.find((bloco) => bloco.titulo === "Objetivo");
  assert.equal(objetivo.aviso, undefined, "Objetivo e Aplicação: sem aviso");
});

test("folha: responsável vem do usuário vinculado e a razão social sai em formato de título", () => {
  const aprovacao = { nome: "Élton Volmir Strapazon", cargo: "", usuarioId: "u1", em: "2026-10-21T15:00:00.000Z" };
  const responsavel = { nome: "Elton", cargo: "Nutricionista RT", usuarioId: "u1" };
  const aprovado = pop({ frequencia: "diária" }, { status: "Aprovado", aprovacao });
  const folha = folhaDoPop(aprovado, { nome: nomeDeExibicaoDaEmpresa({ nomeFantasia: "44.150.273 ELTON VOLMIR STRAPAZON" }), cnpj: "44150273000198" }, { responsavel });
  assert.equal(folha.situacao, "Aprovada por Elton, Nutricionista RT, em 21/10/2026");
  assert.equal(folha.blocos.find((bloco) => bloco.titulo === "Responsável e frequência").linhas[0], "Elton, Nutricionista RT · diária");
  assert.equal(folha.esquerda, "Elton Volmir Strapazon · CNPJ 44150273000198");
  // aprovação por outra pessoa mantém o que foi gravado
  const outra = folhaDoPop({ ...aprovado, aprovacao: { ...aprovacao, usuarioId: "u2" } }, {}, { responsavel });
  assert.equal(outra.situacao, "Aprovada por Élton Volmir Strapazon, em 21/10/2026");
  assert.equal(folhaDoPop(pop({}), { nome: nomeDeExibicaoDaEmpresa({ nomeFantasia: "PADARIA DO JOSE" }) }).esquerda, "Padaria do Jose");
});

import { readFileSync } from "node:fs";
const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("cabeçalho: título grande que repete o topo sai (só para leitores de tela); subtítulo sobe para a linha das abas", () => {
  for (const arquivo of ["PcVisitas", "PcEmpresas", "PcInicio", "PcAcessos", "PcResumo", "PcDossie", "PcEvolucao", "PcRelatoriosEmitidos", "PcRelatorio"]) {
    const tela = ler(`../components/pc/${arquivo}.tsx`);
    assert.ok(!/<h1 className="ui-title[^"]*">(Visitas|Empresas|Acessos|Relatório|Emitidos|Evolução|Olá)/.test(tela), arquivo);
    assert.ok(tela.includes('className="sr-only"'), arquivo);
  }
  const abas = ler("../components/pc/RelatoriosAbas.tsx");
  assert.ok(abas.includes("rel-abas-apoio") && abas.includes("Cada versão fica guardada e não muda"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("`Visita ${numeroVisitaPorId.get(visitaAtual?.id || \"\") || \"—\"}`") && pagina.includes("subtituloDoCaminho="));
  assert.ok(!ler("../components/pc/PcFichaPop.tsx").includes("← Lista de POPs"));
  assert.ok(!ler("../components/pc/PcPopsLista.tsx").includes("Procedimentos Operacionais Padronizados: situação"));
});

import { alterarPopVinculado, tiposDoPop } from "../lib/comprovantePop.ts";

test("comprovante na ficha: com uma só opção o Tipo vira texto fixo; com tipos próprios a lista continua", () => {
  assert.equal(tiposDoPop("higienizacao-instalacoes").length, 1);
  assert.ok(tiposDoPop("higienizacao-reservatorio").length > 1);
  const tela = ler("../components/pc/PcComprovantes.tsx");
  assert.ok(tela.includes("popFixo && (tiposDisponiveis.length === 1") && tela.includes('className="comp-tipo-fixo"'));
  assert.ok(tela.includes("comp-chips") && !tela.includes("comp-contadores"));
  assert.match(ler("../app/globals.css"), /\.comp-grade\{align-items:start\}/);
});

test("Alterar POP vinculado: troca sem apagar o comprovante e registra no histórico", () => {
  const pops = [{ id: "p1" }, { id: "p2" }];
  const base = { id: "c1", tipo: "pragas", popId: "p1" };
  const novo = alterarPopVinculado(base, "p2", pops, { id: "u1", nome: "Ana" }, "2026-10-21T10:00:00.000Z");
  assert.equal(novo.popId, "p2");
  assert.equal(novo.id, "c1");
  assert.deepEqual(novo.historicoDePop, [{ em: "2026-10-21T10:00:00.000Z", porId: "u1", porNome: "Ana", de: "p1", para: "p2" }]);
  assert.equal(base.popId, "p1", "o original não muda");
  // desvincular mantém o comprovante e anota
  const geral = alterarPopVinculado(novo, undefined, pops, { id: "u1" }, "2026-10-22T10:00:00.000Z");
  assert.equal(geral.popId, undefined);
  assert.equal(geral.historicoDePop.length, 2);
  // sem mudança ou POP inexistente: nada acontece
  assert.equal(alterarPopVinculado(base, "p1", pops, {}, "x"), base);
  assert.equal(alterarPopVinculado(base, "nao-existe", pops, {}, "x"), base);
  const tela = ler("../components/pc/PcComprovantes.tsx");
  assert.ok(tela.includes('"Alterar POP vinculado"') && tela.includes("onAlterarPop"));
  assert.ok(ler("../app/page.tsx").includes('acao: "comprovante.pop_alterado"'));
});

test("lista de POPs: chips em uma linha, botão de criar na linha das abas e sem 'Criar do modelo e revisar'", () => {
  const lista = ler("../components/pc/PcPopsLista.tsx");
  assert.ok(lista.includes("pgl-chips") && !lista.includes("pgl-contadores"));
  assert.ok(lista.includes('linha.situacao !== "Falta criar" && <div className="pgl-acao">'));
  assert.ok(!ler("../components/pc/CentralEmpresaNav.tsx").includes("cen-acoes-slot"), "o botão de criar fica na linha dos chips, não na das abas");
  assert.match(ler("../app/globals.css"), /\.pgl-linha\{min-height:56px/);
});
