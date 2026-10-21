import type { AppDB } from "@/types";

export type RecoveryCounts = {
  empresas: number;
  visitas: number;
  ncs: number;
  evidencias: number;
  /** Coleções novas (opcionais no estado). */
  registrosPop: number;
  comprovantes: number;
  colaboradores: number;
  capacitacoes: number;
  leiturasPop: number;
  /** Só o servidor grava relatórios emitidos: o que existir só neste computador fica visível, mas não volta por aqui. */
  relatoriosEmitidos: number;
};

/** Coleções de lista com `id` que entram na conta e na mesclagem de recuperação. */
const COLECOES_NOVAS = ["registrosPop", "comprovantes", "colaboradores", "capacitacoes", "leiturasPop", "relatoriosEmitidos"] as const;

function ids<T extends { id: string }>(items: T[]) {
  return new Set(items.map((item) => item.id));
}

function mergeById<T extends { id: string }>(cloud: T[], local: T[]) {
  const merged = new Map<string, T>();
  for (const item of cloud) merged.set(item.id, item);
  for (const item of local) merged.set(item.id, item);
  return [...merged.values()];
}

function soNoLocal<T extends { id: string }>(local: T[] | undefined, cloud: T[] | undefined): number {
  const naNuvem = ids(cloud || []);
  return (local || []).filter((item) => !naNuvem.has(item.id)).length;
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
    registrosPop: soNoLocal(local.registrosPop, cloud.registrosPop),
    comprovantes: soNoLocal(local.comprovantes, cloud.comprovantes),
    colaboradores: soNoLocal(local.colaboradores, cloud.colaboradores),
    capacitacoes: soNoLocal(local.capacitacoes, cloud.capacitacoes),
    leiturasPop: soNoLocal(local.leiturasPop, cloud.leiturasPop),
    relatoriosEmitidos: soNoLocal(local.relatoriosEmitidos, cloud.relatoriosEmitidos),
  };
}

export function hasLocalOnlyRecords(counts: RecoveryCounts) {
  return Object.values(counts).some((count) => count > 0);
}

/** "2 empresas, 3 visitas e 1 comprovante": só o que existe, no singular ou plural certo. */
export function textoDaRecuperacao(counts: RecoveryCounts): string {
  const itens: [number, string, string][] = [
    [counts.empresas, "empresa", "empresas"],
    [counts.visitas, "visita", "visitas"],
    [counts.ncs, "não conformidade", "não conformidades"],
    [counts.evidencias, "evidência", "evidências"],
    [counts.registrosPop, "registro por POP", "registros por POP"],
    [counts.comprovantes, "comprovante", "comprovantes"],
    [counts.colaboradores, "pessoa da equipe", "pessoas da equipe"],
    [counts.capacitacoes, "capacitação", "capacitações"],
    [counts.leiturasPop, "leitura de POP", "leituras de POP"],
  ];
  const partes = itens.filter(([n]) => n > 0).map(([n, singular, plural]) => `${n} ${n === 1 ? singular : plural}`);
  if (partes.length === 0) return "nenhum registro";
  return partes.length === 1 ? partes[0] : `${partes.slice(0, -1).join(", ")} e ${partes[partes.length - 1]}`;
}

export function mergeForRecovery(local: AppDB, cloud: AppDB): AppDB {
  const empresaAtualId =
    local.empresaAtualId &&
    (local.empresas?.[local.empresaAtualId] || cloud.empresas?.[local.empresaAtualId])
      ? local.empresaAtualId
      : cloud.empresaAtualId;

  const novas = Object.fromEntries(
    COLECOES_NOVAS.filter((chave) => (local[chave] || cloud[chave]) !== undefined).map((chave) => [
      chave,
      mergeById<{ id: string }>((cloud[chave] as { id: string }[] | undefined) || [], (local[chave] as { id: string }[] | undefined) || []),
    ])
  );

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
    ...novas,
  };
}
