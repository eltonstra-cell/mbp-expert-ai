import { etapaDaCorrecao, type EtapaCorrecao, type GravidadeNc, type NcDoPlano } from "./actionPlan.ts";
import { palavra } from "./plural.ts";

export type AgruparCorrecoes = "gravidade" | "ambiente";

export type GrupoDeCorrecoes<T> = { rotulo: string; faixa: "nc" | "amber" | "na" | "info"; itens: T[] };

const GRUPOS_DE_GRAVIDADE: { gravidade: GravidadeNc; rotulo: string; faixa: GrupoDeCorrecoes<unknown>["faixa"] }[] = [
  { gravidade: "Crítica", rotulo: "CRÍTICAS", faixa: "nc" },
  { gravidade: "Importante", rotulo: "IMPORTANTES", faixa: "amber" },
  { gravidade: "Rotina", rotulo: "LEVES", faixa: "na" },
];

/** Os grupos da lista, na mesma ordem em que aparecem na tela. Recebe a lista já ordenada. */
export function agruparCorrecoes<T extends { gravidade: GravidadeNc; ambiente: string }>(ordenados: T[], agrupar: AgruparCorrecoes): GrupoDeCorrecoes<T>[] {
  if (agrupar === "gravidade") {
    return GRUPOS_DE_GRAVIDADE.map((grupo) => ({ rotulo: grupo.rotulo, faixa: grupo.faixa, itens: ordenados.filter((nc) => nc.gravidade === grupo.gravidade) }));
  }
  return Array.from(new Set(ordenados.map((nc) => nc.ambiente || "Sem ambiente"))).map((ambiente) => ({
    rotulo: ambiente.toLocaleUpperCase("pt-BR"),
    faixa: "info" as const,
    itens: ordenados.filter((nc) => (nc.ambiente || "Sem ambiente") === ambiente),
  }));
}

/** A lista como a pessoa a vê, de cima para baixo (grupo a grupo). */
export function ordemVisual<T extends { gravidade: GravidadeNc; ambiente: string }>(ordenados: T[], agrupar: AgruparCorrecoes): T[] {
  return agruparCorrecoes(ordenados, agrupar).flatMap((grupo) => grupo.itens);
}

type ComId = NcDoPlano & { id: string };

/** Próxima correção "sem plano" (etapa Identificadas, pelo dado salvo) depois da atual, dando a volta ao fim; exclui a atual. */
export function proximaSemPlano<T extends ComId>(visiveisNaOrdem: T[], idAtual: string): string | null {
  const posicao = visiveisNaOrdem.findIndex((nc) => nc.id === idAtual);
  const depois = posicao < 0 ? visiveisNaOrdem : [...visiveisNaOrdem.slice(posicao + 1), ...visiveisNaOrdem.slice(0, posicao)];
  return depois.find((nc) => nc.id !== idAtual && etapaDaCorrecao(nc) === "identificadas")?.id ?? null;
}

/** Primeira correção sem plano da lista (na ordem dada), exceto a salva. Usada quando a lista visível não tem mais nenhuma. */
export function primeiraSemPlano<T extends ComId>(naOrdem: T[], idSalvo: string): string | null {
  return naOrdem.find((nc) => nc.id !== idSalvo && etapaDaCorrecao(nc) === "identificadas")?.id ?? null;
}

/** Quantas correções sem plano restam, sem contar a que acabou de ser salva (o estado do pai pode ainda não refletir o salvamento). Passe TODAS as correções da visita/empresa, não só as visíveis. */
export function restantesSemPlano<T extends ComId>(todas: T[], idSalvo: string): number {
  return todas.filter((nc) => nc.id !== idSalvo && etapaDaCorrecao(nc) === "identificadas").length;
}

export type AposSalvar = { etapa: EtapaCorrecao; selecionar: string; limparFiltros: boolean; aviso: string };

/** proximoId = próxima sem plano na lista visível; foraDoFiltroId = primeira sem plano em Identificadas ignorando os filtros rápidos; restantes = total em Identificadas menos a salva. */
export function aposSalvarPlano({ etapaAntes, proximoId, foraDoFiltroId = null, idSalvo, restantes }: { etapaAntes: EtapaCorrecao; proximoId: string | null; foraDoFiltroId?: string | null; idSalvo: string; restantes: number }): AposSalvar {
  if (etapaAntes !== "identificadas") return { etapa: etapaAntes, selecionar: idSalvo, limparFiltros: false, aviso: "Plano salvo." };
  const aviso = `Plano salvo. ${palavra(restantes, "Falta", "Faltam")} ${restantes} sem plano.`;
  if (proximoId && proximoId !== idSalvo) return { etapa: "identificadas", selecionar: proximoId, limparFiltros: false, aviso };
  if (foraDoFiltroId && foraDoFiltroId !== idSalvo) return { etapa: "identificadas", selecionar: foraDoFiltroId, limparFiltros: true, aviso };
  return { etapa: "plano", selecionar: idSalvo, limparFiltros: true, aviso: "Plano salvo. Não há mais correções sem plano." };
}
