// Aba Evolução: conformidade por ambiente no mês e comparação com os meses anteriores, reincidentes, tempo médio para
// resolver e correções resolvidas no mês. Tudo calculado dos dados que o app já tem; com pouco dado, não compara.
import type { NaoConformidade, Visita } from "../types/index.ts";

export const MINIMO_GERAL = 10;
export const MINIMO_POR_AMBIENTE = 5;
export const MINIMO_PARA_TEMPO_MEDIO = 3;
export const REINCIDENCIA_MINIMA = 3;
export const MENSAGEM_POUCOS_DADOS = "Poucos dados para comparar.";

export type PeriodoEmMeses = 6 | 12;

export type ContagemDeRespostas = { respondidos: number; conformes: number; naoConformes: number };

export type MesDaEvolucao = ContagemDeRespostas & {
  /** AAAA-MM */
  mes: string;
  rotulo: string;
  percentual: number | null;
  /** Respostas suficientes para comparar com outro mês. */
  suficiente: boolean;
};

export type AmbienteNoMes = ContagemDeRespostas & {
  ambiente: string;
  percentual: number | null;
  suficiente: boolean;
  /** Pontos percentuais contra o mês anterior com dados suficientes; null quando não dá para comparar. */
  variacao: number | null;
  mesComparado?: string;
};

export type Reincidente = { chave: string; titulo: string; categoria: string; ambiente: string; visitas: number };

export type EvolucaoDaEmpresa = {
  periodo: PeriodoEmMeses;
  mesAtual: string;
  serie: MesDaEvolucao[];
  ambientes: AmbienteNoMes[];
  reincidentes: Reincidente[];
  tempoMedioParaResolverDias: number | null;
  resolvidasNoTempoMedio: number;
  resolvidasNoMes: number;
  mensagemDeDados: string | null;
};

const NOMES_DOS_MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function mesDe(dataIso: string): string {
  return dataIso.slice(0, 7);
}

export function rotuloDoMes(mes: string): string {
  const [ano, m] = mes.split("-").map(Number);
  return `${NOMES_DOS_MESES[m - 1] || mes}/${ano}`;
}

