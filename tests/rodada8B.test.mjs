import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COR_DO_SEGMENTO, COR_DO_SEGMENTO_CAMPO } from "../lib/checklistSegmentos.ts";

const lerFonte = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");

test("B1: o Conforme da barra de progresso tem o mesmo verde dos números do checklist", () => {
  const css = lerFonte("app/globals.css");
  assert.equal(COR_DO_SEGMENTO.Conforme, "#21805B");
  assert.equal(COR_DO_SEGMENTO_CAMPO.Conforme, "#21805B");
  assert.ok(css.includes(".chk-pc-num.is-ok{background:#21805B"));
});

test("B2 (rodada 10): Importante selecionado em âmbar #E0A800 com texto #263445; Crítica #C83F45 com texto branco; 'sugerida' com 15 px", () => {
  const css = lerFonte("app/globals.css");
  assert.ok(css.includes(".chk-grav--amber.is-on{background:#E0A800;color:#263445}") && css.includes(".chk-grav--nc.is-on{background:#C83F45;color:#fff}"));
  assert.ok(css.includes(".chk-grav-linha .chk-grav--amber{--grav:#E0A800}") && css.includes(".chk-grav-linha .chk-grav.is-on.chk-grav--amber{color:#263445}"));
  assert.ok(css.includes(".chk-grav-sug{margin-left:6px;font-size:15px;font-weight:400;opacity:1}"));
  assert.equal(css.includes("--grav:#D97706"), false);
});

test("B3: a lista de ambientes tem colunas fixas e não escreve 'Sem NCs'", () => {
  const css = lerFonte("app/globals.css");
  const comp = lerFonte("components/AmbientesCortina.tsx");
  // Rodada 13: a lista virou a janela de ambientes (linhas de 44 px, contagem à direita); a NC fica só para o leitor de tela.
  assert.equal(comp.includes("Sem NCs"), false);
  assert.ok(comp.includes("não conformidade") && comp.includes("sr-only"), "NC só para leitor de tela");
  assert.ok(css.includes("height:44px;padding:0 16px 0 13px;border-left:3px solid transparent"));
});

// ===== Rodada 9B =====
import { rotulosCurtosDosAmbientes } from "../lib/checklistEnvs.ts";

test("9B B3: a lista de ambientes usa o nome curto; nomes curtos repetidos voltam ao nome completo", () => {
  const oficiais = [
    "Recebimento de matérias-primas, ingredientes, embalagens e materiais de limpeza",
    "Cozinha / Produção",
    "Banheiro feminino de colaborador",
    "Banheiro feminino de clientes",
  ];
  assert.deepEqual(rotulosCurtosDosAmbientes(oficiais), ["Recebimento", "Cozinha", "Banheiro feminino · colaboradores", "Banheiro feminino · clientes"]);
  assert.deepEqual(rotulosCurtosDosAmbientes(["Câmara Fria", "Estoque Seco (cozinha)"]), ["Câmara Fria", "Estoque Seco"]);
  const repetidos = ["Área de Preparo", "Área de Descanso"];
  assert.deepEqual(rotulosCurtosDosAmbientes(repetidos), repetidos, "dois nomes curtos iguais (\"Área\"): ficam os completos");
  const comp = readFileSync(new URL("../components/AmbientesCortina.tsx", import.meta.url), "utf8");
  assert.ok(comp.includes("rotulosCurtosDosAmbientes") && comp.includes("nomeCurtoDe"));
});

test("9B B1/B2/B4/B5: estilos", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(!css.includes('.chk-grav-sug::before'));
  assert.ok(css.includes("chk-resp--ok:not(.is-marcado),html[data-modo] .chk-resp.is-apagado.chk-resp--ok:not(.is-marcado)"));
  assert.ok(css.includes(".amb-linha.is-completo .amb-barra span{background:#21805B}") && css.includes(".amb-check{color:#21805B}"));
  assert.ok(css.includes('.ui-screen[aria-label="Visitas técnicas"] .ui-btn.ui-btn--criar{background:#264A80;color:#fff;font-weight:400}'));
  assert.ok(css.includes(".amb-selo,html[data-modo=\"campo\"] .amb-selo{display:block;min-width:0;width:auto;overflow:hidden;padding:0;border-radius:0;background:transparent;color:#C83F45"));
});
