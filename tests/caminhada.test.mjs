import assert from "node:assert/strict";
import test from "node:test";

import { progressoDaCaminhada, textoDaCaminhada } from "../lib/caminhada.ts";

const amb = (nome, total, respondidos, geral = false) => ({ nome, rotulo: nome, total, respondidos, geral });
const lista = [amb("Recebimento", 4, 4), amb("Cozinha", 5, 1), amb("Depósito", 3, 0), amb("Programas de Controle", 6, 0, true)];

test("progresso: posição, próximo ambiente e concluídos; verificação geral não conta como ambiente", () => {
  const p = progressoDaCaminhada(lista, "Cozinha");
  assert.deepEqual([p.indice, p.total, p.proximo, p.concluidos], [2, 3, "Depósito", 1]);
  assert.equal(textoDaCaminhada(p), "Ambiente 2 de 3 · Próximo: Depósito");
});

test("último ambiente e verificação geral", () => {
  assert.equal(textoDaCaminhada(progressoDaCaminhada(lista, "Depósito")), "Ambiente 3 de 3 · Último ambiente");
  assert.equal(textoDaCaminhada(progressoDaCaminhada(lista, "Programas de Controle")), "");
});
