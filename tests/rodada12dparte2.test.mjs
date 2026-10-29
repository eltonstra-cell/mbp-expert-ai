import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { correcoesDoInicio, textoDoPrazoDaCorrecaoDoInicio } from "../lib/inicio.ts";
import { DIAS_DA_VISITA_ATRASADA, rotuloDoBotaoDaVisita, situacaoDaLinhaDeVisita } from "../lib/visitasLista.ts";
import { mostrarVoltar } from "../lib/historicoDeTelas.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const HOJE = "2026-10-29";
const nc = (id, extra = {}) => ({ id, empresaId: "e1", status: "Aberta", prazo: "", titulo: `Correção ${id}`, ambiente: "", ...extra });

test("Início: o prazo da correção diz 'venceu há N dias', 'vence hoje', 'vence em N dias' ou 'aberta'", () => {
  assert.deepEqual(textoDoPrazoDaCorrecaoDoInicio("2026-08-30", HOJE), { vencida: true, texto: "venceu há 60 dias", dias: -60 });
  assert.equal(textoDoPrazoDaCorrecaoDoInicio("2026-10-28", HOJE).texto, "venceu há 1 dia");
  assert.equal(textoDoPrazoDaCorrecaoDoInicio("2026-10-29", HOJE).texto, "vence hoje");
  assert.equal(textoDoPrazoDaCorrecaoDoInicio("2026-10-30", HOJE).texto, "vence em 1 dia");
  assert.equal(textoDoPrazoDaCorrecaoDoInicio("", HOJE).texto, "aberta");
  assert.equal(textoDoPrazoDaCorrecaoDoInicio("", HOJE).vencida, false);
});

test("Início: todas as correções abertas da empresa, vencidas primeiro, ambiente curto e sem a palavra Correção na linha", () => {
  const lista = correcoesDoInicio(
    [
      nc("sem", { ambiente: "Cozinha" }),
      nc("proxima", { prazo: "2026-11-02", ambiente: "Estoque seco" }),
      nc("velha", { prazo: "2026-08-30", ambiente: "Recebimento, estoque" }),
      nc("recente", { prazo: "2026-10-20", ambiente: "Recebimento" }),
      nc("resolvida", { status: "Resolvida", prazo: "2026-08-01" }),
      nc("outra", { empresaId: "e2", prazo: "2026-08-01" }),
      nc("cancelada", { canceladaPeloUsuarioEm: "2026-09-01T00:00:00Z" }),
      nc("inativa", { inativaNoChecklist: true }),
    ],
    "e1",
    HOJE
  );
  assert.deepEqual(lista.map((item) => item.id), ["velha", "recente", "proxima", "sem"]);
  assert.equal(lista[0].linhaDeBaixo, "Recebimento · venceu há 60 dias");
  assert.equal(lista[0].vencida, true);
  assert.equal(lista[3].linhaDeBaixo, "Cozinha · aberta");
  assert.ok(lista.every((item) => !/correção/i.test(item.linhaDeBaixo)));
  assert.equal(correcoesDoInicio([nc("a", { prazo: "2026-09-01" })], "e1", HOJE)[0].linhaDeBaixo, "venceu há 58 dias", "sem ambiente só o prazo");
});

test("Visitas: situação da linha (60 dias fixos) e botão Iniciar / Continuar / Finalizar", () => {
  assert.equal(DIAS_DA_VISITA_ATRASADA, 60);
  const sit = (percentual, diasAberta, status = "Em andamento") => situacaoDaLinhaDeVisita({ status, percentual, diasAberta });
  assert.equal(sit(100, 3), "pronta");
  assert.equal(sit(100, 90), "pronta", "pronta para finalizar vale mesmo se antiga");
  assert.equal(sit(40, 60), "andamento", "exatamente 60 dias ainda é âmbar");
  assert.equal(sit(40, 61), "atrasada");
  assert.equal(sit(0, 10), "nova");
  assert.equal(sit(0, 80), "atrasada");
  assert.equal(sit(100, 5, "Concluída"), "concluida");
  assert.equal(rotuloDoBotaoDaVisita(sit(0, 5), 0), "Iniciar");
  assert.equal(rotuloDoBotaoDaVisita(sit(0, 80), 0), "Iniciar");
  assert.equal(rotuloDoBotaoDaVisita(sit(40, 5), 40), "Continuar");
  assert.equal(rotuloDoBotaoDaVisita(sit(100, 5), 100), "Finalizar");
});

