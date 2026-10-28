import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { COR_DO_SEGMENTO, legendaDaEvidencia, rotuloDoSegmento } from "../lib/checklistSegmentos.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const css = ler("../app/globals.css");

test("B: cores por estado dos segmentos e quadradinhos", () => {
  assert.equal(COR_DO_SEGMENTO.Conforme, "#2E8B57");
  assert.equal(COR_DO_SEGMENTO["Não Conforme"], "#B83A33");
  assert.equal(COR_DO_SEGMENTO["Não se aplica"], "#C3CDD6");
  assert.equal(COR_DO_SEGMENTO.Pendente, "#EEF1F5");
  assert.ok(css.includes(".chk-pc-num.is-na{background:#C3CDD6"));
  assert.ok(css.includes(".chk-pc-num.is-atual{border-color:#2456D6;box-shadow:0 0 0 3px #DCE6FB}"));
  assert.ok(css.includes(".chk-pc-num{width:40px;height:40px;border:2px solid transparent;border-radius:10px"));
  assert.ok(css.includes(".chk-seg{position:relative;flex:1 1 0;min-width:0;height:10px;padding:0;border:0;border-radius:5px"));
});

test("B: cada segmento tem nome acessível e o clique leva ao item", () => {
  assert.equal(rotuloDoSegmento(1, "Não Conforme"), "Item 2, Não conforme");
  assert.equal(rotuloDoSegmento(0, "Pendente"), "Item 1, sem resposta");
  const item = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(item.includes("onClick={() => onItem(outro.id)}") && item.includes("rotuloDoSegmento(indice, outro.status)"));
  const pc = ler("../components/pc/PcChecklist.tsx");
  assert.ok(pc.includes("onClick={() => onItem(item.id)}") && pc.includes("rotuloDoSegmento(indice, item.status)"));
  const pagina = ler("../app/page.tsx");
  assert.ok(pagina.includes("onItem={(id) => { setItemFocoId(id); setUltimoItemChecklistId(id); }}"));
});

test("B: legenda das evidências do item sem nome de arquivo", () => {
  const foto = legendaDaEvidencia("Foto", "2026-10-20T13:05:00");
  assert.match(foto, /^Foto · \d{2}:\d{2}$/);
  assert.match(legendaDaEvidencia("Áudio", "2026-10-20T13:05:00"), /^Áudio · /);
  assert.equal(legendaDaEvidencia("Foto", "inválida"), "Foto");
  const pc = ler("../components/pc/PcChecklist.tsx");
  assert.ok(!pc.includes("alt={evidencia.nome}"));
});

test("B: observação herda a fonte do app, botões sem negrito e miniatura de 56px", () => {
  assert.ok(css.includes(".chk-obs-area,.chk-obs-campo textarea{font-family:inherit}"));
  assert.ok(css.includes(".chk-resp,.chk-resp span,.chk-grav{font-weight:400}"));
  assert.ok(css.includes(".chk-foto-mini{width:56px;height:56px;border-radius:10px}"));
});

