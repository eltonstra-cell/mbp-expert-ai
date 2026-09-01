import assert from "node:assert/strict";
import test from "node:test";

import {
  createLocalBackup,
  localBackupFilename,
} from "../lib/localBackup.ts";

test("backup local preserva integralmente o banco e identifica a versão", () => {
  const db = {
    empresas: { e1: { id: "e1" } },
    empresaAtualId: "e1",
    visitas: [{ id: "v1" }, { id: "v2" }, { id: "v3" }],
    ncs: [{ id: "nc1" }],
    evidencias: [],
  };

  const backup = createLocalBackup(db, "2026-09-01T13:40:00.000Z");
  assert.equal(backup.formato, "mbp-expert-ai-backup-local");
  assert.equal(backup.versao, "2.45.3");
  assert.equal(backup.data, db);
  assert.equal(backup.data.visitas.length, 3);
});

test("nome do arquivo não contém caracteres inválidos do Windows", () => {
  const nome = localBackupFilename(new Date("2026-09-01T13:40:00.000Z"));
  assert.match(nome, /^mbp-expert-ai-backup-local_/);
  assert.match(nome, /\.json$/);
  assert.doesNotMatch(nome, /:/);
});
