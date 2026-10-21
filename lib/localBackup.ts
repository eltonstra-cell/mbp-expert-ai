import type { AppDB } from "@/types";

/** Quantos registros de cada coleção o backup leva (inclui as coleções novas: POPs, comprovantes, pessoas e relatórios emitidos). */
export function contagensDoBackup(db: AppDB) {
  const tamanho = (lista: unknown[] | undefined) => (lista || []).length;
  return {
    empresas: Object.keys(db.empresas || {}).length,
    visitas: tamanho(db.visitas),
    ncs: tamanho(db.ncs),
    evidencias: tamanho(db.evidencias),
    registrosPop: tamanho(db.registrosPop),
    comprovantes: tamanho(db.comprovantes),
    colaboradores: tamanho(db.colaboradores),
    capacitacoes: tamanho(db.capacitacoes),
    leiturasPop: tamanho(db.leiturasPop),
    relatoriosEmitidos: tamanho(db.relatoriosEmitidos),
  };
}

export function createLocalBackup(db: AppDB, exportadoEm = new Date().toISOString()) {
  return {
    formato: "mbp-expert-ai-backup-local",
    versao: "2.45.3",
    exportadoEm,
    contagens: contagensDoBackup(db),
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
