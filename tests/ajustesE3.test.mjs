import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { MENSAGEM_BLOQUEIO_DE_APROVACAO, MODELOS_COM_BLOQUEIO, bloqueioDeAprovacao, exigenciaDeAprovacao } from "../lib/popConferencia.ts";
import { TEXTO_PENDENTE_QUEM_REALIZA, destinoDoAprovar, itensDasNotas, totalDePendencias } from "../lib/popPendencias.ts";
import {
  CAMPOS_DA_IDENTIFICACAO,
  ativosDoPapel,
  contarPreenchidos,
  identificacaoCompleta,
  prefillDoPerfilDoRt,
  resumoDaIdentificacao,
  semOCampo,
  textoCurtoDaResponsabilidade,
  textoDosAtivos,
} from "../lib/manualIdentificacao.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

const popBase = (extra = {}) => ({ conteudo: {}, ...extra });
const NOTAS = [
  "[Quem realiza] Verificar se existe nesta empresa, colaboradores específicos para a realização desta tarefa.",
  "[Procedimento] Verificar na embalagem a orientação do fabricante.",
  "Nota sem etiqueta.",
];

test("3.2 nota [Quem realiza] vira pendência com ação; as outras viram informação sem colchetes", () => {
  const itens = itensDasNotas(NOTAS, popBase(), true, true);
  const pendencia = itens.find((item) => item.tipo === "pendencia");
  assert.equal(pendencia.texto, TEXTO_PENDENTE_QUEM_REALIZA);
  assert.equal(TEXTO_PENDENTE_QUEM_REALIZA, "Pendente: informar quem realiza a tarefa");
  assert.deepEqual(pendencia.acao, { rotulo: "Informar", alvo: "quemRealiza" });
  const informacoes = itens.filter((item) => item.tipo === "informacao");
  assert.deepEqual(informacoes.map((item) => item.texto), ["Procedimento: Verificar na embalagem a orientação do fabricante.", "Nota sem etiqueta."]);
  assert.ok(informacoes.every((item) => !item.acao), "informação nunca tem ação");
  assert.equal(itens.some((item) => item.texto.includes("[")), false, "o texto cru entre colchetes não aparece");
  assert.equal(totalDePendencias(itens), 1);
});

test("3.2 pendência resolvida (Quem realiza preenchido) vira informação; sem poder resolver, a pendência fica sem ação", () => {
  const preenchido = popBase({ conteudo: { quemRealiza: [{ texto: "Auxiliar de cozinha" }] } });
  const itens = itensDasNotas([NOTAS[0]], preenchido, true, true);
  assert.equal(totalDePendencias(itens), 0);
  assert.equal(itens[0].tipo, "informacao");
  const leitura = itensDasNotas([NOTAS[0]], popBase(), false, false);
  assert.equal(leitura[0].tipo, "pendencia");
  assert.equal(leitura[0].acao, undefined);
});

test("3.2 itens do modelo por conferir viram pendência que leva ao Resumo", () => {
  const pop = popBase({ origemModelo: { id: "comp-13" }, itensAConferir: [{ texto: "a", feito: true }, { texto: "b", feito: false }] });
  const itens = itensDasNotas([], pop, false, true);
  assert.equal(itens.length, 1);
  assert.match(itens[0].texto, /conferir os itens do modelo \(1 de 2 marcados\)/);
  assert.deepEqual(itens[0].acao, { rotulo: "Conferir", alvo: "conferencia" });
  const conferido = popBase({ origemModelo: { id: "comp-13" }, conferencia: { conferido: true }, itensAConferir: [{ texto: "a", feito: true }] });
  assert.deepEqual(itensDasNotas([], conferido, true, true), []);
});

