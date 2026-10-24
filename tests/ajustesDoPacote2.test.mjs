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

test("faixa de offline fina e selo com texto no topo do celular, com o nome da página", () => {
  const page = ler("../app/page.tsx");
  assert.ok(page.includes("Sem sinal · alterações guardadas neste aparelho"));
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
  assert.ok(item.includes('ehItemDeTemperatura(item.titulo) ? "Ex.: termômetro a 9 °C" : "Observação (opcional)"'));
});

test("relatório: temperatura classificada pelo app imprime valor, limite e a marca; resposta trocada pelo RT também é dita", () => {
  const checklist = [
    { ambiente: "Câmara fria", titulo: "Temperatura da câmara", status: "Não Conforme", temperatura: { valor: 7, limiteId: "refrigerado" } },
    { ambiente: "Câmara fria", titulo: "Temperatura de um item", status: "Conforme", temperatura: { valor: 7, limiteId: "refrigerado" } },
    { ambiente: "Cozinha", titulo: "Piso", status: "Conforme" },
  ];
  const linhas = linhasDeTemperaturaDoRelatorio(checklist);
  assert.equal(linhas.length, 2);
  assert.match(linhas[0], /7 °C · limite até 5 °C \(Portaria SES\/RS nº 799\/2023, item 10\.09, 10\.8, 11\.2 b, 12\.2 a\) · classificado pelo app, confirmado pelo RT\./);
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