export function somarMesesAoMes(mes: string, delta: number): string {
  const [ano, m] = mes.split("-").map(Number);
  const total = ano * 12 + (m - 1) + delta;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

function contar(itens: { status: string }[]): ContagemDeRespostas {
  const conformes = itens.filter((item) => item.status === "Conforme").length;
  const naoConformes = itens.filter((item) => item.status === "Não Conforme").length;
  return { conformes, naoConformes, respondidos: conformes + naoConformes };
}

const percentual = (c: ContagemDeRespostas) => (c.respondidos ? Math.round((c.conformes / c.respondidos) * 100) : null);

const diasEntreDatas = (de: string, ate: string) => Math.round((Date.parse(`${ate.slice(0, 10)}T12:00:00Z`) - Date.parse(`${de.slice(0, 10)}T12:00:00Z`)) / 86400000);

/** Mesmo critério: mesma categoria e mesmo título no mesmo ambiente; reincidente = aparece em 3 visitas ou mais. */
export function reincidentesDaEmpresa(ncs: Pick<NaoConformidade, "titulo" | "categoria" | "ambiente" | "visitaId" | "inativaNoChecklist">[], minimo = REINCIDENCIA_MINIMA): Reincidente[] {
  const grupos = new Map<string, { titulo: string; categoria: string; ambiente: string; visitas: Set<string> }>();
  for (const nc of ncs) {
    if (nc.inativaNoChecklist) continue;
    const chave = `${nc.ambiente}|${nc.categoria}|${nc.titulo}`;
    const grupo = grupos.get(chave) || { titulo: nc.titulo, categoria: nc.categoria, ambiente: nc.ambiente, visitas: new Set<string>() };
    grupo.visitas.add(nc.visitaId);
    grupos.set(chave, grupo);
  }
  return [...grupos.entries()]
    .map(([chave, grupo]) => ({ chave, titulo: grupo.titulo, categoria: grupo.categoria, ambiente: grupo.ambiente, visitas: grupo.visitas.size }))
    .filter((item) => item.visitas >= minimo)
    .sort((a, b) => b.visitas - a.visitas || a.titulo.localeCompare(b.titulo, "pt-BR"));
}

export function evolucaoDaEmpresa(dados: { visitas: Visita[]; ncs: NaoConformidade[]; hoje: string; periodo: PeriodoEmMeses }): EvolucaoDaEmpresa {
  const mesAtual = mesDe(dados.hoje);
  const meses = Array.from({ length: dados.periodo }, (_, i) => somarMesesAoMes(mesAtual, i - (dados.periodo - 1)));
  const respostasPorMes = new Map<string, { status: string; ambiente: string }[]>();
  for (const visita of dados.visitas) {
    const mes = mesDe(visita.data);
    const lista = respostasPorMes.get(mes) || [];
    for (const item of visita.checklist || []) lista.push({ status: item.status, ambiente: item.ambiente });
    respostasPorMes.set(mes, lista);
  }

  const serie: MesDaEvolucao[] = meses.map((mes) => {
    const c = contar(respostasPorMes.get(mes) || []);
    return { mes, rotulo: rotuloDoMes(mes), ...c, percentual: percentual(c), suficiente: c.respondidos >= MINIMO_GERAL };
  });

  // Conformidade por ambiente no mês atual e comparação com o mês anterior que tiver dados suficientes.
  const doMesAtual = respostasPorMes.get(mesAtual) || [];
  const ambientes = [...new Set(doMesAtual.map((item) => item.ambiente))].sort((a, b) => a.localeCompare(b, "pt-BR")).map((ambiente): AmbienteNoMes => {
    const c = contar(doMesAtual.filter((item) => item.ambiente === ambiente));
    const suficiente = c.respondidos >= MINIMO_POR_AMBIENTE;
    let variacao: number | null = null;
    let mesComparado: string | undefined;
    if (suficiente) {
      for (const mes of [...meses].reverse().filter((m) => m < mesAtual)) {
        const anterior = contar((respostasPorMes.get(mes) || []).filter((item) => item.ambiente === ambiente));
        if (anterior.respondidos >= MINIMO_POR_AMBIENTE) {
          variacao = (percentual(c) as number) - (percentual(anterior) as number);
          mesComparado = mes;
          break;
        }
      }
    }
    return { ambiente, ...c, percentual: percentual(c), suficiente, variacao, mesComparado };
  });

  const resolvidas = dados.ncs.filter((nc) => nc.status === "Resolvida" && nc.resolvidaEm && !nc.inativaNoChecklist);
  const comTempo = resolvidas.filter((nc) => nc.criadoEm && diasEntreDatas(nc.criadoEm, nc.resolvidaEm as string) >= 0);
  const tempoMedio = comTempo.length >= MINIMO_PARA_TEMPO_MEDIO ? Math.round((comTempo.reduce((soma, nc) => soma + diasEntreDatas(nc.criadoEm, nc.resolvidaEm as string), 0) / comTempo.length) * 10) / 10 : null;
  const resolvidasNoMes = resolvidas.filter((nc) => mesDe(nc.resolvidaEm as string) === mesAtual).length;

  const comDados = serie.filter((mes) => mes.respondidos > 0).length;
  return {
    periodo: dados.periodo,
    mesAtual,
    serie,
    ambientes,
    reincidentes: reincidentesDaEmpresa(dados.ncs),
    tempoMedioParaResolverDias: tempoMedio,
    resolvidasNoTempoMedio: comTempo.length,
    resolvidasNoMes,
    mensagemDeDados: comDados < 2 ? MENSAGEM_POUCOS_DADOS : null,
  };
}
