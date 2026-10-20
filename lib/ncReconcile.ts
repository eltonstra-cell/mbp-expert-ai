// Conciliação entre "itens não conformes no checklist" e "não conformidades registradas".
// Só LÊ: nunca altera dado. As duas contagens podem divergir quando uma NC continua ativa
// mas o item que a originou foi removido ou deixou de ser "Não Conforme" (ex.: ambiente removido
// da visita no fluxo antigo, checklist reconstruído, dado importado).

type ItemBase = { id: string; status: string };
type NcBase = { id: string; checklistItemId: string; inativaNoChecklist?: boolean };

export type Conciliacao = {
  itensNaoConformes: number;
  ncsRegistradas: number;
  /** NCs ativas cujo item não existe mais ou não está "Não Conforme". */
  ncsSemItem: string[];
  /** Itens "Não Conforme" que não têm NC ativa. */
  itensSemNc: string[];
  diverge: boolean;
};

/** A NC é criada com o id da visita + item; o checklistItemId guarda o item de origem. */
export function conciliarNcs<I extends ItemBase, N extends NcBase>(checklist: I[], ncs: N[]): Conciliacao {
  const ativas = ncs.filter((nc) => !nc.inativaNoChecklist);
  const naoConformes = checklist.filter((item) => item.status === "Não Conforme");
  const idsNaoConformes = new Set(naoConformes.map((item) => item.id));
  const ncsSemItem = ativas.filter((nc) => !idsNaoConformes.has(nc.checklistItemId)).map((nc) => nc.id);
  const idsComNc = new Set(ativas.map((nc) => nc.checklistItemId));
  const itensSemNc = naoConformes.filter((item) => !idsComNc.has(item.id)).map((item) => item.id);
  return {
    itensNaoConformes: naoConformes.length,
    ncsRegistradas: ativas.length,
    ncsSemItem,
    itensSemNc,
    diverge: naoConformes.length !== ativas.length || ncsSemItem.length > 0 || itensSemNc.length > 0,
  };
}

export function frasesDaConciliacao(c: Conciliacao): string[] {
  const frases = [`${c.itensNaoConformes} ${c.itensNaoConformes === 1 ? "item não conforme" : "itens não conformes"} no checklist`, `${c.ncsRegistradas} ${c.ncsRegistradas === 1 ? "não conformidade registrada" : "não conformidades registradas"}`];
  if (c.ncsSemItem.length > 0) {
    frases.push(`${c.ncsSemItem.length} ${c.ncsSemItem.length === 1 ? "registro sem item" : "registros sem item"} não conforme correspondente no checklist`);
  }
  return frases;
}

/** Aviso curto para o Início quando o checklist e as correções registradas não batem; nada quando estão de acordo. */
export function avisoDeDivergencia(c: Conciliacao): string | null {
  if (!c.diverge) return null;
  const itens = `${c.itensNaoConformes} ${c.itensNaoConformes === 1 ? "item não conforme" : "itens não conformes"}`;
  const registradas = `${c.ncsRegistradas} ${c.ncsRegistradas === 1 ? "registrada" : "registradas"}`;
  return `O checklist tem ${itens} e há ${registradas}.`;
}
