import assert from "node:assert/strict";
import test from "node:test";

import {
  normalizeStorageIdentity,
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
