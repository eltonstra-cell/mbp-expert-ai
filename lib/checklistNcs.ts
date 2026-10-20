// Mantém a não conformidade ligada a um item do checklist em dia com a resposta e a gravidade do item.
import type { ChecklistItem, NaoConformidade } from "../types/index.ts";

export function sincronizarNcDoItem(
  ncs: NaoConformidade[],
  visita: { id: string; empresaId: string },
  item: ChecklistItem,
  agoraIso: string
): NaoConformidade[] {
  const idNc = `${visita.id}:${item.id}`;
  if (item.status === "Não Conforme") {
    const existente = ncs.find((nc) => nc.id === idNc);
    // Item que volta a "Não Conforme" depois de ter saído: a correção reabre e o histórico registra isso.
    const reaberta = !!existente && !!existente.inativaNoChecklist;
    const nc = {
      id: idNc,
      empresaId: visita.empresaId,
      visitaId: visita.id,
      ambiente: item.ambiente,
      checklistItemId: item.id,
      titulo: item.titulo,
      categoria: item.categoria,
      criticidade: item.criticidade || ("Rotina" as const),
      referencia: item.referencia || "",
      orientacao: item.orientacao || "",
      observacao: item.observacao || "",
      prioridade: item.criticidade || "Rotina",
      status: reaberta ? ("Aberta" as const) : existente?.status || ("Aberta" as const),
      ...(reaberta
        ? {
            resolvidaEm: undefined,
            historicoAcompanhamento: [
              ...(existente.historicoAcompanhamento || []),
              { id: `${idNc}:reaberta:${agoraIso}`, criadoEm: agoraIso, observacao: "Reaberta: item voltou a Não conforme", status: "Aberta" as const },
            ],
          }
        : {}),
      inativaNoChecklist: false,
      canceladaPeloUsuarioEm: undefined,
      criadoEm: existente?.criadoEm || agoraIso,
    } as NaoConformidade;
    return existente ? ncs.map((x) => (x.id === idNc ? { ...x, ...nc } : x)) : [nc, ...ncs];
  }
  // Não apaga a NC: apenas a retira dos módulos ativos. Se o item voltar a "Não Conforme",
  // todo o plano, evidências e histórico reaparecem.
  return ncs.map((nc) => (nc.id === idNc ? { ...nc, inativaNoChecklist: true } : nc));
}
