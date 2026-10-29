import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { formatarCnpj } from "../lib/cnpj.ts";
import { assinaturaEdicaoEmpresa } from "../lib/estadoNaoSalvo.ts";
import { ROTULO_DO_SELO, chipPendente, estadoDaBarraDeSalvar, marcadosDoUltimoSalvo } from "../lib/escolhaEmJanela.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("1.1 chip cinza com 'Falta salvar' até salvar; azul-céu depois (comparado ao último salvo)", () => {
  const salva = assinaturaEdicaoEmpresa({
    form: {}, responsabilidades: [], setores: ["Cozinha", "Estoque"], equipamentos: [], programas: [],
    fluxos: [{ id: "f1", aplicavel: true }, { id: "f2", aplicavel: false }],
  });
  const salvos = marcadosDoUltimoSalvo(salva);
  assert.deepEqual(salvos.setores, ["Cozinha", "Estoque"]);
  assert.deepEqual(salvos.fluxos, ["f1"]);
  assert.equal(chipPendente("Cozinha", salvos.setores), false);
  assert.equal(chipPendente("Salão", salvos.setores), true);
  assert.equal(chipPendente("f2", salvos.fluxos), true);
  assert.equal(chipPendente("x", undefined), true, "sem base salva, tudo falta salvar");
  assert.deepEqual(marcadosDoUltimoSalvo(""), { setores: [], fluxos: [] });
  assert.deepEqual(marcadosDoUltimoSalvo("{ruim"), { setores: [], fluxos: [] });
  const janela = ler("../components/EscolhaEmJanela.tsx");
  assert.equal(ROTULO_DO_SELO, "Falta salvar");
  assert.ok(janela.includes("ROTULO_DO_SELO") && janela.includes("is-falta") && janela.includes("is-salvo"));
  const css = ler("../app/globals.css");
  assert.match(css, /\.esc-chip\.is-falta\{border-color:#7F8BA3;background:#EEF1F7;color:#263445\}/);
  assert.match(css, /\.esc-chip\.is-salvo\{border-color:#7FB2E5;background:#DCEBFA;color:#263445\}/);
});

test("1.2 barra de baixo: pendente (creme, ponto âmbar) e salva (verde claro, ✓ verde); Salvar apagado sem desabilitar", () => {
  assert.deepEqual(estadoDaBarraDeSalvar(true), { classe: "is-pendente", marca: "●", texto: "Alterações ainda não salvas" });
  assert.equal(estadoDaBarraDeSalvar(false).classe, "is-salvo");
  assert.equal(estadoDaBarraDeSalvar(false).marca, "✓");
  const css = ler("../app/globals.css");
  assert.match(css, /\.cen-salvar\.is-pendente\{border:1\.5px solid #21A3A3;background:#FFF6E5\}/);
  assert.match(css, /\.cen-salvar\.is-salvo\{[^}]*background:#E6F4EA\}/);
  assert.match(css, /\.cen-salvar\.is-salvo \.cen-salvar-marca\{color:#21805B\}/);
  assert.match(css, /\.ui-btn--save\.is-apagado\{background:#CDEBD6;color:#263445\}/);
  const page = ler("../app/page.tsx");
  assert.ok(page.includes('" is-apagado"') && !/is-apagado[^\n]*disabled/.test(page.split("salvarEmpresa} className")[1]?.split("\n")[0] || ""));
});

test("1.3 a faixa 'Alterações salvas com sucesso.' deixou de existir", () => {
  assert.equal(ler("../app/page.tsx").includes("Alterações salvas com sucesso"), false);
});

test("1.4 botão desabilitado: cinza #EEF1F7, borda #7F8BA3, texto #526477", () => {
  const css = ler("../app/globals.css");
  assert.match(css, /\.ui-btn:disabled,[^{]*\.pgl-criar \.ui-btn--criar\.is-desligado:disabled\{background:#EEF1F7;[^}]*border:1\.5px solid #7F8BA3;color:#526477/);
});

test("1.5 voz: microfone de 34 px redondo com borda #7F8BA3 e ícone de 18 px; IA e Falar com 32 px e 13 px", () => {
  const css = ler("../app/globals.css");
  assert.match(css, /\.field-assist-voice--icone[^{]*\{[^}]*width:34px;height:34px;[^}]*border:1\.5px solid #7F8BA3;border-radius:50%/);
  assert.match(css, /\.field-assist-voice svg,\.field-assist-voice--icone svg\{width:18px;height:18px\}/);
  assert.match(css, /\.field-assist-tools button\{min-height:32px;font-size:13px\}/);
  assert.match(css, /\.voz-btn,\.voz-ia\{min-height:32px;font-size:13px\}/);
});

test("1.6 máscara de CNPJ só na exibição", () => {
  assert.equal(formatarCnpj("12345678000195"), "12.345.678/0001-95");
  assert.equal(formatarCnpj("12.345.678/0001-95"), "12.345.678/0001-95");
  assert.equal(formatarCnpj(" 12345678000195 "), "12.345.678/0001-95");
  assert.equal(formatarCnpj("123"), "123");
  assert.equal(formatarCnpj(undefined), "");
  for (const arquivo of ["../components/pc/PcDossie.tsx", "../components/pc/PcResumo.tsx", "../components/pc/PcRelatoriosEmitidos.tsx", "../components/pc/PcPopEditor.tsx", "../lib/popDocumento.ts"]) {
    assert.ok(ler(arquivo).includes("formatarCnpj("), arquivo);
  }
});
