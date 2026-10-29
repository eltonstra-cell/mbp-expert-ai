import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { modoDaBusca } from "../lib/topoCompacto.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8").replace(/\r\n/g, "\n");
const css = ler("../app/globals.css");
const bloco = css.slice(css.indexOf("/* RODADA 12c · barra de baixo"));

test("barra de baixo: branca, flutuante, borda #A3B0C5, ícones por assunto, pílula clara e selo vermelho", () => {
  assert.ok(bloco.includes("background:#fff;border:1.5px solid #A3B0C5;border-radius:28px;box-shadow:0 4px 14px rgba(38,52,69,.16)"));
  for (const [aba, cor] of [["inicio", "#264A80"], ["visitas", "#21805B"], ["correcoes", "#C83F45"], ["pops", "#168080"]]) {
    assert.ok(bloco.includes(`.campo-tab[data-aba="${aba}"] .campo-tab-icon{color:${cor}}`), aba);
  }
  for (const [aba, fundo] of [["inicio", "#E4EAF4"], ["correcoes", "#FAE6E7"], ["pops", "#DDF0F0"]]) {
    assert.ok(bloco.includes(`.campo-tab.is-on[data-aba="${aba}"]{background:${fundo}}`), aba);
  }
  assert.ok(bloco.includes(".campo-tab-count{border:0;background:#C83F45;color:#fff"));
  assert.ok(ler("../components/campo/CampoTelas.tsx").includes("data-aba={chave}"));
});

test("Central da visita: Finalizar no fluxo (verde 39 px), sem programas nem 'Editar ambientes' na tela, Editar ambientes no menu ⋯ em todos os modos", () => {
  assert.ok(bloco.includes("position:static;align-self:flex-end;width:auto;height:39px;margin-top:auto;padding:0 18px;border:0;border-radius:10px;background:#21805B;color:#fff;font-size:17px"));
  const central = ler("../components/pc/PcCentral.tsx");
  assert.equal(central.includes("cc-linha--prog"), false);
  assert.equal(central.includes("pc-vazios"), false);
  assert.equal(central.includes("Editar ambientes"), false);
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes('view === "visita" && visitaAtual && permitido("visitas.executar", visitaAtual.empresaId) ? [{ rotulo: "Editar ambientes"'));
  assert.ok(pagina.includes("podeFinalizar={false}"), "a faixa da visita não repete o Finalizar");
});

test("busca: sem 'Ir →' visível, microfone laranja, larga a partir de 1100 px e sem a busca do topo em Empresas", () => {
  assert.equal(modoDaBusca(1099), "compacta");
  assert.equal(modoDaBusca(1280), "larga");
  assert.ok(bloco.includes("html:root:root body .pc-go{display:none}"));
  assert.ok(bloco.includes("html:root:root body .pc-mic{background:#B4491C;color:#fff}"));
  assert.ok(ler("../app/page.tsx").includes('semBusca={modo === "campo" || view === "empresas"}'));
});

test("Checklist PC e Empresas: respostas de 48 px, ações sem fundo, 'Nova visita' em contorno e progresso turquesa; Correções com as etapas na lista dentro da visita", () => {
  assert.ok(bloco.includes('html:not([data-modo="campo"]):root:root body .chk-foco-botoes .chk-resp{width:100%;height:48px'));
  assert.ok(bloco.includes("html:root:root body .emp-c-visita .ui-btn{border:1.5px solid #264A80;background:#fff;color:#264A80}"));
  assert.ok(bloco.includes("html:root:root body .emp-prep-linha .ui-progress-fill{background:#21A3A3}"));
  assert.ok(ler("../app/page.tsx").includes("etapasNaLista={!correcoesDaEmpresa}"));
  assert.ok(ler("../components/pc/PcCorrecoes.tsx").includes("{etapasNaLista && etapasEl}"));
  assert.ok(ler("../components/AppNavigation.tsx").includes("na empresa ("));
});
