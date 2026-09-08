import type { ProcedimentoOperacionalPadronizado } from "@/types";

export const SUGESTOES_POPS_MANUAL = [
  {
    codigo: "POP-01",
    titulo: "Higienização de instalações, equipamentos e móveis",
    programaRelacionado: "Limpeza e higienização/sanitização",
  },
  {
    codigo: "POP-02",
    titulo: "Controle da potabilidade da água",
    programaRelacionado: "Controle da potabilidade da água",
  },
  {
    codigo: "POP-03",
    titulo: "Monitoramento de temperatura de equipamentos",
    programaRelacionado: "Controle de temperatura",
  },
] as const;

export function normalizarPops(
  pops?: ProcedimentoOperacionalPadronizado[]
): ProcedimentoOperacionalPadronizado[] {
  if (!Array.isArray(pops)) return [];
  return pops
    .filter((pop) => pop && (pop.titulo || pop.codigo))
    .map((pop, indice) => ({
      id: pop.id || `pop-${indice + 1}`,
      codigo: pop.codigo || "",
      titulo: pop.titulo || "",
      versao: pop.versao || "",
      status: pop.status || "Rascunho",
      programaRelacionado: pop.programaRelacionado || "",
      responsavel: pop.responsavel || "",
      proximaRevisao: pop.proximaRevisao || "",
    }));
}
