import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeStorageIdentity,
  saveDB,
  scopedStorageKey,
  STORAGE_KEY,
} from "../lib/storage.ts";

test("normaliza a identidade usada no armazenamento local", () => {
  assert.equal(
    normalizeStorageIdentity("  EltonStra2@GMAIL.com "),
    "eltonstra2@gmail.com"
  );
});

test("separa o armazenamento de cada conta", () => {
  const admin = scopedStorageKey(STORAGE_KEY, "eltonstra@gmail.com");
  const consultor = scopedStorageKey(STORAGE_KEY, "eltonstra2@gmail.com");

  assert.notEqual(admin, consultor);
  assert.match(admin, /eltonstra%40gmail\.com$/);
  assert.match(consultor, /eltonstra2%40gmail\.com$/);
});

test("mantém a chave antiga quando ainda não existe sessão", () => {
  assert.equal(scopedStorageKey(STORAGE_KEY, null), STORAGE_KEY);
  assert.equal(scopedStorageKey(STORAGE_KEY, "  "), STORAGE_KEY);
});

test("não derruba o aplicativo quando o armazenamento local rejeita a gravação", () => {
  const windowAnterior = globalThis.window;
  const localStorageAnterior = globalThis.localStorage;

  globalThis.window = {};
  globalThis.localStorage = {
    setItem() {
      throw new Error("QuotaExceededError");
    },
  };

  try {
    assert.equal(saveDB({ empresas: {} }, "teste@exemplo.com"), false);
  } finally {
    if (windowAnterior === undefined) delete globalThis.window;
    else globalThis.window = windowAnterior;

    if (localStorageAnterior === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = localStorageAnterior;
  }
});

test("remove a cópia antiga e tenta novamente quando a cota está cheia", () => {
  const windowAnterior = globalThis.window;
  const localStorageAnterior = globalThis.localStorage;
  const dados = new Map([[STORAGE_KEY, "cópia antiga grande"]]);
  let primeiraTentativa = true;

  globalThis.window = {};
  globalThis.localStorage = {
    setItem(chave, valor) {
      if (primeiraTentativa) {
        primeiraTentativa = false;
        throw new Error("QuotaExceededError");
      }
      dados.set(chave, valor);
    },
    removeItem(chave) {
      dados.delete(chave);
    },
  };

  try {
    const identidade = "teste@exemplo.com";
    assert.equal(saveDB({ empresas: {} }, identidade), true);
    assert.equal(dados.has(STORAGE_KEY), false);
    assert.equal(
      dados.has(scopedStorageKey(STORAGE_KEY, identidade)),
      true
    );
  } finally {
    if (windowAnterior === undefined) delete globalThis.window;
    else globalThis.window = windowAnterior;

    if (localStorageAnterior === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = localStorageAnterior;
  }
});
