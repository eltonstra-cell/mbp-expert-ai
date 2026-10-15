export type NcDoPlano = {
  status: "Aberta" | "Em tratamento" | "Resolvida";
  acaoCorretiva?: string;
  responsavelAcao?: string;
  prazo?: string;
};

export type ResumoPlano = {
  semAcao: number;
  emAndamento: number;
  atrasadas: number;
  resolvidas: number;
};

// Prazo vencido = data de prazo anterior a hoje e NC ainda não resolvida (datas ISO AAAA-MM-DD).
export function ncAtrasada(nc: NcDoPlano, hoje: string): boolean {
  const prazo = (nc.prazo || "").trim();
  if (nc.status === "Resolvida" || !prazo) return false;
  return prazo < hoje;
}

// Plano incompleto: falta a ação corretiva, o responsável ou o prazo, e a NC não foi resolvida.
export function planoPorDefinir(nc: NcDoPlano): boolean {
  if (nc.status === "Resolvida") return false;
  return !nc.acaoCorretiva?.trim() || !nc.responsavelAcao?.trim() || !nc.prazo?.trim();
}

export function resumoDoPlano(ncs: NcDoPlano[], hoje: string): ResumoPlano {
  return {
    semAcao: ncs.filter(planoPorDefinir).length,
    emAndamento: ncs.filter((nc) => nc.status === "Em tratamento").length,
    atrasadas: ncs.filter((nc) => ncAtrasada(nc, hoje)).length,
    resolvidas: ncs.filter((nc) => nc.status === "Resolvida").length,
  };
}

export type SituacaoPlano = "Resolvida" | "Atrasada" | "Em andamento" | "A definir" | "Pronta para iniciar";

export function situacaoDoPlano(nc: NcDoPlano, hoje: string): SituacaoPlano {
  if (nc.status === "Resolvida") return "Resolvida";
  if (ncAtrasada(nc, hoje)) return "Atrasada";
  if (nc.status === "Em tratamento") return "Em andamento";
  return planoPorDefinir(nc) ? "A definir" : "Pronta para iniciar";
}

// Aplicar em lote: só as NCs selecionadas que ainda não foram resolvidas, e só os campos preenchidos.
export function alteracoesEmLote<T extends NcDoPlano & { id: string }>(
  ncs: T[],
  selecionadas: string[],
  valores: { responsavel: string; prazo: string }
): { id: string; patch: { responsavelAcao?: string; prazo?: string } }[] {
  const responsavel = valores.responsavel.trim();
  const prazo = valores.prazo.trim();
  if (!responsavel && !prazo) return [];
  return ncs
    .filter((nc) => selecionadas.includes(nc.id) && nc.status !== "Resolvida")
    .map((nc) => ({
      id: nc.id,
      patch: { ...(responsavel ? { responsavelAcao: responsavel } : {}), ...(prazo ? { prazo } : {}) },
    }));
}
