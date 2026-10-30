import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { prazoParaExibir, textoDoPrazo, prazoSugerido } from "../lib/actionPlan.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("prazo da lista de correções: o gravado em dias a partir de hoje; sem prazo, o sugerido pela gravidade (7, 15 ou 30)", () => {
  const hoje = "2026-10-22";
  assert.deepEqual(prazoParaExibir({ prazo: "", gravidade: "Crítica" }, hoje), { dias: 7, sugerido: true });
  assert.deepEqual(prazoParaExibir({ prazo: "", gravidade: "Importante" }, hoje), { dias: 15, sugerido: true });
  assert.deepEqual(prazoParaExibir({ prazo: "", gravidade: "Rotina" }, hoje), { dias: 30, sugerido: true });
  assert.equal(prazoParaExibir({ prazo: "", gravidade: "Crítica" }, hoje).dias, prazoSugerido("Crítica", hoje).dias);
  assert.deepEqual(prazoParaExibir({ prazo: "2026-10-27", gravidade: "Importante" }, hoje), { dias: 5, sugerido: false });
  assert.equal(prazoParaExibir({ prazo: "2026-10-20", gravidade: "Importante" }, hoje).dias, -2);
});

test("texto do prazo: 'prazo em N dias' no tablet, 'N dias' no celular, vencido e hoje", () => {
  assert.equal(textoDoPrazo(7, false), "prazo em 7 dias");
  assert.equal(textoDoPrazo(7, true), "7 dias");
  assert.equal(textoDoPrazo(1, false), "prazo em 1 dia");
  assert.equal(textoDoPrazo(0, false), "prazo hoje");
  assert.equal(textoDoPrazo(0, true), "hoje");
  assert.equal(textoDoPrazo(-3, false), "vencido há 3 dias");
  assert.equal(textoDoPrazo(-1, true), "vencido há 1 dia");
});

test("Evidências: sem o botão Falar na descrição (só IA), Áudio grava e guarda; formulário num cartão de altura do conteúdo", () => {
  const tela = ler("../components/pc/PcEvidencias.tsx");
  assert.ok(/fieldKey="evidencia-descricao"\s+semVoz/.test(tela), "a descrição usa só o botão IA");
  assert.ok(tela.includes('className="ev7-cartao"') && tela.includes("rotuloDaVisita"));
  assert.ok(tela.includes('tipo: "Áudio"'), "o Áudio continua guardado como evidência");
  const voz = ler("../components/FieldVoiceTools.tsx");
  assert.ok(voz.includes("semVoz?: boolean") && voz.includes("{!semVoz && ("));
  const css = ler("../app/globals.css");
  assert.ok(css.includes("html:root:root body .ev7 .ev7-cap--audio{background:#B4491C;color:#fff}"));
  assert.ok(css.includes("html:root:root body .ev7 .ev7-cap--foto{background:#168080;color:#fff}"));
  assert.ok(css.includes("background:#2874DB;color:#fff;font-size:15px"), "IA em #2874DB");
});

test("Correções (Campo): contadores coloridos, sem título repetido e sem número duplicado na aba; barra de baixo = total da empresa", () => {
  const campo = ler("../components/campo/CampoTelas.tsx");
  assert.ok(campo.includes('<h1 className="sr-only">Correções</h1>') && !campo.includes("nenhuma com plano ainda"));
  assert.ok(campo.includes("textoDoPrazo(prazoParaExibir(item, hoje).dias, false)") && campo.includes("nomeCurtoDoAmbiente(linha.ambiente)"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("correcoesAbertas={ncsVencidasDaEmpresa}"), "Rodada 12d parte 2: o número da barra é o total de correções abertas da empresa, o mesmo do menu e de \"Ver todas\"");
  const css = ler("../app/globals.css");
  for (const cor of ["#C83F45", "#8A5A00", "#2874DB", "#21805B"]) assert.ok(css.includes(`.campo-fluxo-item--${{ "#C83F45": "nc", "#8A5A00": "pend", "#2874DB": "info", "#21805B": "ok" }[cor]}{color:${cor}}`), cor);
});

test("Empresas (Campo): sem botão Selecionar, linha toda seleciona, pendência em uma linha com reticências, sem contagens no celular", () => {
  const tela = ler("../components/campo/CampoEmpresas.tsx");
  assert.ok(tela.includes("onClick={(evento) => aoTocarNaLinha(evento, empresa)}") && !tela.includes("cemp-sel"));
  const css = ler("../app/globals.css");
  assert.ok(css.includes("cemp-falta{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}"));
  assert.ok(css.includes("body .cemp-sub{display:none}"));
  assert.ok(css.includes("border-left:4px solid #21A3A3"));
});

test("Checklist PC: seções à esquerda, números numa linha só; celular: fonte vazia escondida só em Não conforme", () => {
  const pc = ler("../components/pc/PcChecklist.tsx");
  // Rodada 13: as seções saíram da coluna da esquerda; o seletor "Cozinha / Produção ▾" abre a janela de ambientes.
  assert.ok(!pc.includes("chk-secoes") && pc.includes("chk-pc-ambiente-conta") && pc.includes("chk-amb-botao"));
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes("naoConforme && rotuloDaFonte(item.referencia) === \"Fonte não registrada\""));
  const css = ler("../app/globals.css");
  assert.ok(css.includes("html:root:root body .chk-pc-linha .chk-pc-fila{flex-wrap:nowrap"));
});

test("Visitas: contadores das abas coloridos", () => {
  const visitas = ler("../components/pc/PcVisitas.tsx");
  assert.ok(visitas.includes('tom: "andamento"') && visitas.includes('tom: "concluida"'));
  assert.ok(ler("../components/ui/SegmentedTabs.tsx").includes("data-tom={aba.tom}"));
});
