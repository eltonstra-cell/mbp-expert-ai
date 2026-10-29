import assert from "node:assert/strict";
import test from "node:test";
import { MAX_TENTATIVAS_DE_PIN, estadoAposTentativa, gerarSal, hashDoPin, pinBloqueado, pinConfere, pinValido } from "../lib/pinCiencia.ts";

test("PIN: 4 a 6 números; o hash é scrypt com sal próprio e o PIN nunca aparece nele", () => {
  assert.equal(pinValido("1234"), true);
  assert.equal(pinValido("123456"), true);
  for (const ruim of ["123", "1234567", "12a4", "", 1234, null]) assert.equal(pinValido(ruim), false, String(ruim));
  const sal = gerarSal();
  const hash = hashDoPin("4821", sal);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.ok(!hash.includes("4821"));
  assert.equal(pinConfere("4821", sal, hash), true);
  assert.equal(pinConfere("4822", sal, hash), false);
  assert.notEqual(hashDoPin("4821", gerarSal()), hash, "sal diferente, hash diferente");
});

test("PIN: 5 erros seguidos bloqueiam por 15 minutos; acerto zera; depois do prazo recomeça", () => {
  const t0 = new Date("2026-10-20T12:00:00.000Z");
  let estado = { tentativas: 0, bloqueadoAte: null };
  for (let i = 1; i < MAX_TENTATIVAS_DE_PIN; i += 1) {
    estado = estadoAposTentativa(estado, false, t0);
    assert.equal(estado.tentativas, i);
    assert.equal(pinBloqueado(estado, t0), false);
  }
  estado = estadoAposTentativa(estado, false, t0);
  assert.equal(pinBloqueado(estado, t0), true);
  assert.equal(pinBloqueado(estado, new Date(t0.getTime() + 14 * 60000)), true);
  assert.equal(pinBloqueado(estado, new Date(t0.getTime() + 16 * 60000)), false);
  assert.equal(estadoAposTentativa({ tentativas: 3, bloqueadoAte: null }, true, t0).tentativas, 0);
  const depois = estadoAposTentativa(estado, false, new Date(t0.getTime() + 20 * 60000));
  assert.equal(depois.tentativas, 1, "contador recomeça depois do bloqueio");
});
