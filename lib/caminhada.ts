// Modo caminhada: o RT anda pelos ambientes na ordem da visita. Mostra "Ambiente 3 de 8 · Próximo: Depósito" e deixa pular um ambiente
// (sem marcar nada: os itens ficam pendentes e o relatório continua dizendo quantos faltam). Lógica pura.
import type { InfoAmbiente } from "./checklistEnvs.ts";

export type ProgressoDaCaminhada = {
  /** Posição (1 a total) do ambiente atual entre os ambientes físicos. 0 quando o atual é verificação geral. */
  indice: number;
  total: number;
  /** Rótulo do próximo ambiente físico; null no último. */
  proximo: string | null;
  /** Nome do próximo ambiente (para abrir), null no último. */
  nomeDoProximo: string | null;
  concluidos: number;
};

export function progressoDaCaminhada(ambientes: Pick<InfoAmbiente, "nome" | "rotulo" | "total" | "respondidos" | "geral">[], atual: string): ProgressoDaCaminhada {
  const fisicos = ambientes.filter((ambiente) => !ambiente.geral);
  const posicao = fisicos.findIndex((ambiente) => ambiente.nome === atual);
  const proximo = posicao >= 0 ? fisicos[posicao + 1] : undefined;
  return {
    indice: posicao + 1,
    total: fisicos.length,
    proximo: proximo ? proximo.rotulo : null,
    nomeDoProximo: proximo ? proximo.nome : null,
    concluidos: fisicos.filter((ambiente) => ambiente.total > 0 && ambiente.respondidos >= ambiente.total).length,
  };
}

/** Texto da faixa: "Ambiente 3 de 8 · Próximo: Depósito" (no último: "Último ambiente"). */
export function textoDaCaminhada(progresso: ProgressoDaCaminhada): string {
  if (progresso.total === 0 || progresso.indice === 0) return "";
  const posicao = `Ambiente ${progresso.indice} de ${progresso.total}`;
  return progresso.proximo ? `${posicao} · Próximo: ${progresso.proximo}` : `${posicao} · Último ambiente`;
}
