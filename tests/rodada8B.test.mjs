import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { COR_DO_SEGMENTO, COR_DO_SEGMENTO_CAMPO } from "../lib/checklistSegmentos.ts";

const lerFonte = (caminho) => readFileSync(new URL(`../${caminho}`, import.meta.url), "utf8");

test("B1: o Conforme da barra de progresso tem o mesmo verde dos números do checklist", () => {
  const css = lerFonte("app/globals.css");
  assert.equal(COR_DO_SEGMENTO.Conforme, "#278050");
  assert.equal(COR_DO_SEGMENTO_CAMPO.Conforme, "#278050");
  assert.ok(css.includes(".chk-pc-num.is-ok{background:#278050"));
});

test("B2: Importante selecionado em terracota #AF640A com texto branco; 'sugerida' com 15 px", () => {
  const css = lerFonte("app/globals.css");
  assert.ok(css.includes(".chk-grav--amber.is-on{background:#AF640A;color:#fff}"));
  assert.ok(css.includes(".chk-grav-linha .chk-grav--amber{--grav:#AF640A}"));
  assert.ok(css.includes(".chk-grav-sug{margin-left:6px;font-size:15px;font-weight:400;opacity:1}"));
  assert.equal(css.includes("--grav:#D97706"), false);
});

test("B3: a lista de ambientes tem colunas fixas e não escreve 'Sem NCs'", () => {
  const css = lerFonte("app/globals.css");
  const comp = lerFonte("components/AmbientesCortina.tsx");
  assert.equal(comp.includes("Sem NCs"), false);
  assert.ok(comp.includes('className="amb-vazio"') && comp.includes("sem não conformidades"), "coluna vazia com texto só para leitor de tela");
  assert.ok(css.includes("grid-template-columns:minmax(0,1fr) 110px 176px 76px"));
  assert.ok(css.includes('html[data-modo="campo"] .amb-linha{grid-template-columns:minmax(0,1fr) 30px 84px 58px'));
});
