import type { ProcedimentoOperacionalPadronizado } from "@/types";

export type SituacaoRevisaoPOP = {
  label: "Em elaboração" | "Em revisão" | "Inativo" | "Revisão não definida" | "Revisão vencida" | "Revisão próxima" | "Em dia";
  classe: string;
};

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

export function situacaoRevisaoPOP(
  pop: ProcedimentoOperacionalPadronizado,
  hoje = new Date().toISOString().slice(0, 10)
): SituacaoRevisaoPOP {
  if (pop.status === "Inativo") {
    return { label: "Inativo", classe: "bg-slate-100 text-slate-600" };
  }
  if (pop.status === "Rascunho") {
    return { label: "Em elaboração", classe: "bg-amber-50 text-amber-800" };
  }
  if (pop.status === "Em revisão") {
    return { label: "Em revisão", classe: "bg-blue-50 text-blue-800" };
  }
  if (!pop.proximaRevisao) {
    return { label: "Revisão não definida", classe: "bg-amber-50 text-amber-800" };
  }

  const hojeData = new Date(`${hoje}T12:00:00`);
  const revisaoData = new Date(`${pop.proximaRevisao}T12:00:00`);
  const dias = Math.ceil((revisaoData.getTime() - hojeData.getTime()) / 86400000);

  if (dias < 0) {
    return { label: "Revisão vencida", classe: "bg-red-50 text-red-700" };
  }
  if (dias <= 30) {
    return { label: "Revisão próxima", classe: "bg-amber-50 text-amber-800" };
  }
  return { label: "Em dia", classe: "bg-emerald-50 text-emerald-800" };
}

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
