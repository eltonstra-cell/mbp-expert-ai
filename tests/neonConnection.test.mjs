import assert from "node:assert/strict";
import test from "node:test";

import { resolveNeonDatabaseUrl } from "../lib/neonConnection.ts";

test("prefere o novo banco Neon quando as duas conexões existem", () => {
  assert.equal(
    resolveNeonDatabaseUrl({
      NOVO_NEON_DATABASE_URL: "postgres://novo",
      DATABASE_URL: "postgres://antigo",
    }),
    "postgres://novo"
  );
});

test("aceita a variável Postgres do novo banco como alternativa", () => {
  assert.equal(
    resolveNeonDatabaseUrl({
      NOVO_NEON_POSTGRES_URL: "postgres://novo-postgres",
      DATABASE_URL: "postgres://antigo",
    }),
    "postgres://novo-postgres"
  );
});

test("mantém o banco antigo como alternativa temporária", () => {
  assert.equal(
    resolveNeonDatabaseUrl({ DATABASE_URL: "postgres://antigo" }),
    "postgres://antigo"
  );
});

test("retorna nulo quando nenhuma conexão foi configurada", () => {
  assert.equal(resolveNeonDatabaseUrl({}), null);
});

test("na Vercel sem NOVO_NEON_*, falha sem expor valores", () => {
  for (const VERCEL_ENV of ["production", "preview"]) {
    assert.throws(
      () => resolveNeonDatabaseUrl({ VERCEL_ENV, DATABASE_URL: "postgres://segredo" }),
      (erro) =>
        /NOVO_NEON_/.test(erro.message) &&
        /ALLOW_LEGACY_DATABASE_URL/.test(erro.message) &&
        !erro.message.includes("segredo")
    );
  }
});

test("na Vercel sem nenhuma conexão, também falha", () => {
  assert.throws(() => resolveNeonDatabaseUrl({ VERCEL_ENV: "production" }));
});

test("na Vercel, ALLOW_LEGACY_DATABASE_URL=true libera o banco legado", () => {
  assert.equal(
    resolveNeonDatabaseUrl({
      VERCEL_ENV: "preview",
      ALLOW_LEGACY_DATABASE_URL: "true",
      DATABASE_URL: "postgres://antigo",
    }),
    "postgres://antigo"
  );
});

test("na Vercel, só o valor exato true libera o legado", () => {
  assert.throws(() =>
    resolveNeonDatabaseUrl({
      VERCEL_ENV: "production",
      ALLOW_LEGACY_DATABASE_URL: "1",
      DATABASE_URL: "postgres://antigo",
    })
  );
});

test("na Vercel, NOVO_NEON_* tem prioridade mesmo com a flag", () => {
  assert.equal(
    resolveNeonDatabaseUrl({
      VERCEL_ENV: "production",
      ALLOW_LEGACY_DATABASE_URL: "true",
      NOVO_NEON_DATABASE_URL: "postgres://novo",
      DATABASE_URL: "postgres://antigo",
    }),
    "postgres://novo"
  );
});

test("fora da Vercel (VERCEL_ENV=development), mantém o fallback", () => {
  assert.equal(
    resolveNeonDatabaseUrl({ VERCEL_ENV: "development", DATABASE_URL: "postgres://antigo" }),
    "postgres://antigo"
  );
});
