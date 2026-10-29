import assert from "node:assert/strict";
import test from "node:test";

import { PALETA_EMPRESA, contrasteComBranco, corDaEmpresa, corValida, proximaCorLivre } from "../lib/empresaCor.ts";

const matiz = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const h = max === r ? ((g - b) / (max - min)) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4;
  return (h * 60 + 360) % 360;
};

test("a paleta tem 5 cores, todas com contraste de 4,4 ou mais com texto branco (o turquesa #188585 pedido dá 4,44)", () => {
  assert.ok(PALETA_EMPRESA.length === 5);
  for (const { nome, hex } of PALETA_EMPRESA) assert.ok(contrasteComBranco(hex) >= 4.4, `${nome} ${hex} ${contrasteComBranco(hex).toFixed(2)}`);
});

test("nenhuma cor da paleta lembra o vermelho de não conforme", () => {
  const vermelho = 0;
  for (const { hex } of PALETA_EMPRESA) {
    const distancia = Math.min(Math.abs(matiz(hex) - vermelho), 360 - Math.abs(matiz(hex) - vermelho));
    assert.ok(distancia >= 15, hex);
    assert.notEqual(hex.toUpperCase(), "#D93A3A");
  }
});

test("sem cor guardada, a cor vem do id e é sempre a mesma; cor guardada vale", () => {
  const a = corDaEmpresa({ id: "44150273000191" });
  assert.equal(a, corDaEmpresa({ id: "44150273000191" }));
  assert.ok(corValida(a));
  assert.equal(corDaEmpresa({ id: "x", cor: "#264A80" }), "#264A80");
  assert.equal(corDaEmpresa({ id: "x", cor: "#ff0000" }), corDaEmpresa({ id: "x" }));
  assert.equal(corValida("#D93A3A"), false);
});

test("empresa nova recebe a primeira cor ainda livre; com todas em uso, repete na ordem", () => {
  assert.equal(proximaCorLivre([]), PALETA_EMPRESA[0].hex);
  const duas = [
    { id: "a", cor: PALETA_EMPRESA[0].hex },
    { id: "b", cor: PALETA_EMPRESA[1].hex },
  ];
  assert.equal(proximaCorLivre(duas), PALETA_EMPRESA[2].hex);
  const buraco = [{ id: "a", cor: PALETA_EMPRESA[1].hex }];
  assert.equal(proximaCorLivre(buraco), PALETA_EMPRESA[0].hex);
  const todas = PALETA_EMPRESA.map((c, i) => ({ id: String(i), cor: c.hex }));
  assert.equal(proximaCorLivre(todas), PALETA_EMPRESA[0].hex);
  assert.equal(proximaCorLivre([...todas, { id: "z", cor: PALETA_EMPRESA[3].hex }]), PALETA_EMPRESA[1].hex);
});
