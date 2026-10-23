// "Marcar o restante como Conforme" por ambiente: só itens ainda Pendentes; os que reprovaram na visita anterior ficam de fora (resposta individual).
// A marca `lote` fica no item (registro honesto no relatório) e some assim que o RT responde o item de outra forma.
import type { ChecklistItem } from "../types/index.ts";

export type PlanoDoLote = {
  /** Itens que o lote vai marcar como Conforme. */
  marcar: ChecklistItem[];
  /** Pendentes que reprovaram na visita anterior: continuam para resposta individual. */
  individuais: ChecklistItem[];
};

export function planoDoLote(checklist: ChecklistItem[], ambiente: string, reprovaramAntes: Set<string>): PlanoDoLote {
  const pendentes = checklist.filter((item) => item.ambiente === ambiente && item.status === "Pendente");
  return {
    marcar: pendentes.filter((item) => !reprovaramAntes.has(item.id)),
    individuais: pendentes.filter((item) => reprovaramAntes.has(item.id)),
  };
}

export function aplicarLote(checklist: ChecklistItem[], ids: string[], emISO: string): ChecklistItem[] {
  const alvo = new Set(ids);
  return checklist.map((item) => (alvo.has(item.id) && item.status === "Pendente" ? { ...item, status: "Conforme" as const, observacao: "", lote: { em: emISO } } : item));
}

/** Desfaz só o que ainda é daquele lote (mesmo instante) e continua Conforme; o que o RT já mexeu fica como está. */
export function desfazerLote(checklist: ChecklistItem[], ids: string[], emISO: string): ChecklistItem[] {
  const alvo = new Set(ids);
  return checklist.map((item) => {
    if (!alvo.has(item.id) || item.status !== "Conforme" || item.lote?.em !== emISO) return item;
    const { lote: _lote, ...resto } = item;
    return { ...resto, status: "Pendente" as const };
  });
}

export const contarEmLote = (checklist: ChecklistItem[]): number => checklist.filter((item) => item.lote).length;

export function textoDaConfirmacaoDoLote(ambiente: string, plano: PlanoDoLote): string {
  const n = plano.marcar.length;
  const base = `Marcar ${n === 1 ? "1 item" : `${n} itens`} pendentes de ${ambiente} como Conforme?`;
  const i = plano.individuais.length;
  const resto = i > 0 ? `\n\n${i === 1 ? "1 item que reprovou" : `${i} itens que reprovaram`} na visita anterior ${i === 1 ? "fica" : "ficam"} para resposta individual.` : "";
  return `${base}${resto}\n\nFica registrado como resposta em lote no relatório. Dá para desfazer em seguida.`;
}
