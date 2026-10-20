import type { ChecklistStatus } from "../types/index.ts";

// Cores da evolução do ambiente: um segmento (celular) ou quadradinho (PC e tablet) por item.
export const COR_DO_SEGMENTO: Record<ChecklistStatus, string> = {
  Conforme: "#15803D",
  "Não Conforme": "#D93A3A",
  "Não se aplica": "#C3CDD6",
  Pendente: "#EEF1F5",
};

const NOME_DO_ESTADO: Record<ChecklistStatus, string> = {
  Conforme: "Conforme",
  "Não Conforme": "Não conforme",
  "Não se aplica": "Não se aplica",
  Pendente: "sem resposta",
};

export function rotuloDoSegmento(indice: number, status: ChecklistStatus): string {
  return `Item ${indice + 1}, ${NOME_DO_ESTADO[status]}`;
}

// Legenda de uma evidência na lista do item: nunca o nome técnico do arquivo.
export function legendaDaEvidencia(tipo: string, criadoEm: string): string {
  const data = new Date(criadoEm);
  const hora = Number.isNaN(data.getTime()) ? "" : data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const nome = tipo === "Foto" ? "Foto" : tipo === "Áudio" ? "Áudio" : "Arquivo";
  return hora ? `${nome} · ${hora}` : nome;
}
