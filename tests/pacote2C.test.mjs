import assert from "node:assert/strict";
import test from "node:test";

import { folhaDoPop, secoesDoEditor, textoDasSecoes } from "../lib/popDocumento.ts";

const popBase = (conteudo, extra = {}) => ({ codigo: "POP-01", titulo: "Higienização", versao: "1.2", status: "Rascunho", conteudo, ...extra });

test("C1: seções do editor mostram 'N de M preenchidas' e passo em branco deixa a seção incompleta", () => {
  const completo = { objetivo: "x", responsavelExecucao: { nome: "A", cargo: "B" }, frequencia: "diária", passos: [{ id: "1", texto: "a" }], acaoCorretiva: "y" };
  const secoes = secoesDoEditor(popBase(completo));
  assert.equal(secoes.length, 6);
  assert.equal(textoDasSecoes(secoes), "6 de 6 preenchidas");
  const comBranco = secoesDoEditor(popBase({ ...completo, passos: [{ id: "1", texto: "a" }, { id: "2", texto: " " }] }));
  assert.equal(comBranco.find((secao) => secao.id === "passos").preenchida, false);
  assert.equal(textoDasSecoes(comBranco), "5 de 6 preenchidas");
  assert.equal(textoDasSecoes([{ preenchida: true }]), "1 de 1 preenchida");
  const comExtra = secoesDoEditor(popBase({ ...completo, pragas: { preventivas: "a", corretivas: "", comprovanteEmpresa: "" } }), { bloco: "pragas" });
  assert.equal(comExtra.length, 7);
  assert.equal(comExtra[6].preenchida, false);
});

test("C1: folha do POP em leitura e na pré-visualização (passo em branco só aparece na prévia)", () => {
  const conteudo = { objetivo: "Manter limpo", responsavelExecucao: { nome: "Elton", cargo: ", Nutricionista RT" }, frequencia: "diária", passos: [{ id: "1", texto: "Limpar" }, { id: "2", texto: "" }], acaoCorretiva: "Repetir" };
  const aprovacao = { nome: "Elton", cargo: "Nutricionista RT", em: "2026-10-21T15:00:00.000Z" };
  const leitura = folhaDoPop(popBase(conteudo, { status: "Aprovado", versao: "1.1", aprovacao }), { nome: "Padaria", cnpj: "44150273000198" });
  assert.equal(leitura.direita, "POP-01 · versão 1.1");
  assert.equal(leitura.esquerda, "Padaria · CNPJ 44150273000198");
  assert.equal(leitura.situacao, "Aprovada por Elton, Nutricionista RT, em 21/10/2026");
  assert.deepEqual(leitura.blocos.find((bloco) => bloco.titulo === "Passos").linhas, ["Limpar"]);
  assert.deepEqual(leitura.blocos.find((bloco) => bloco.titulo === "Responsável e frequência").linhas, ["Elton, Nutricionista RT · diária"]);
  const previa = folhaDoPop(popBase(conteudo), { nome: "Padaria" }, { marcarBranco: true });
  assert.deepEqual(previa.blocos.find((bloco) => bloco.titulo === "Passos").linhas, ["Limpar", "(em branco)"]);
  assert.equal(previa.situacao, "Rascunho · v1.2");
});

import { readFileSync } from "node:fs";
import { gravarGruposAlternados, grupoRecolhido, lerGruposAlternados } from "../lib/visitasLista.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("C2: empresa ativa começa aberta e as outras recolhidas; alternar inverte", () => {
  assert.equal(grupoRecolhido(true, false), false);
  assert.equal(grupoRecolhido(false, false), true);
  assert.equal(grupoRecolhido(true, true), true);
  assert.equal(grupoRecolhido(false, true), false);
  const guardado = {};
  const armazem = { getItem: (k) => guardado[k] ?? null, setItem: (k, v) => { guardado[k] = v; } };
  assert.deepEqual(lerGruposAlternados(armazem), []);
  gravarGruposAlternados(["a", "b"], armazem);
  assert.deepEqual(lerGruposAlternados(armazem), ["a", "b"]);
  assert.deepEqual(lerGruposAlternados({ getItem: () => { throw new Error("sem acesso"); }, setItem: () => {} }), []);
});

test("C2: lista de visitas sem chip repetido, com contadores e aviso em terra; o limite foi para Administração", () => {
  const tela = ler("../components/pc/PcVisitas.tsx");
  assert.ok(tela.includes("vis-aviso-terra") && tela.includes("vis-col-contagem") && tela.includes("vis-chip-ativa"));
  assert.ok(!tela.includes("Avisar visita aberta") && !tela.includes("onNovaDaEmpresa"), "o aviso saiu da barra e Nova visita só fica no topo");
  assert.ok(tela.includes("{concluida && <Pill tom=\"ok\">Concluída</Pill>}") && !tela.includes("visita.status}</Pill>"));
  const config = ler("../components/pc/ConfiguracaoDeVisitas.tsx");
  assert.ok(config.includes("Avisar visita aberta após") && config.includes("podeEditar"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("<ConfiguracaoDeVisitas") && pagina.includes('perfil === "Administrador"'));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".vis-aviso-terra{padding:1px 10px;border-radius:999px;background:#B35A36") && css.includes(".vis-rolagem::-webkit-scrollbar"));
});

test("C1: Documento tem leitura com Imprimir/PDF e Editar, e edição em três colunas com rodapé fixo", () => {
  const editor = ler("../components/pc/PcPopEditor.tsx");
  assert.ok(editor.includes("Imprimir / PDF") && editor.includes("Editar (cria nova versão)") && editor.includes("pdoc-previa") && editor.includes("pdoc-secoes"));
  assert.ok(editor.includes("Pré-visualização da folha") && editor.includes("Motivo da nova versão (opcional)") && editor.includes("Enviar para aprovação"));
  assert.ok(editor.includes("Salvar rascunho") && editor.includes("limparPassosEmBranco(passos)"), "salvar rascunho segue descartando passo em branco");
  assert.ok(editor.includes("setTocado(true); if (faltas.length === 0 && !erroTitulo) onEnviar(rascunho)"), "enviar para aprovação segue validando");
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".pdoc-rodape{position:sticky;bottom:0") && css.includes("#pop-folha,#pop-folha *{visibility:visible}"));
});