test("3.2 a regra de aprovação e o bloqueio de segurança continuam exatamente como eram", () => {
  assert.deepEqual([...MODELOS_COM_BLOQUEIO], ["comp-13"]);
  assert.equal(MENSAGEM_BLOQUEIO_DE_APROVACAO, "Revise os itens de segurança antes de aprovar");
  const bloqueado = { origemModelo: { id: "comp-13" } };
  assert.equal(bloqueioDeAprovacao(bloqueado), MENSAGEM_BLOQUEIO_DE_APROVACAO);
  assert.equal(exigenciaDeAprovacao(bloqueado), "bloqueada");
  assert.equal(exigenciaDeAprovacao({ origemModelo: { id: "outro" } }), "confirmar");
  assert.equal(exigenciaDeAprovacao({}), "nenhuma");
  assert.equal(exigenciaDeAprovacao({ origemModelo: { id: "comp-13" }, conferencia: { conferido: true } }), "nenhuma");
});

test("3.2 'Aprovar' da lista abre o POP na pendência (conferência) quando não conferido; senão no Documento", () => {
  assert.deepEqual(destinoDoAprovar({ origemModelo: { id: "comp-13" } }), { aba: "resumo", alvo: "conferencia" });
  assert.deepEqual(destinoDoAprovar({ origemModelo: { id: "x" }, conferencia: { conferido: true } }), { aba: "documento" });
  assert.deepEqual(destinoDoAprovar({}), { aba: "documento" });
  const pops = ler("../components/pc/PcPops.tsx");
  assert.ok(pops.includes("destinoDoAprovar(alvoPop)") && pops.includes("alvoInicial={alvoInicial}"));
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("pdoc-bloqueio pdoc-bloqueio--link") && editor.includes("onClick={onIrParaConferencia}"), "o aviso do botão é clicável");
  assert.ok(editor.includes("pdoc-chip-conferir pdoc-chip-conferir--link") && editor.includes("pdoc-ir-conferir"));
  const ficha = ler("../components/pc/PcFichaPop.tsx");
  const resumo = ler("../components/pc/PcResumoDoPop.tsx");
  assert.ok(resumo.includes('id="ficha-conferir"') && resumo.includes("is-destaque") && ficha.includes("irParaAConferencia"));
  assert.match(ler("../app/globals.css"), /\.ficha-conferir\.is-destaque\{box-shadow:/);
});

