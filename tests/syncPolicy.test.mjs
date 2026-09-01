import assert from "node:assert/strict";
import test from "node:test";

import {
  shouldSyncOnActivation,
  SYNC_ACTIVATION_DEDUP_MS,
} from "../lib/syncPolicy.ts";

test("sincroniza quando a aplicação pronta volta a ficar visível", () => {
  assert.equal(
    shouldSyncOnActivation({
      ready: true,
      visible: true,
      now: 10_000,
      lastSyncAt: 0,
    }),
    true
  );
});

test("não consulta enquanto a aba está oculta ou antes da inicialização", () => {
  assert.equal(
    shouldSyncOnActivation({
      ready: true,
      visible: false,
      now: 10_000,
      lastSyncAt: 0,
    }),
    false
  );
  assert.equal(
    shouldSyncOnActivation({
      ready: false,
      visible: true,
      now: 10_000,
      lastSyncAt: 0,
    }),
    false
  );
});

test("deduplica foco e visibilitychange disparados em sequência", () => {
  assert.equal(
    shouldSyncOnActivation({
      ready: true,
      visible: true,
      now: 10_000 + SYNC_ACTIVATION_DEDUP_MS - 1,
      lastSyncAt: 10_000,
    }),
    false
  );
  assert.equal(
    shouldSyncOnActivation({
      ready: true,
      visible: true,
      now: 10_000 + SYNC_ACTIVATION_DEDUP_MS,
      lastSyncAt: 10_000,
    }),
    true
  );
});
