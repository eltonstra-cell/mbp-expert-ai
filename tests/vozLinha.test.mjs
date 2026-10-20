import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { ORDEM_DA_LINHA, estadoDaLinha, formatarTempo } from "../lib/vozLinha.ts";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");

test("a linha da Observação tem Foto, Falar e IA, nesta ordem", () => {
  assert.deepEqual([...ORDEM_DA_LINHA], ["foto", "falar", "ia"]);
  const fonte = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(fonte.includes('variante="linha"'));
  assert.ok(fonte.indexOf("linhaInicio") > -1 && fonte.indexOf("linhaInicio") < fonte.indexOf("chk-obs-area"), "a linha vem acima do campo de texto");
  const voz = ler("../components/FieldVoiceTools.tsx");
  const linha = voz.slice(voz.indexOf("className={`voz-linha"));
  assert.ok(linha.indexOf("linhaInicio?.(") < linha.indexOf("voz-falar") && linha.indexOf("voz-falar") < linha.indexOf("voz-ia"));
});

test("o Ditar de cima e os chips dentro do campo não existem mais no item do checklist", () => {
  const fonte = ler("../components/ChecklistFocoItem.tsx");
  assert.ok(!/Ditar/.test(fonte));
  assert.ok(!fonte.includes("chk-tool--ditar"));
  assert.ok(!fonte.includes("chk-obs-voz"));
  assert.ok(!fonte.includes("field-assist-voice"));
});

test("parado: nada desativado; gravando: Foto e IA apagadas e desativadas, Falar vira a barra; Parar volta ao normal", () => {
  const parado = estadoDaLinha("ocioso", { podeFotografar: true });
  assert.deepEqual(parado, {
    foto: { desativado: false, apagado: false },
    falar: { modo: "botao", desativado: false },
    ia: { desativado: false, apagado: false },
  });
  const gravando = estadoDaLinha("gravando", { podeFotografar: true });
  assert.equal(gravando.foto.desativado, true);
  assert.equal(gravando.foto.apagado, true);
  assert.equal(gravando.ia.desativado, true);
  assert.equal(gravando.ia.apagado, true);
  assert.equal(gravando.falar.modo, "barra");
  assert.deepEqual(estadoDaLinha("ocioso", { podeFotografar: true }), parado);
});

test("transcrevendo desativa o Falar e a IA; sem permissão de foto, a Foto fica desativada", () => {
  const t = estadoDaLinha("transcrevendo", { podeFotografar: true });
  assert.equal(t.falar.desativado, true);
  assert.equal(t.ia.desativado, true);
  assert.equal(t.foto.desativado, false);
  assert.equal(estadoDaLinha("ocioso", { podeFotografar: false }).foto.desativado, true);
});

test("tempo decorrido em minutos e segundos", () => {
  assert.equal(formatarTempo(7), "0:07");
  assert.equal(formatarTempo(65), "1:05");
  assert.equal(formatarTempo(-3), "0:00");
});
