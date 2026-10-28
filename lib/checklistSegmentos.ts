import type { ChecklistStatus } from "../types/index.ts";
import { formatarHora } from "./dataLocal.ts";

// Cores da evolução do ambiente: um segmento (celular) ou quadradinho (PC e tablet) por item.
export const COR_DO_SEGMENTO: Record<ChecklistStatus, string> = {
  Conforme: "#15803D",
  "Não Conforme": "#D93A3A",
  "Não se aplica": "#C3CDD6",
  Pendente: "#EEF1F5",
};

// Barra do Campo (celular): "Conforme" no mesmo verde dos botões (#1E7A3E) e "Não se aplica" em grafite, para não se confundir com os pendentes claros. O PC não muda.
export const COR_DO_SEGMENTO_CAMPO: Record<ChecklistStatus, string> = {
  ...COR_DO_SEGMENTO,
  Conforme: "#1E7A3E",
  "Não se aplica": "#5B6575",
};

const NOME_DO_ESTADO: Record<ChecklistStatus, string> = {
  Conforme: "Conforme",
  "Não Conforme": "Não conforme",
  "Não se aplica": "Não se aplica",
  Pendente: "sem resposta",
};

/** Cor do aviso do avanço automático: acompanha a resposta (Não Conforme = nc, Não se aplica = na, o resto = ok). */
export function tomDoStatus(status: ChecklistStatus): "ok" | "nc" | "na" {
  if (status === "Não se aplica") return "na";
  if (status === "Não Conforme") return "nc";
  return "ok";
}

export function rotuloDoSegmento(indice: number, status: ChecklistStatus): string {
  return `Item ${indice + 1}, ${NOME_DO_ESTADO[status]}`;
}

// Legenda de uma evidência na lista do item: nunca o nome técnico do arquivo.
export function legendaDaEvidencia(tipo: string, criadoEm: string): string {
  const hora = formatarHora(criadoEm);
  const nome = tipo === "Foto" ? "Foto" : tipo === "Áudio" ? "Áudio" : "Arquivo";
  return hora ? `${nome} · ${hora}` : nome;
}
