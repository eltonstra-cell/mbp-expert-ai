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
