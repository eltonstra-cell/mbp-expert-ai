import type { AppDB } from "@/types";

export function createLocalBackup(db: AppDB, exportadoEm = new Date().toISOString()) {
  return {
    formato: "mbp-expert-ai-backup-local",
    versao: "2.45.3",
    exportadoEm,
    data: db,
  };
}

export function localBackupFilename(exportadoEm = new Date()) {
  const stamp = exportadoEm
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .replace("Z", "");
  return `ponto-certo-backup-local_${stamp}.json`;
}
