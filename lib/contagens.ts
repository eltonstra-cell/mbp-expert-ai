// UMA fonte para cada número que aparece em mais de uma tela. As telas só mostram o que estes seletores devolvem.

type ItemComStatus = { status: string };
type NcContavel = { visitaId: string; empresaId?: string; status: string; inativaNoChecklist?: boolean };
type EvidenciaContavel = { tipo: string };

const plural = (n: number, singular: string, pluralTexto: string) => `${n} ${n === 1 ? singular : pluralTexto}`;

export type Progresso = {
  respondidos: number;
  total: number;
  percentual: number;
  /** "12/67" (menu). */
  curto: string;
  /** "12 de 67 itens respondidos". */
  frase: string;
};

/** Progresso do checklist: itens respondidos (qualquer resposta que não seja "Pendente", inclusive "Não se aplica") sobre todos os itens da visita. */
export function progressoDoChecklist(checklist: ItemComStatus[] | undefined): Progresso {
  const itens = checklist || [];
  const respondidos = itens.filter((item) => item.status !== "Pendente").length;
  const total = itens.length;
  return {
    respondidos,
    total,
    percentual: total ? Math.round((respondidos / total) * 100) : 0,
    curto: `${respondidos}/${total}`,
    frase: `${respondidos} de ${total} ${total === 1 ? "item respondido" : "itens respondidos"}`,
  };
}

/** Itens do checklist marcados "Não Conforme" (não é o número de correções). */
export function itensNaoConformes(checklist: ItemComStatus[] | undefined): number {
  return (checklist || []).filter((item) => item.status === "Não Conforme").length;
}

/** Correções abertas: ativas no checklist e ainda não resolvidas. Sem filtro, conta todas as recebidas. */
export function correcoesAbertas<N extends NcContavel>(ncs: N[] | undefined, filtro: { visitaId?: string; empresaId?: string; visitaIds?: Set<string> } = {}): number {
  return (ncs || []).filter(
    (nc) =>
      !nc.inativaNoChecklist &&
      nc.status !== "Resolvida" &&
      (filtro.visitaId === undefined || nc.visitaId === filtro.visitaId) &&
      (filtro.empresaId === undefined || nc.empresaId === filtro.empresaId) &&
      (filtro.visitaIds === undefined || filtro.visitaIds.has(nc.visitaId))
  ).length;
}

export type ContagemEvidencias = {
  fotos: number;
  audios: number;
  total: number;
  /** "16 fotos · 2 áudios"; "Nenhuma evidência" quando não há nenhuma. */
  texto: string;
};

/** Fotos e áudios separados; o total é a soma dos dois. */
export function contagemDeEvidencias(evidencias: EvidenciaContavel[] | undefined): ContagemEvidencias {
  const lista = evidencias || [];
  const fotos = lista.filter((ev) => ev.tipo === "Foto").length;
  const audios = lista.filter((ev) => ev.tipo === "Áudio").length;
  return {
    fotos,
    audios,
    total: fotos + audios,
    texto: fotos + audios === 0 ? "Nenhuma evidência" : `${plural(fotos, "foto", "fotos")} · ${plural(audios, "áudio", "áudios")}`,
  };
}
