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

// ===== Correções: esteira, prazo sugerido, reincidência e validação =====

export type GravidadeNc = "Crítica" | "Importante" | "Rotina";
export type EtapaCorrecao = "identificadas" | "plano" | "acompanhamento" | "resolvidas";

/**
 * Esteira de 4 etapas sobre os status que já existem (Aberta / Em tratamento / Resolvida):
 * Identificadas = aberta com plano incompleto; Com plano = aberta com ação, responsável e prazo;
 * Em acompanhamento = "Em tratamento"; Resolvidas = "Resolvida".
 */
export function etapaDaCorrecao(nc: NcDoPlano): EtapaCorrecao {
  if (nc.status === "Resolvida") return "resolvidas";
  if (nc.status === "Em tratamento") return "acompanhamento";
  return planoPorDefinir(nc) ? "identificadas" : "plano";
}

export const ORDEM_ETAPAS: EtapaCorrecao[] = ["identificadas", "plano", "acompanhamento", "resolvidas"];

export function contarEtapas(ncs: NcDoPlano[]): Record<EtapaCorrecao, number> {
  const total: Record<EtapaCorrecao, number> = { identificadas: 0, plano: 0, acompanhamento: 0, resolvidas: 0 };
  ncs.forEach((nc) => {
    total[etapaDaCorrecao(nc)] += 1;
  });
  return total;
}

/** Quantas bolinhas de progresso ficam acesas (1 a 4). */
export function progressoDaCorrecao(nc: NcDoPlano): number {
  return ORDEM_ETAPAS.indexOf(etapaDaCorrecao(nc)) + 1;
}

export const DIAS_POR_GRAVIDADE: Record<GravidadeNc, number> = { Crítica: 7, Importante: 15, Rotina: 30 };

function somarDias(isoData: string, dias: number): string {
  const [ano, mes, dia] = isoData.split("-").map(Number);
  const data = new Date(Date.UTC(ano, (mes || 1) - 1, dia || 1));
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

export function prazoSugerido(gravidade: GravidadeNc, hoje: string): { dias: number; data: string } {
  const dias = DIAS_POR_GRAVIDADE[gravidade] ?? DIAS_POR_GRAVIDADE.Rotina;
  return { dias, data: somarDias(hoje, dias) };
}

/**
 * Prazo mostrado na lista de correções: o prazo gravado, contado em dias a partir de hoje, ou, quando ainda não há
 * plano com data, o prazo sugerido pela gravidade (`prazoSugerido`: Crítica 7, Importante 15, Rotina 30 dias).
 */
export function prazoParaExibir(nc: { prazo?: string; gravidade: GravidadeNc }, hoje: string): { dias: number; sugerido: boolean } {
  const prazo = (nc.prazo || "").trim();
  if (!prazo) return { dias: prazoSugerido(nc.gravidade, hoje).dias, sugerido: true };
  const emMs = (iso: string) => {
    const [ano, mes, dia] = iso.split("-").map(Number);
    return Date.UTC(ano, (mes || 1) - 1, dia || 1);
  };
  return { dias: Math.round((emMs(prazo) - emMs(hoje)) / 86400000), sugerido: false };
}

/** "prazo em 7 dias" (tablet) ou "7 dias" (celular); vencido vira "vencido há N dias". */
export function textoDoPrazo(dias: number, curto: boolean): string {
  if (dias < 0) return `vencido há ${-dias} ${dias === -1 ? "dia" : "dias"}`;
  if (dias === 0) return curto ? "hoje" : "prazo hoje";
  const quantos = `${dias} ${dias === 1 ? "dia" : "dias"}`;
  return curto ? quantos : `prazo em ${quantos}`;
}

type NcComCriterio = {
  id: string;
  empresaId: string;
  visitaId: string;
  ambiente: string;
  categoria: string;
  titulo: string;
};

/** Mesma chave de critério usada na comparação entre visitas (ambiente + categoria + título). */
export function chaveDoCriterio(nc: { ambiente?: string; categoria?: string; titulo?: string }): string {
  return [nc.ambiente, nc.categoria, nc.titulo].map((parte) => (parte || "").trim().toLocaleLowerCase("pt-BR")).join("|");
}

/**
 * Reincidência: mesma empresa e mesmo critério com NC em visita ANTERIOR.
 * `dataDaVisita` informa a data (AAAA-MM-DD) de cada visita; só visitas mais antigas contam.
 */
export function reincidenciaDaNc(
  nc: NcComCriterio,
  todas: NcComCriterio[],
  dataDaVisita: (visitaId: string) => string
): { reincidente: boolean; visitaAnteriorId: string; dataAnterior: string } {
  const minhaData = dataDaVisita(nc.visitaId);
  const chave = chaveDoCriterio(nc);
  const anteriores = todas
    .filter((outra) => outra.id !== nc.id && outra.empresaId === nc.empresaId && outra.visitaId !== nc.visitaId && chaveDoCriterio(outra) === chave)
    .map((outra) => ({ visitaId: outra.visitaId, data: dataDaVisita(outra.visitaId) }))
    .filter((registro) => registro.data && registro.data < minhaData)
    .sort((a, b) => b.data.localeCompare(a.data));
  if (anteriores.length === 0) return { reincidente: false, visitaAnteriorId: "", dataAnterior: "" };
  return { reincidente: true, visitaAnteriorId: anteriores[0].visitaId, dataAnterior: anteriores[0].data };
}

const PESO_GRAVIDADE: Record<GravidadeNc, number> = { Crítica: 0, Importante: 1, Rotina: 2 };

/** Ordena por gravidade; dentro dela, as reincidentes primeiro. */
export function ordenarCorrecoes<T extends { gravidade: GravidadeNc; reincidente: boolean }>(itens: T[]): T[] {
  return [...itens].sort(
    (a, b) => PESO_GRAVIDADE[a.gravidade] - PESO_GRAVIDADE[b.gravidade] || Number(b.reincidente) - Number(a.reincidente)
  );
}

export type ErrosDoPlano = { acao?: string; responsavel?: string; prazo?: string };

/** Validação no campo ao salvar o plano; `comPlano` é verdadeiro ao marcar "Com plano" ou além. */
export function validarPlano(
  plano: { acaoCorretiva: string; responsavelAcao: string; prazo: string },
  hoje: string,
  comPlano: boolean
): ErrosDoPlano {
  const erros: ErrosDoPlano = {};
  if (plano.prazo && plano.prazo < hoje) erros.prazo = "O prazo não pode estar no passado.";
  if (comPlano) {
    if (!plano.acaoCorretiva.trim()) erros.acao = "Defina a ação corretiva.";
    if (!plano.responsavelAcao.trim()) erros.responsavel = "Informe o responsável.";
    if (!plano.prazo) erros.prazo = erros.prazo || "Defina o prazo.";
  }
  return erros;
}

/** Contagem de NCs por gravidade, incluindo as leves (gravidade "Rotina"). */
export function contarNcsPorGravidade(ncs: { criticidade?: string }[]): { criticas: number; importantes: number; leves: number } {
  let criticas = 0;
  let importantes = 0;
  let leves = 0;
  for (const nc of ncs) {
    if (nc.criticidade === "Crítica") criticas += 1;
    else if (nc.criticidade === "Importante") importantes += 1;
    else leves += 1;
  }
  return { criticas, importantes, leves };
}
