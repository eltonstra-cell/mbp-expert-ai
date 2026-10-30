import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { linhaDeProgressoDoAmbiente, quantidadeConcluida, resumoDaJanelaDeAmbientes, filtrarAmbientes } from "../lib/checklistEnvs.ts";
import { destinoDoAvanco } from "../lib/avancoAutomatico.ts";

const lerFonte = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");
const info = (nome, total, respondidos, extra = {}) => ({ nome, rotulo: nome, total, respondidos, naoConformes: 0, situacao: "pendente", geral: false, ...extra });

test("13a: linha de progresso do ambiente e resumo da janela", () => {
  const infos = [info("Recebimento", 5, 5), info("Estoque", 12, 5), info("Cozinha / Produção", 13, 3), info("Programas de Controle", 4, 0, { geral: true })];
  assert.equal(linhaDeProgressoDoAmbiente(infos, "Cozinha / Produção"), "Ambiente 3 de 3 · 3 de 13 respondidas · 23%");
  assert.equal(linhaDeProgressoDoAmbiente(infos, "Programas de Controle"), "Verificação geral · 0 de 4 respondidas · 0%");
  assert.equal(linhaDeProgressoDoAmbiente(infos, "inexistente"), "");
  assert.equal(quantidadeConcluida(infos), 1);
  assert.equal(resumoDaJanelaDeAmbientes(infos), "3 ambientes · 1 concluído");
  assert.equal(resumoDaJanelaDeAmbientes([info("A", 1, 1), info("B", 1, 1)]), "2 ambientes · 2 concluídos");
  assert.equal(filtrarAmbientes(infos, "cozi").length, 1);
});

const item = (id, ambiente, status = "Pendente") => ({ id, ambiente, status });

test("13b: avanço automático: dentro do ambiente vai ao próximo item", () => {
  const lista = [item("a1", "A"), item("a2", "A"), item("b1", "B")];
  const d = destinoDoAvanco(lista, "a1");
  assert.equal(d.alvo.id, "a2");
  assert.equal(d.trocouDeAmbiente, false);
});

test("13c: última pergunta do ambiente leva ao primeiro pendente do próximo ambiente", () => {
  const lista = [item("a1", "A", "Conforme"), item("a2", "A"), item("b1", "B", "Conforme"), item("b2", "B"), item("c1", "C")];
  const d = destinoDoAvanco(lista, "a2");
  assert.equal(d.alvo.id, "b2");
  assert.equal(d.trocouDeAmbiente, true);
  assert.equal(d.tudoRespondido, false);
});

test("13d: ambiente seguinte já respondido: abre o primeiro item dele", () => {
  const lista = [item("a1", "A"), item("b1", "B", "Conforme"), item("b2", "B", "Conforme")];
  assert.equal(destinoDoAvanco(lista, "a1").alvo.id, "b1");
});

test("13e: sobrou pergunta sem resposta antes dela no mesmo ambiente: volta a ela em vez de pular o ambiente", () => {
  const lista = [item("a1", "A"), item("a2", "A"), item("b1", "B")];
  const d = destinoDoAvanco(lista, "a2");
  assert.equal(d.alvo.id, "a1");
  assert.equal(d.trocouDeAmbiente, false);
});

test("13f: último item da visita: sem alvo e, sem pendências, tudo respondido", () => {
  const completo = [item("a1", "A", "Conforme"), item("a2", "A")];
  const d = destinoDoAvanco(completo, "a2");
  assert.equal(d.alvo, null);
  assert.equal(d.tudoRespondido, true);
  const faltando = [item("a1", "A"), item("a2", "A")];
  // a1 ainda pendente: volta a ela, e nada está concluído
  assert.equal(destinoDoAvanco(faltando, "a2").tudoRespondido, false);
  assert.equal(destinoDoAvanco(faltando, "nao-existe").alvo, null);
});

test("13g: telas ligadas à janela, ao seletor e às linhas novas", () => {
  const pc = lerFonte("components/pc/PcChecklist.tsx");
  assert.equal(pc.includes("chk-secoes"), false);
  assert.ok(pc.includes("AmbientesCortina") && pc.includes("linhaDeProgressoDoAmbiente"));
  const foco = lerFonte("components/ChecklistFocoItem.tsx");
  assert.ok(foco.includes("chk-amb-botao") && foco.includes("chk-pergunta-barra") && foco.includes("Pergunta {indice + 1} de {fila.length}"));
  const janela = lerFonte("components/AmbientesCortina.tsx");
  assert.ok(janela.includes('placeholder="Buscar ambiente"') && janela.includes("createPortal") && janela.includes('aria-modal="true"'));
  const inicio = lerFonte("components/pc/PcInicio.tsx");
  assert.ok(inicio.includes("Vencimentos em 30 dias") && inicio.includes("cartao.divergencia"));
  const page = lerFonte("app/page.tsx");
  assert.ok(page.includes("destinoDoAvanco(lista, item.id)") && page.includes("Checklist concluído."));
});

test("13h: CSS da janela (linhas de 44 px, atual #E3F4F4, painel à direita só a partir de 1100 px)", () => {
  const css = lerFonte("app/globals.css");
  assert.ok(css.includes("height:44px;padding:0 20px 0 17px"));
  assert.ok(css.includes(".amb-janela-linha.is-atual{border-left-color:#21A3A3;background:#E3F4F4"));
  assert.ok(/html:root:root body .amb-janela{position:fixed;inset:auto 0 0 0/.test(css) && css.includes("html:root:root body .amb-janela{inset:0 0 0 auto;width:min(520px,100vw)"));
  assert.ok(css.includes(".amb-janela-fundo{position:fixed;inset:0;"));
  // Rodada 14: respostas do PC com 16 px e texto preto; Salvar e próximo compacto; Ver fonte
  assert.ok(css.includes('.chk-foco-botoes .chk-resp:not(.is-marcado),html:not([data-modo="campo"]):root:root body .chk-foco-botoes .chk-resp:not(.is-marcado) span{color:#000}'));
  assert.ok(css.includes("ui-btn.ui-btn--save{flex:none;width:auto;max-width:none;height:44px"));
  const campoItem = lerFonte("components/ChecklistFocoItem.tsx");
  assert.ok(campoItem.includes('className="chk-fonte-ver"') && campoItem.includes("fonteParaExibir(item.referencia) !== SEM_FONTE"));
});
