import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { LIMITES_DE_TEMPERATURA, limiteDoTipo, linhasDeTemperaturaDoRelatorio } from "../lib/limitesDeTemperatura.ts";
import { seloDeSincronizacao } from "../lib/conexao.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("rodapé fixo: topo e rodapé fixos, corpo do item rola por dentro, e a altura da tela desconta faixas e o botão Registrar", () => {
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes('className="chk-foco-topo"') && item.includes('className="chk-foco-corpo"') && item.includes('className="chk-foco-rodape"'));
  assert.ok(item.indexOf('className="chk-foco-corpo"') < item.indexOf('className="chk-foco-rodape"'));
  const css = ler("../app/globals.css");
  assert.match(css, /\.chk-foco-corpo\{[^}]*flex:1 1 auto;[^}]*min-height:0;[^}]*overflow-y:auto/);
  assert.match(css, /\.chk-foco-rodape\{flex:none;/);
  assert.match(css, /html\[data-modo="campo"\] \.campo-tela--fixa\{height:calc\(100dvh - 176px - 26px - var\(--faixas-h,0px\)/);
  const page = ler("../app/page.tsx");
  assert.ok(page.includes("<ReservaDeAltura>") && page.includes("</ReservaDeAltura>"));
});

test("'O que verificar' aberto empurra o conteúdo (não é posicionado por cima do campo)", () => {
  const css = ler("../app/globals.css");
  const ultimo = css.lastIndexOf(".chk-apoio-linha.is-aberta .chk-apoio-corpo{position:static");
  assert.ok(ultimo > css.lastIndexOf(".chk-apoio-linha.is-aberta .chk-apoio-corpo{position:absolute"));
});

test("selo de sincronização: texto curto e cor com função", () => {
  assert.deepEqual(
    [
      seloDeSincronizacao({ online: true, syncStatus: "sincronizado", pendentes: 0 }),
      seloDeSincronizacao({ online: false, syncStatus: "sincronizado", pendentes: 0 }),
      seloDeSincronizacao({ online: false, syncStatus: "sincronizado", pendentes: 3 }),
      seloDeSincronizacao({ online: true, syncStatus: "sincronizado", pendentes: 2 }),
      seloDeSincronizacao({ online: true, syncStatus: "erro", pendentes: 0 }),
    ].map((s) => [s.estado, s.rotulo]),
    [["ok", "Sincronizado"], ["sem-sinal", "Sem sinal"], ["sem-sinal", "Sem sinal · 3"], ["pendente", "2 pendentes"], ["erro", "Erro ao enviar"]]
  );
  const css = ler("../app/globals.css");
  assert.match(css, /\.campo-sync\.is-sem-sinal\{background:#FFD8A8\}/);
  assert.match(css, /\.campo-sync\.is-erro\{background:#D93A3A;color:#fff\}/);
});

test("selo com texto no topo do celular, com o nome da página; a frase do sem sinal aparece ao tocar no selo (sem faixa repetida)", () => {
  const page = ler("../app/page.tsx");
  assert.equal(page.includes('<div className="faixa-fina" role="status">Sem sinal'), false, "a faixa que repetia o selo saiu");
  assert.ok(page.includes("Sem sinal · alterações guardadas neste aparelho. Elas são enviadas quando a conexão voltar."));
  assert.ok(page.includes("titulo={TITULO_DA_TELA_NO_CAMPO[view] || \"\"}"));
  const campo = ler("../components/campo/CampoTelas.tsx");
  assert.ok(campo.includes("campo-head-pagina") && campo.includes("campo-sync-texto"));
});

test("botões: resposta com 40 px em uma linha, gravidade em contorno, Falar e IA sem texto longo sem sinal", () => {
  const css = ler("../app/globals.css");
  assert.match(css, /html\[data-modo\] \.chk-resp\{height:40px;min-height:40px;/);
  assert.match(css, /\.chk-grav-linha \.chk-grav\{min-height:40px;[^}]*border:2px solid var\(--grav\);background:#fff/);
  const voz = ler("../components/FieldVoiceTools.tsx");
  assert.ok(voz.includes("voz-semsinal"));
  assert.equal(/linhaInicio[\s\S]{0,40}Precisa de internet/.test(voz), false);
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes('ehItemDeTemperatura(item.titulo) ? "Ex.: termômetro a 9 °C" : campo ? "Observação" : ""'), "o placeholder não repete o rótulo (só o Campo, sem rótulo, usa 'Observação')");
});

test("relatório: temperatura classificada pelo app imprime valor, limite e a marca; resposta trocada pelo RT também é dita", () => {
  const checklist = [
    { ambiente: "Câmara fria", titulo: "Temperatura da câmara", status: "Não Conforme", temperatura: { valor: 7, limiteId: "refrigerado" } },
    { ambiente: "Câmara fria", titulo: "Temperatura de um item", status: "Conforme", temperatura: { valor: 7, limiteId: "refrigerado" } },
    { ambiente: "Cozinha", titulo: "Piso", status: "Conforme" },
  ];
  const linhas = linhasDeTemperaturaDoRelatorio(checklist);
  assert.equal(linhas.length, 2);
  assert.match(linhas[0], /7 °C · limite até 5 °C \(Portaria SES\/RS nº 799\/2023, item 10\.09, 10\.8, 11\.2 b, 12\.2 a, conferido em \d{2}\/\d{2}\/\d{4}\) · classificado pelo app, confirmado pelo RT\./);
  assert.match(linhas[1], /o app indicou Não conforme; o RT respondeu Conforme\./);
  const page = ler("../app/page.tsx");
  assert.ok(page.includes("temperaturas-do-relatorio") && page.includes("linhasDeTemperaturaDoRelatorio(visitaAtual.checklist"));
});

test("limites: divergência do 'mantido a quente' e ressalva do 10.3 ficam na fonte; todos com fonte e data", () => {
  assert.match(limiteDoTipo("quente").observacaoDaFonte, /11\.2 a e 12\.2 b[\s\S]*maior ou igual a 60[\s\S]*10\.7[\s\S]*superior a 60/);
  assert.match(limiteDoTipo("tratamento-termico").observacaoDaFonte, /inferiores a 70/);
  for (const limite of LIMITES_DE_TEMPERATURA) assert.ok(limite.conferidoEm === "2026-10-23" && limite.link.includes("portaria-ses-799-2023"));
  assert.deepEqual([limiteDoTipo("tratamento-termico").valor, limiteDoTipo("reaquecimento").valor, limiteDoTipo("fritura").valor], [70, 75, 180]);
});

test("a faixa 'Ambiente X de Y · Próximo' também aparece no item do celular, com Pular ambiente", () => {
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes("textoDaCaminhada(caminhada)") && item.includes("Pular ambiente"));
  assert.match(ler("../app/globals.css"), /\.campo-tela \.chk-foco-count\{display:block/);
});

test("selo: 'Sincronizado' só com as duas filas vazias; falha de foto vira 'Erro ao enviar' (vermelho)", () => {
  const s = (entrada) => seloDeSincronizacao({ online: true, syncStatus: "sincronizado", pendentes: 0, ...entrada });
  assert.equal(s({}).rotulo, "Sincronizado");
  assert.equal(s({ pendentes: 1 }).rotulo, "1 pendente");
  assert.deepEqual([s({ pendentes: 1, falhas: 1 }).estado, s({ pendentes: 1, falhas: 1 }).rotulo], ["erro", "Erro ao enviar"]);
  assert.match(s({ pendentes: 2, falhas: 2 }).dica, /Toque para ver e enviar agora/);
});

test("evidências no celular: aviso de IA uma vez no topo, título curto com nome completo no title, botão baixo e 'Enviar agora'", () => {
  const ev = ler("../components/pc/PcEvidencias.tsx");
  assert.ok(ev.includes('className="ev7-aviso-fino"') && ev.includes("🔒 Analisar com IA"));
  assert.equal(ev.includes('className="ev7-nota ev7-nota--ia"'), false, "o aviso não se repete em cada cartão");
  assert.ok(ev.includes("title={ev.tituloCompleto || ev.titulo}") && ev.includes("Enviar agora"));
  const css = ler("../app/globals.css");
  assert.ok(css.includes('html[data-modo="campo"] .ev7-nova-campo{width:auto;height:40px'));
  assert.ok(css.includes('.ui-screen[aria-label="Evidências da visita"] .ui-head .ui-title{position:absolute'));
  const page = ler("../app/page.tsx");
  assert.ok(page.includes("nomeCurtoDoAmbiente(ev.ambiente)") && page.includes("estadoVisivelDaEvidencia("));
});

test("PC: ações do ambiente são botões de 40 px, trilho azul de 104 px com página atual em âmbar e recolhida abaixo de 1100 px", () => {
  const css = ler("../app/globals.css");
  assert.ok(css.includes('.chk-acao{display:inline-flex;align-items:center;justify-content:center;height:40px'));
  assert.ok(css.includes('display:none;position:fixed;z-index:50;top:0;bottom:0;left:0;width:104px') && css.includes('background:var(--rd-menu)') && css.includes('clamp('), "um só trilho azul de 104 px (PC e tablet)");
  assert.ok(css.includes('.tr-ladrilho.is-ativo{background:var(--rd-ambar)}'), "página atual: ladrilho âmbar");
  assert.equal(css.includes('.pc-rail') || css.includes('.pc-side'), false, "as regras do menu largo e do trilho claro foram removidas");
  assert.ok(css.includes('html .pc-topbar .emp-ativa{flex:0 0 auto;width:auto;min-width:240px'));
  assert.ok(ler("../lib/screenMode.ts").includes('if (larguraDaTela < 1100) return "equilibrado"'));
});

test("campo de observação: um só texto (sem rótulo repetido no placeholder) e miniatura da foto ao lado do botão Foto", () => {
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes(': ehItemDeTemperatura(item.titulo) ? "Ex.: termômetro a 9 °C" : campo ? "Observação" : ""'));
  assert.ok(item.includes("chk-foto-mini-ao-lado") && item.includes('"Foto guardada · Na fila"'));
  assert.ok(ler("../app/globals.css").includes('.chk-foco-amb-pos{flex:none;padding:0;border:0;border-radius:0;background:transparent'));
});
