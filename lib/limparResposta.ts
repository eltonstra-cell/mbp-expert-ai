// Limpar a resposta de um item do checklist, sem apagar a Correção (NC) ligada a ela (ela fica cancelada pelo usuário).
import { gravidadeSugerida } from "./checklistUi.ts";
import type { ChecklistItem, NaoConformidade } from "../types/index.ts";

type ItemComMemoria = ChecklistItem & { observacaoNCMemoria?: string };

export function idDaNcDoItem(visitaId: string, itemId: string) {
  return `${visitaId}:${itemId}`;
}

export function temResposta(item: Pick<ChecklistItem, "status">) {
  return item.status !== "Pendente";
}

/** O que, além da marcação, se perderia da tela ao limpar. Vazio = limpa direto, sem perguntar. */
export function dadosExtrasDoItem(
  item: ChecklistItem,
  evidenciasDoItem: { tipo: "Foto" | "Áudio" }[],
  nc?: NaoConformidade
): string[] {
  const extras: string[] = [];
  if ((item.observacao || "").trim()) extras.push("observação");
  if (evidenciasDoItem.some((evidencia) => evidencia.tipo === "Foto")) extras.push("foto");
  if (evidenciasDoItem.some((evidencia) => evidencia.tipo === "Áudio")) extras.push("áudio");
  const sugerida = gravidadeSugerida(item);
  if (item.status === "Não Conforme" && item.criticidade && sugerida && item.criticidade !== sugerida) extras.push("gravidade");
  if (nc && !nc.inativaNoChecklist && (nc.acaoCorretiva || nc.responsavelAcao || nc.prazo || nc.marcadaFeita || (nc.historicoAcompanhamento || []).length)) {
    extras.push("plano da correção");
  }
  return extras;
}

export function listaEmTexto(itens: string[]) {
  if (itens.length <= 1) return itens.join("");
  return `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** Volta o item a "Pendente". Se ele tinha gerado uma Correção, ela fica cancelada pelo usuário (fora das abertas), com o histórico guardado. */
export function limparResposta(
  ncs: NaoConformidade[],
  visita: { id: string },
  item: ChecklistItem,
  agoraIso: string
): { item: ChecklistItem; ncs: NaoConformidade[] } {
  const idNc = idDaNcDoItem(visita.id, item.id);
  const ncAntes = ncs.find((nc) => nc.id === idNc);
  const limpo: ItemComMemoria = { ...item, status: "Pendente", observacao: "", observacaoNCMemoria: "" };
  if (item.criticidadeSugerida) {
    limpo.criticidade = item.criticidadeSugerida;
    delete limpo.criticidadeSugerida;
  }
  const novasNcs = ncAntes && !ncAntes.inativaNoChecklist
    ? ncs.map((nc) => (nc.id === idNc ? { ...nc, inativaNoChecklist: true, canceladaPeloUsuarioEm: agoraIso } : nc))
    : ncs;
  return { item: limpo, ncs: novasNcs };
}
