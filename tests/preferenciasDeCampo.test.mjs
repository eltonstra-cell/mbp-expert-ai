import assert from "node:assert/strict";
import test from "node:test";

import { cameraAutomaticaLigada, definirCameraAutomatica } from "../lib/preferenciasDeCampo.ts";

const armazemFalso = () => {
  const dados = new Map();
  return { getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => dados.set(k, v) };
};

test("câmera automática: desligada por padrão, liga e desliga, e nunca quebra sem armazenamento", () => {
  const a = armazemFalso();
  assert.equal(cameraAutomaticaLigada(a), false);
  definirCameraAutomatica(true, a);
  assert.equal(cameraAutomaticaLigada(a), true);
  definirCameraAutomatica(false, a);
  assert.equal(cameraAutomaticaLigada(a), false);
  assert.equal(cameraAutomaticaLigada(null), false);
  assert.doesNotThrow(() => definirCameraAutomatica(true, { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); } }));
  assert.equal(cameraAutomaticaLigada({ getItem: () => { throw new Error("x"); }, setItem: () => {} }), false);
});
