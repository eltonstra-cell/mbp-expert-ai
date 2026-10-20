import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (caminho) => readFileSync(new URL(caminho, import.meta.url), "utf8");
const css = ler("../app/globals.css");

test("A: a janela de revisão não passa da tela, quebra linha e não tem alça de redimensionar", () => {
  const regra = (seletor) => css.split("\n").filter((linha) => linha.startsWith(seletor)).join("\n");
  const janela = regra(".voz-revisao{");
  assert.ok(janela.includes("max-width:100%") && janela.includes("box-sizing:border-box") && janela.includes("min-width:0"));
  assert.ok(!/(^|[;{])min-width:[1-9]/.test(janela));
  assert.ok(regra(".voz-revisao-camada{").includes("padding:12px"));
  assert.ok(regra(".voz-revisao-aviso{").includes("white-space:normal"));
  assert.ok(regra(".voz-revisao-texto{").includes("resize:none"));
  assert.ok(regra(".voz-revisao-acoes{").includes("flex:none"));
});

test("A: o quadro cresce com o texto, com limite de altura e botões à vista", () => {
  const fonte = ler("../components/RevisaoTranscricao.tsx");
  assert.ok(fonte.includes("alvo.scrollHeight"));
  assert.ok(fonte.includes("visualViewport"));
  assert.ok(fonte.includes("Usar texto") && fonte.includes("Ditar de novo"));
  assert.ok(css.includes("max-height:min(100%,calc(var(--vv-altura,100dvh) - 24px))"));
});

