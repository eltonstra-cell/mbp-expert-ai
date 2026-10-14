import assert from "node:assert/strict";
import test from "node:test";

import {
  isAccessControlActive,
  resolveAccessControlMode,
} from "../lib/accessMode.ts";

test("na Vercel production/preview, variável ausente vira active", () => {
  for (const VERCEL_ENV of ["production", "preview"]) {
    assert.equal(resolveAccessControlMode({ VERCEL_ENV }), "active");
    assert.equal(isAccessControlActive({ VERCEL_ENV }), true);
  }
});

test("na Vercel, valor vazio ou desconhecido também vira active", () => {
  assert.equal(
    resolveAccessControlMode({ VERCEL_ENV: "preview", ACCESS_CONTROL_MODE: "" }),
    "active"
  );
  assert.equal(
    resolveAccessControlMode({ VERCEL_ENV: "production", ACCESS_CONTROL_MODE: "xyz" }),
    "active"
  );
});

test("na Vercel, só off explícito desliga e preparation não aplica", () => {
  const base = { VERCEL_ENV: "production" };
  assert.equal(isAccessControlActive({ ...base, ACCESS_CONTROL_MODE: "off" }), false);
  assert.equal(isAccessControlActive({ ...base, ACCESS_CONTROL_MODE: "preparation" }), false);
  assert.equal(isAccessControlActive({ ...base, ACCESS_CONTROL_MODE: "active" }), true);
  assert.equal(isAccessControlActive({ ...base, ACCESS_CONTROL_MODE: " ACTIVE " }), true);
});

test("em desenvolvimento local sem a variável, o controle não é aplicado", () => {
  assert.equal(resolveAccessControlMode({}), "off");
  assert.equal(isAccessControlActive({}), false);
  assert.equal(isAccessControlActive({ VERCEL_ENV: "development" }), false);
});

test("em desenvolvimento local, active e preparation mantêm a semântica", () => {
  assert.equal(isAccessControlActive({ ACCESS_CONTROL_MODE: "active" }), true);
  assert.equal(resolveAccessControlMode({ ACCESS_CONTROL_MODE: "preparation" }), "preparation");
  assert.equal(isAccessControlActive({ ACCESS_CONTROL_MODE: "preparation" }), false);
  assert.equal(isAccessControlActive({ ACCESS_CONTROL_MODE: "outro" }), false);
});