test("Visitas e Início são telas de entrada: sem seta de voltar", () => {
  assert.equal(mostrarVoltar({ view: "visitas" }), false);
  assert.equal(mostrarVoltar({ view: "inicio" }), false);
  assert.equal(mostrarVoltar({ view: "correcoes" }), true);
});

test("Visitas: sem a busca própria, abas com contadores coloridos e botões por situação", () => {
  const tela = ler("../components/pc/PcVisitas.tsx");
  assert.ok(!tela.includes("Buscar empresa ou responsável") && !tela.includes('type="search"'));
  for (const tom of ["todas", "andamento", "concluida", "arquivada"]) assert.ok(tela.includes(`tom: "${tom}"`), tom);
  assert.ok(tela.includes("rotuloDoBotaoDaVisita(situacao, visita.percentual)") && tela.includes("onConcluir(visita.id)"), "Finalizar usa o encerramento já existente");
  assert.ok(tela.includes("vis-abrir-linha") && tela.includes("vis-seta"), "celular: linha inteira clicável com ›");
  const css = ler("../app/globals.css");
  for (const regra of [
    "html:root:root body .vis-faixa--pend{background:#E0A800}",
    "html:root:root body .vis-faixa--atrasada{background:#C83F45}",
    "html:root:root body .vis-faixa--ok{background:#21805B}",
    "html:root:root body .vis-linha .ui-progress-fill--brand{background:#21A3A3}",
    "html:root:root body .vis-linha .ui-progress-fill--ok{background:#21805B}",
  ]) assert.ok(css.includes(regra), regra);
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("diasAberta: diasDeVisitaAberta(v.data, hojeISO())"));
});

test("Início: cartão único, até 3 correções, janela com abas e rodapé fixo; mesmo Início nos três tamanhos", () => {
  const inicio = ler("../components/pc/PcInicio.tsx");
  assert.ok(inicio.includes("export const LINHAS_DE_CORRECAO = 3"));
  assert.ok(inicio.includes("Continuar de onde parei") && inicio.includes("Continuar →") && inicio.includes("`Outras visitas (${outrasVisitas})`"));
  assert.ok(inicio.includes("Hoje precisa de você") && inicio.includes("`Ver todas as correções (${itens.length})`"));
  assert.ok(!inicio.includes("PENDÊNCIAS"));
  for (const aba of ['"Todas"', '"Vencidas"', '"Abertas"']) assert.ok(inicio.includes(`rotulo: ${aba}`), aba);
  assert.ok(inicio.includes("Abrir Correções →") && inicio.includes('evento.key === "Escape"') && inicio.includes('aria-label="Fechar"'));
  const css = ler("../app/globals.css");
  assert.ok(css.includes("html:root:root body .ini-gaveta{position:relative;display:flex;flex-direction:column"));
  assert.ok(css.includes("html:root:root body .ini-gaveta-lista{display:flex;flex:1 1 auto;flex-direction:column;gap:8px;min-height:0;overflow-y:auto"), "a lista rola por dentro");
  assert.ok(css.includes("@media (min-width:1100px){\n  html:root:root body .ini-gaveta-camada{align-items:stretch;justify-content:flex-end}"), "PC: painel à direita");
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("const inicioElemento = ("));
  assert.ok(pagina.includes("ordenarRecentes(visitasSemArquivadas.filter((visita) => visita.empresaId === atual?.id && visita.status === \"Em andamento\"))"));
  assert.ok(pagina.includes("progressoDoChecklist(visita.checklist).percentual < 100"), "visita 100% não ganha cartão");
});
