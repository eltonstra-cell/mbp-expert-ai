import type { ChecklistStatus } from "../types/index.ts";
import { formatarHora } from "./dataLocal.ts";

// Cores da evolução do ambiente: um segmento (celular) ou quadradinho (PC e tablet) por item.
export const COR_DO_SEGMENTO: Record<ChecklistStatus, string> = {
  Conforme: "#21805B",
  "Não Conforme": "#C83F45",
  "Não se aplica": "#C3CDD6",
  Pendente: "#EEF1F7",
};

// Barra do Campo (celular): como o PC, Conforme #21805B (igual ao dos números do checklist) e Não conforme #C83F45; "Não se aplica" em grafite, para não se confundir com os pendentes claros.
export const COR_DO_SEGMENTO_CAMPO: Record<ChecklistStatus, string> = {
  ...COR_DO_SEGMENTO,
  "Não se aplica": "#526477",
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
  const hora = formatarHora(criadoEm);
  const nome = tipo === "Foto" ? "Foto" : tipo === "Áudio" ? "Áudio" : "Arquivo";
  return hora ? `${nome} · ${hora}` : nome;
}
