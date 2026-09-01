import type { AppDB } from "@/types";

export type RecoveryCounts = {
  empresas: number;
  visitas: number;
  ncs: number;
  evidencias: number;
};

function ids<T extends { id: string }>(items: T[]) {
  return new Set(items.map((item) => item.id));
}

function mergeById<T extends { id: string }>(cloud: T[], local: T[]) {
  const merged = new Map<string, T>();
  for (const item of cloud) merged.set(item.id, item);
  for (const item of local) merged.set(item.id, item);
  return [...merged.values()];
}

export function localOnlyCounts(local: AppDB, cloud: AppDB): RecoveryCounts {
  const cloudEmpresas = new Set(Object.keys(cloud.empresas || {}));
  const cloudVisitas = ids(cloud.visitas || []);
  const cloudNcs = ids(cloud.ncs || []);
  const cloudEvidencias = ids(cloud.evidencias || []);

  return {
    empresas: Object.keys(local.empresas || {}).filter(
      (id) => !cloudEmpresas.has(id)
    ).length,
    visitas: (local.visitas || []).filter((item) => !cloudVisitas.has(item.id))
      .length,
    ncs: (local.ncs || []).filter((item) => !cloudNcs.has(item.id)).length,
    evidencias: (local.evidencias || []).filter(
      (item) => !cloudEvidencias.has(item.id)
    ).length,
  };
}

export function hasLocalOnlyRecords(counts: RecoveryCounts) {
  return Object.values(counts).some((count) => count > 0);
}

export function mergeForRecovery(local: AppDB, cloud: AppDB): AppDB {
  const empresaAtualId =
    local.empresaAtualId &&
    (local.empresas?.[local.empresaAtualId] || cloud.empresas?.[local.empresaAtualId])
      ? local.empresaAtualId
      : cloud.empresaAtualId;

  return {
    ...cloud,
    ...local,
    empresas: {
      ...(cloud.empresas || {}),
      ...(local.empresas || {}),
    },
    empresaAtualId: empresaAtualId || null,
    visitas: mergeById(cloud.visitas || [], local.visitas || []),
    ncs: mergeById(cloud.ncs || [], local.ncs || []),
    evidencias: mergeById(cloud.evidencias || [], local.evidencias || []),
  };
}
