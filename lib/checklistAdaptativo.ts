// Checklist adaptativo: no ambiente, sobem ao topo os itens que reprovaram nas últimas visitas da empresa (com selo) e vão para o fim, RECOLHIDOS,
// os que foram "Não se aplica" em todas as visitas recentes. Nada some: o bloco recolhido é aberto pelo RT e o item continua respondível.
// Só reordena a exibição; as respostas e a lista da visita não mudam. Usa as visitas que já estão no aparelho (funciona sem sinal).
import type { ChecklistItem } from "../types/index.ts";

type VisitaAnterior = { id: string; checklist?: ChecklistItem[] };

export const VISITAS_RECENTES = 3;
const MINIMO_PARA_RECOLHER = 2;

const mesmoItem = (a: ChecklistItem, b: ChecklistItem) => a.id === b.id || (a.titulo === b.titulo && a.ambiente === b.ambiente);

export type HistoricoDoItem = { reprovou: boolean; naoSeAplicaSempre: boolean };

/** `anteriores`: visitas mais recentes primeiro (só as da mesma empresa e anteriores à atual). */
export function historicoDoItem(item: ChecklistItem, anteriores: VisitaAnterior[]): HistoricoDoItem {
  const respostas = anteriores
    .slice(0, VISITAS_RECENTES)
    .map((visita) => (visita.checklist || []).find((outro) => mesmoItem(item, outro) && outro.status !== "Pendente")?.status)
    .filter((status): status is NonNullable<typeof status> => Boolean(status));
  return {
    reprovou: respostas.includes("Não Conforme"),
    naoSeAplicaSempre: respostas.length >= MINIMO_PARA_RECOLHER && respostas.every((status) => status === "Não se aplica"),
  };
}

export type OrdemAdaptativa = {
  itens: ChecklistItem[];
  reprovaram: Set<string>;
  recolhidos: Set<string>;
};

/** Reordena os itens DE CADA AMBIENTE (a ordem dos ambientes não muda): reprovados antes, normais, recolhidos no fim. */
export function ordemAdaptativa(itens: ChecklistItem[], anteriores: VisitaAnterior[]): OrdemAdaptativa {
  const reprovaram = new Set<string>();
  const recolhidos = new Set<string>();
  const peso = new Map<string, number>();
  for (const item of itens) {
    const h = historicoDoItem(item, anteriores);
    // A ORDEM só depende do histórico (não muda enquanto o RT responde); só o recolhimento visual respeita a resposta atual:
    // item que o RT já respondeu de outra forma nunca fica escondido.
    if (h.reprovou) reprovaram.add(item.id);
    if (h.naoSeAplicaSempre && (item.status === "Pendente" || item.status === "Não se aplica")) recolhidos.add(item.id);
    peso.set(item.id, h.reprovou ? 0 : h.naoSeAplicaSempre ? 2 : 1);
  }
  const ambientes = [...new Set(itens.map((item) => item.ambiente))];
  const saida: ChecklistItem[] = [];
  for (const ambiente of ambientes) {
    const doAmbiente = itens.filter((item) => item.ambiente === ambiente);
    saida.push(...doAmbiente.map((item, indice) => ({ item, indice })).sort((a, b) => (peso.get(a.item.id)! - peso.get(b.item.id)!) || a.indice - b.indice).map((x) => x.item));
  }
  // Mantém a ordem original dos ambientes dentro da lista recebida.
  const posicaoDoAmbiente = new Map<string, number>();
  itens.forEach((item) => {
    if (!posicaoDoAmbiente.has(item.ambiente)) posicaoDoAmbiente.set(item.ambiente, posicaoDoAmbiente.size);
  });
  saida.sort((a, b) => (posicaoDoAmbiente.get(a.ambiente)! - posicaoDoAmbiente.get(b.ambiente)!));
  return { itens: saida, reprovaram, recolhidos };
}
