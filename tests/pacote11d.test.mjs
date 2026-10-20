import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const css = ler("../app/globals.css");

test("D: foto mostra miniatura de 56px que amplia; áudio mostra ícone; sem o chip Ver foto", () => {
  const fonte = ler("../components/pc/PcEvidencias.tsx");
  assert.ok(!fonte.includes("Ver foto"));
  assert.ok(fonte.includes('className="ev7-card-mini"') && fonte.includes("onClick={() => onAmpliar(ev.id)}"));
  assert.ok(fonte.includes("ev7-card-mini ev7-card-mini--icone") && fonte.includes("<MicIcon />"));
  assert.ok(fonte.includes('aria-label={tocando ? "Pausar áudio" : "Ouvir áudio"}'));
  assert.ok(css.includes(".ev7-card-mini{display:grid;flex:none;place-items:center;width:56px;height:56px"));
});

