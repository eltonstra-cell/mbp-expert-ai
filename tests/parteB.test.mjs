import test from "node:test";
import assert from "node:assert/strict";
import { gravidadeSugerida, trocaDeGravidade } from "../lib/checklistUi.ts";
import { localBackupFilename, createLocalBackup } from "../lib/localBackup.ts";
import { autorizarGuia } from "../lib/guias.ts";

test("gravidade sugerida: vem do critério e não muda depois da troca", () => {
  const item = { criticidade: "Importante" };
  assert.equal(gravidadeSugerida(item), "Importante");
  const troca = trocaDeGravidade(item, "Crítica");
  assert.deepEqual(troca, { criticidade: "Crítica", criticidadeSugerida: "Importante" });
  // trocar de novo mantém a sugerida original
  const depois = trocaDeGravidade({ ...item, ...troca }, "Rotina");
  assert.deepEqual(depois, { criticidade: "Rotina", criticidadeSugerida: "Importante" });
  assert.equal(gravidadeSugerida({ ...item, ...depois }), "Importante");
});

test("gravidade sugerida: item sem gravidade de origem não ganha 'sugerida'", () => {
  assert.equal(gravidadeSugerida({}), undefined);
  assert.deepEqual(trocaDeGravidade({}, "Crítica"), { criticidade: "Crítica" });
});

test("nome antigo: arquivo de backup e guias para baixar usam 'ponto-certo'", () => {
  assert.match(localBackupFilename(new Date("2026-08-10T10:00:00Z")), /^ponto-certo-backup-local_2026-08-10_10-00-00-000\.json$/);
  // o identificador interno do formato é mantido para ler backups antigos
  assert.equal(createLocalBackup({}, "x").formato, "mbp-expert-ai-backup-local");
  assert.equal(autorizarGuia("guia-rapido", "nao-aplicado").nomeDeDownload, "guia-rapido-ponto-certo.pdf");
  assert.equal(autorizarGuia("manual-completo", "nao-aplicado").nomeDeDownload, "manual-completo-ponto-certo.pdf");
});
