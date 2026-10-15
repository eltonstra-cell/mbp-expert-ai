// Ocultar um ambiente da visita sem apagar as respostas: os itens saem do checklist
// (e, com isso, de contagens, progresso, relatório e trilha) e ficam guardados na própria
// visita até o ambiente ser mostrado de novo. Tudo dentro do documento da visita; não há
// mudança de schema.

type ItemBase = { id: string; ambiente: string; status: string };
type NcBase = { checklistItemId: string; inativaNoChecklist?: boolean };

export type AmbienteOcultoGuardado<I extends ItemBase = ItemBase> = {
  ambiente: string;
  itens: I[];
  modelo?: string;
  ocultadoEm: string;
};

export type VisitaComOcultos<I extends ItemBase = ItemBase> = {
  ambientes?: string[];
  checklist?: I[];
  ambientesOcultos?: AmbienteOcultoGuardado<I>[];
  modelosQuestionarioAmbientes?: Record<string, string>;
};

export function contarRespostas(itens: ItemBase[]): number {
  return itens.filter((item) => item.status !== "Pendente").length;
}

export function ocultarAmbiente<I extends ItemBase, N extends NcBase, V extends VisitaComOcultos<I>>(
  visita: V,
  ncs: N[],
  ambiente: string,
  agora: string
): { visita: V; ncs: N[] } {
  const itens = (visita.checklist || []).filter((item) => item.ambiente === ambiente);
  const ids = new Set(itens.map((item) => item.id));
  const restantes = (visita.ambientesOcultos || []).filter((oculto) => oculto.ambiente !== ambiente);
  return {
    visita: {
      ...visita,
      ambientes: (visita.ambientes || []).filter((nome) => nome !== ambiente),
      checklist: (visita.checklist || []).filter((item) => item.ambiente !== ambiente),
      ambientesOcultos: [
        ...restantes,
        { ambiente, itens, modelo: visita.modelosQuestionarioAmbientes?.[ambiente], ocultadoEm: agora },
      ],
    },
    ncs: ncs.map((nc) => (ids.has(nc.checklistItemId) ? { ...nc, inativaNoChecklist: true } : nc)),
  };
}

export function mostrarAmbiente<I extends ItemBase, N extends NcBase, V extends VisitaComOcultos<I>>(
  visita: V,
  ncs: N[],
  ambiente: string
): { visita: V; ncs: N[] } {
  const oculto = (visita.ambientesOcultos || []).find((registro) => registro.ambiente === ambiente);
  if (!oculto) return { visita, ncs };
  const ids = new Set(oculto.itens.map((item) => item.id));
  const ambientes = visita.ambientes || [];
  return {
    visita: {
      ...visita,
      ambientes: ambientes.includes(ambiente) ? ambientes : [...ambientes, ambiente],
      checklist: [...(visita.checklist || []), ...oculto.itens],
      ambientesOcultos: (visita.ambientesOcultos || []).filter((registro) => registro.ambiente !== ambiente),
      modelosQuestionarioAmbientes:
        oculto.modelo !== undefined
          ? { ...(visita.modelosQuestionarioAmbientes || {}), [ambiente]: oculto.modelo }
          : visita.modelosQuestionarioAmbientes,
    },
    ncs: ncs.map((nc) => (ids.has(nc.checklistItemId) && nc.inativaNoChecklist ? { ...nc, inativaNoChecklist: false } : nc)),
  };
}

/** Exclusão definitiva: só do ambiente oculto; devolve também quantas respostas serão perdidas. */
export function excluirAmbienteOculto<I extends ItemBase, V extends VisitaComOcultos<I>>(
  visita: V,
  ambiente: string
): { visita: V; respostasPerdidas: number } {
  const oculto = (visita.ambientesOcultos || []).find((registro) => registro.ambiente === ambiente);
  if (!oculto) return { visita, respostasPerdidas: 0 };
  return {
    visita: {
      ...visita,
      ambientesOcultos: (visita.ambientesOcultos || []).filter((registro) => registro.ambiente !== ambiente),
    },
    respostasPerdidas: contarRespostas(oculto.itens),
  };
}

export function resumoOcultos<I extends ItemBase>(visita: VisitaComOcultos<I>): { ambiente: string; respostas: number }[] {
  return (visita.ambientesOcultos || []).map((oculto) => ({
    ambiente: oculto.ambiente,
    respostas: contarRespostas(oculto.itens),
  }));
}
