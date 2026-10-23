import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { vencem } from "../lib/plural.ts";
import { resumoCurtoDosSetores } from "../lib/manualBase.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("painel Hoje: tipo em cada item, sem chip 'Vencido' redundante e '1 vence' no singular", () => {
  const painel = ler("../components/PainelHoje.tsx");
  assert.ok(painel.includes("TIPO[item.origem]") && painel.includes("hoje-tipo"));
  for (const tipo of ["Correção", "Comprovante", "Capacitação", "POP"]) assert.ok(painel.includes(`"${tipo}"`), tipo);
  // a etiqueta de situação só aparece para "aguardando"; vencido e vence em breve já têm faixa de cor e prazo
  assert.ok(painel.includes('item.situacao === "aguardando" && <Pill'));
  assert.ok(painel.includes("vencem(painel.vencemEm30Dias)"));
  assert.equal(vencem(1), "1 vence");
  assert.equal(vencem(2), "2 vencem");
  assert.ok(!painel.includes("POR_PAGINA"), "lista rola por dentro, sem paginar");
});

test("Quem leu: a data da leitura entra no formulário de Registrar leitura, sem campo solto nem paginação", () => {
  const tela = ler("../components/pc/PcTreinamentoDoPop.tsx");
  assert.ok(tela.includes("Salvar leitura") && tela.includes("Data da leitura") && tela.includes("registrando === linha.colaborador.id"));
  assert.ok(!tela.includes("POR_PAGINA"));
  // o campo da data só existe dentro do formulário aberto na linha
  assert.ok(tela.indexOf("Data da leitura") > tela.indexOf("registrando === linha.colaborador.id"));
  assert.ok(!ler("../components/pc/PcRegistrosDoPop.tsx").includes("POR_PAGINA"));
});

test("questionário: mostra todas as perguntas numa lista que rola por dentro, com título e botões fixos", () => {
  const tela = ler("../components/pc/PcQuestionario.tsx");
  assert.ok(!tela.includes("POR_PAGINA") && !tela.includes("Páginas das perguntas"));
  assert.ok(tela.includes("quest-rolagem") && tela.includes("quest-intro") && tela.includes("quest-etiqueta-nova"));
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".quest-rolagem{flex:1;min-height:0;overflow-y:auto") && css.includes(".quest-intro{margin:0"));
  assert.ok(!css.includes(".quest-nova{display:inline-flex"), "o chip novo não usa o nome da caixa de nova pergunta");
});

test("modal de emissão: exemplo real, frase inteira, motivo sem erro ao abrir e cargo na assinatura", () => {
  const modal = ler("../components/pc/PcEmitirRelatorio.tsx");
  assert.ok(modal.includes("PC-2026-0042") && !modal.includes("PC-AAAA-NNNN"));
  assert.ok(modal.includes("pc-modal-texto") && modal.includes("mostrarErro") && modal.includes("motivoTocado"));
  assert.ok(modal.includes("Responsável técnico"));
});

test("lista de relatórios emitidos mostra o motivo da versão; o caminho do topo diz onde a pessoa está", () => {
  const lista = ler("../components/pc/PcRelatoriosEmitidos.tsx");
  assert.ok(lista.includes("Motivo da versão {item.versao}: {item.motivoDaNovaVersao}"));
  const pagina = ler("../app/page.tsx");
  for (const rotulo of ["Relatórios emitidos", "Dossiê", "Evolução", "Resumo de uma página", "Fila de envio", "Central da Empresa"]) assert.ok(pagina.includes(`? "${rotulo}"`), rotulo);
});

test("dossiê: caixas maiores, contagem por item e aviso quando o resultado fica fora da tela", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".dossie-opcao input{flex:none;width:22px;height:22px"));
  const tela = ler("../components/pc/PcDossie.tsx");
  assert.ok(tela.includes("dossie-aviso") && tela.includes("scrollIntoView") && tela.includes("dossie-indice-contagem"));
});

test("comprovante: sugestão em cinza e erro com fundo branco (nada de amarelo empilhado)", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".comp-sugestao{display:flex;flex-wrap:nowrap;align-items:center;justify-content:space-between;gap:8px;padding:6px 10px;border:1px solid #B4C2CE;border-radius:10px;background:#EEF1F5"));
  assert.ok(css.includes(".ui-input.is-invalid{border-color:#D93A3A;background:#fff}"));
});

test("fonte e contraste no PC: rótulos escuros sem maiúsculas, borda #B4C2CE e base de 15 px (celular intacto)", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".ui-input,.ui-input--lista{border-color:#B4C2CE}"));
  assert.ok(css.includes("text-transform:none;color:#12202B}"));
  assert.ok(css.includes(':is(html[data-modo="completo"],html[data-modo="equilibrado"]) .pc-offset{font-size:15px}'));
  assert.ok(!css.includes('html[data-modo="campo"] .pc-offset{font-size:15px}'));
});

test("seleção em creme com borda dourada; checklist com nome em destaque e contador menor; roteiro sem corte", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes(".pc-env-pill.is-active,.pc-env-cell.is-active,.pc-env-panel .pc-env-cell.is-active,.chk-pc-aba.is-on{border-color:#E8B04B;background:#FEF6E6"));
  assert.ok(css.includes(".chk-sel-nome{font-family:var(--font-display)") && css.includes(".chk-sel-pos{padding:0 8px;font-family:inherit;font-size:.8rem"));
  assert.ok(css.includes(".pc-route-name{flex:1 1 220px;overflow:visible;text-overflow:clip;white-space:normal"));
  assert.equal(resumoCurtoDosSetores(["Central de gás", "Churrasqueira"]), "1 do modelo · 1 da empresa");
});

test("botões azuis grandes trocados: Salvar verde, Adicionar e Criar visita em laranja", () => {
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('className="ui-btn ui-btn--criar nv-criar"') && pagina.includes("Criar visita"));
  assert.ok(!pagina.includes("Salvar e voltar à Central"));
  const base = ler("../components/ManualBaseFields.tsx");
  assert.ok(base.includes('className="ui-btn ui-btn--criar cad-adicionar">Adicionar') && !base.includes("bg-[var(--brand)] px-4 py-3"));
  assert.ok(ler("../components/pc/PcAmbientes.tsx").includes('className="ui-btn ui-btn--criar" disabled={!novoNome'));
});