test("3.1 topo do POP: Próxima ação na linha dos botões, abas de 36 px, selo 'Notas do modelo ▾' com painel neutro", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("{proximaAcaoNaBarra}") && editor.includes("{notasNaBarra}"));
  assert.ok(editor.indexOf("{proximaAcaoNaBarra}") < editor.indexOf("Imprimir / PDF"), "à esquerda dos botões");
  assert.ok(editor.includes("Notas do modelo") && editor.includes('aria-expanded={aberto}'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.ficha-aba\{min-height:36px\}/);
  assert.match(css, /\.pop-notas-painel\{[^}]*background:#EEF1F7/);
  assert.match(css, /\.pop-nota--pendencia\{border:1\.5px solid #21A3A3;background:#FFF6E5\}/);
  assert.match(css, /\.pdoc-proxima\{flex:1 1 280px/);
});

test("3.3 Identificação complementar: contagem, completo/pendente e pré-preenchimento do perfil do RT", () => {
  assert.equal(CAMPOS_DA_IDENTIFICACAO.length, 10);
  const vazio = Object.fromEntries(CAMPOS_DA_IDENTIFICACAO.map((campo) => [campo, ""]));
  assert.deepEqual(contarPreenchidos(vazio), { preenchidos: 0, total: 7 });
  assert.equal(resumoDaIdentificacao({ ...vazio, consultorNome: "Ana", elaboradoPor: " " }), "1 de 7 preenchidos");
  assert.equal(identificacaoCompleta(vazio), false);
  const cheio = Object.fromEntries(CAMPOS_DA_IDENTIFICACAO.map((campo) => [campo, "x"]));
  assert.equal(identificacaoCompleta(cheio), true);

  const rt = { nome: "Ana Souza", cargo: "Nutricionista", crn: "CRN-2 1234", telefone: "(51) 99999-0000" };
  const juntar = (cargo, crn) => [cargo, crn].filter(Boolean).join(" ");
  const novo = prefillDoPerfilDoRt({}, rt, juntar);
  assert.deepEqual(novo.valores, { consultorNome: "Ana Souza", consultorTelefone: "(51) 99999-0000", consultorRegistro: "Nutricionista CRN-2 1234" });
  assert.deepEqual(novo.doPerfil, ["consultorNome", "consultorTelefone", "consultorRegistro"]);
  // nunca sobrescreve o que foi digitado
  const digitado = prefillDoPerfilDoRt({ consultorNome: "Outra Pessoa", consultorTelefone: "  " }, rt, juntar);
  assert.equal(digitado.valores.consultorNome, undefined);
  assert.deepEqual(digitado.doPerfil, ["consultorTelefone", "consultorRegistro"]);
  // perfil sem dado: nada é preenchido
  assert.deepEqual(prefillDoPerfilDoRt({}, undefined, juntar), { valores: {}, doPerfil: [] });
  assert.deepEqual(semOCampo(["consultorNome", "consultorTelefone"], "consultorNome"), ["consultorTelefone"]);
  // CPF/CNPJ e endereço do RT não existem no perfil: ficam como estão
  assert.equal("consultorCpfCnpj" in novo.valores || "consultorEndereco" in novo.valores, false);
});

test("3.3 Identificação complementar: cartão recolhível, 3 colunas, campos de 40 px, selo 'do perfil do RT'", () => {
  // Rodada 3: a Identificação complementar vive em PcManualDocumento (acordeão, "N de 10", máscaras), no lugar do componente antigo.
  const c = ler("../components/pc/PcManualDocumento.tsx");
  assert.ok(c.includes("do perfil do RT") && c.includes("${preenchidos} de ${total}") && c.includes("man-jan"));
  const page = ler("../app/page.tsx");
  assert.ok(page.includes("<PcManualDocumento") && page.includes("prefillDoPerfilDoRt("));
  assert.equal(page.includes("camposIdentificacaoManual"), false);
});

test("3.3 Responsabilidades: linhas com caixa, texto de 1–2 linhas e Excluir; edição só ao clicar; grupos com 'N de M ativos'", () => {
  const resp = [
    { id: "1", papel: "Proprietário", descricao: "A", ativa: true },
    { id: "2", papel: "Proprietário", descricao: "B", ativa: false },
    { id: "3", papel: "Consultor/RT", descricao: "C", ativa: true },
  ];
  assert.deepEqual(ativosDoPapel(resp, "Proprietário"), { ativos: 1, total: 2 });
  assert.equal(textoDosAtivos(resp, "Proprietário"), "1 de 2 ativos");
  assert.equal(textoDosAtivos(resp, "Consultor/RT"), "1 de 1 ativos");
  assert.equal(textoCurtoDaResponsabilidade("  uma   frase\n curta "), "uma frase curta");
  assert.ok(textoCurtoDaResponsabilidade("x".repeat(500)).length <= 220);
  assert.match(textoCurtoDaResponsabilidade(""), /toque para escrever/);
  const c = ler("../components/ManualBaseFields.tsx");
  assert.ok(c.includes("respEmEdicao") && c.includes("gruposRecolhidos") && c.includes("textoDosAtivos") && c.includes('aria-label="Excluir responsabilidade"'));
  // IA e Falar só na edição
  const iVoz = c.indexOf("responsabilidade-${responsabilidade.id}");
  assert.ok(iVoz > c.indexOf("{editando && ("));
  const css = ler("../app/globals.css");
  assert.match(css, /\.resp-lista\{[^}]*overflow-y:auto/);
  assert.match(css, /\.resp-texto\{[^}]*-webkit-line-clamp:2/);
});

test("3.4 Lista de POPs: o vazio entre os filtros e 'Conjunto da norma' sai (16 px) e os botões continuam no topo", () => {
  const css = ler("../app/globals.css");
  const bloco = css.slice(css.indexOf("/* 3.4 Lista de POPs"));
  assert.match(bloco, /\.pgl-cabeca\{margin-bottom:4px\}/);
  assert.match(bloco, /\.pgl-lateral\{margin-bottom:-40px\}/);
  assert.match(bloco, /\.pgl-apoio\{min-height:0\}/);
  assert.match(css, /\.pgl-cabeca\{display:grid;grid-template-columns:minmax\(0,1fr\);align-items:start/, "alinhados ao topo");
});
