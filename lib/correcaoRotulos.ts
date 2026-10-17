import { nomeDeExibicaoDoAmbiente } from "./checklistEnvs.ts";

// Textos da lista de Correções: o título é o NOME DO ITEM; o ambiente fica pequeno embaixo.

export const NOME_DAS_ETAPAS = ["Identificada", "Com plano", "Em acompanhamento", "Resolvida"] as const;

export function linhaDaCorrecao(nc: { titulo: string; ambiente: string; numero: number }): { titulo: string; ambiente: string; codigo: string } {
  return {
    titulo: (nc.titulo || "").trim(),
    ambiente: nomeDeExibicaoDoAmbiente((nc.ambiente || "").trim()) || "Sem ambiente",
    codigo: `NC${String(nc.numero).padStart(2, "0")}`,
  };
}

export const NOME_DA_GRAVIDADE: Record<"Crítica" | "Importante" | "Rotina", string> = { Crítica: "Crítica", Importante: "Importante", Rotina: "Leve" };
