// Notas do modelo e pendências do POP: separa PENDÊNCIA (âmbar, com ação) de INFORMAÇÃO (cinza, sem ação).
// Só muda a forma de mostrar: nenhuma regra de aprovação nem o bloqueio de segurança são alterados aqui.
import type { ProcedimentoOperacionalPadronizado } from "../types/index.ts";
import { itensFeitos, popNaoConferido } from "./popConferencia.ts";
import { itensEscritos } from "./popConteudoModelo.ts";

/** Onde a pendência se resolve: o bloco "Para conferir antes de aprovar" (Resumo) ou a seção "Quem realiza" (Documento). */
export type AlvoDaPendencia = "conferencia" | "quemRealiza";

export type ItemDasNotas = {
  tipo: "pendencia" | "informacao";
  texto: string;
  /** Só a pendência que a tela consegue resolver traz ação. */
  acao?: { rotulo: string; alvo: AlvoDaPendencia };
};

export const TEXTO_PENDENTE_QUEM_REALIZA = "Pendente: informar quem realiza a tarefa";

const ETIQUETA_NO_INICIO = /^\s*\[([^\]]+)\]\s*([\s\S]*)$/;

const semAcento = (texto: string) => texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR").trim();

type PopDasNotas = Pick<ProcedimentoOperacionalPadronizado, "conteudo" | "origemModelo" | "conferencia" | "itensAConferir">;

/**
 * Cada nota do modelo vira pendência ou informação. "[Quem realiza] …" é pendência até a seção "Quem realiza" ter texto;
 * qualquer outra etiqueta vira "Etiqueta: texto" (informação). Com `podeResolver` falso (POP em leitura) a pendência fica sem ação.
 * Acrescenta, no começo, a pendência de conferir os itens do modelo (a conferência é feita no Resumo).
 */
export function itensDasNotas(notas: string[], pop: PopDasNotas, podeResolver: boolean, podeConferir: boolean): ItemDasNotas[] {
  const itens: ItemDasNotas[] = [];
  if (popNaoConferido(pop as ProcedimentoOperacionalPadronizado) && (pop.itensAConferir || []).length > 0) {
    const { feitos, total } = itensFeitos(pop as ProcedimentoOperacionalPadronizado);
    if (feitos < total) {
      itens.push({ tipo: "pendencia", texto: `Pendente: conferir os itens do modelo (${feitos} de ${total} marcados)`, ...(podeConferir ? { acao: { rotulo: "Conferir", alvo: "conferencia" as const } } : {}) });
    }
  }
  for (const nota of notas) {
    const partes = ETIQUETA_NO_INICIO.exec(nota);
    if (!partes) {
      itens.push({ tipo: "informacao", texto: nota });
      continue;
    }
    const etiqueta = partes[1].trim();
    const resto = partes[2].trim();
    if (semAcento(etiqueta) === "quem realiza") {
      const informado = itensEscritos(pop.conteudo?.quemRealiza).length > 0;
      itens.push(
        informado
          ? { tipo: "informacao", texto: "Quem realiza: já informado" }
          : { tipo: "pendencia", texto: TEXTO_PENDENTE_QUEM_REALIZA, ...(podeResolver ? { acao: { rotulo: "Informar", alvo: "quemRealiza" as const } } : {}) }
      );
      continue;
    }
    itens.push({ tipo: "informacao", texto: resto ? `${etiqueta}: ${resto}` : etiqueta });
  }
  return itens;
}

export function totalDePendencias(itens: ItemDasNotas[]): number {
  return itens.filter((item) => item.tipo === "pendencia").length;
}

/** Onde o botão "Aprovar" da lista abre o POP: na conferência (Resumo) quando o POP veio de modelo e não foi conferido; senão no Documento. */
export function destinoDoAprovar(pop: Pick<ProcedimentoOperacionalPadronizado, "origemModelo" | "conferencia">): { aba: "resumo" | "documento"; alvo?: AlvoDaPendencia } {
  return popNaoConferido(pop as ProcedimentoOperacionalPadronizado) ? { aba: "resumo", alvo: "conferencia" } : { aba: "documento" };
}
