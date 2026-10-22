// Conferência do conteúdo de POP criado de modelo: o que falta conferir, quem conferiu e quando, e o que a aprovação exige.
// Fica sem depender de lib/popsNorma.ts para poder ser usada lá (aprovarPop e a validação do servidor).
import type { ProcedimentoOperacionalPadronizado } from "../types/index.ts";
import { limparTextoDePessoa } from "./nomeCargo.ts";

/** Modelos cuja aprovação fica BLOQUEADA enquanto o conteúdo não for conferido. Para ampliar a lista, basta acrescentar o id do modelo aqui. */
export const MODELOS_COM_BLOQUEIO: readonly string[] = ["comp-13"];

export const MENSAGEM_BLOQUEIO_DE_APROVACAO = "Revise os itens de segurança antes de aprovar";
export const MENSAGEM_APROVAR_NAO_CONFERIDO = "Este POP veio de modelo e ainda não foi conferido. Aprovar mesmo assim?";
/** Texto completo (vai no atributo title do chip). */
export const ROTULO_NAO_CONFERIDO = "Conteúdo de modelo não conferido";
/** Chip curto, de uma linha só. */
export const ROTULO_CURTO_NAO_CONFERIDO = "Modelo não conferido";
export const AVISO_VALORES_DO_MODELO = "Valores do modelo, a conferir com a norma aplicada.";

type PopComConferencia = Pick<ProcedimentoOperacionalPadronizado, "origemModelo" | "conferencia" | "itensAConferir">;

/** POP criado de modelo cujo conteúdo ainda não foi conferido. POP sem modelo de origem nunca entra aqui. */
export function popNaoConferido(pop: PopComConferencia | undefined | null): boolean {
  return Boolean(pop?.origemModelo) && !pop?.conferencia?.conferido;
}

/** Texto do bloqueio quando o modelo de origem está na lista de bloqueio e o POP não foi conferido; vazio quando pode aprovar. */
export function bloqueioDeAprovacao(pop: PopComConferencia | undefined | null): string {
  if (!pop?.origemModelo || pop.conferencia?.conferido) return "";
  return MODELOS_COM_BLOQUEIO.includes(pop.origemModelo.id) ? MENSAGEM_BLOQUEIO_DE_APROVACAO : "";
}

export type ExigenciaDeAprovacao = "nenhuma" | "confirmar" | "bloqueada";

export function exigenciaDeAprovacao(pop: PopComConferencia | undefined | null): ExigenciaDeAprovacao {
  if (bloqueioDeAprovacao(pop)) return "bloqueada";
  return popNaoConferido(pop) ? "confirmar" : "nenhuma";
}

export function itensFeitos(pop: PopComConferencia): { feitos: number; total: number } {
  const itens = pop.itensAConferir || [];
  return { feitos: itens.filter((item) => item.feito).length, total: itens.length };
}

/** "Marcar como conferido" só habilita com todos os itens marcados. */
export function podeMarcarComoConferido(pop: PopComConferencia): boolean {
  if (!pop.origemModelo || pop.conferencia?.conferido) return false;
  return (pop.itensAConferir || []).every((item) => item.feito);
}

/** Marca ou desmarca um item. Desmarcar um item de um POP já conferido volta o POP a "não conferido". */
export function marcarItemAConferir<T extends PopComConferencia>(pop: T, indice: number, feito: boolean): T {
  const itens = pop.itensAConferir || [];
  if (indice < 0 || indice >= itens.length) return pop;
  const novos = itens.map((item, posicao) => (posicao === indice ? { ...item, feito } : item));
  const reabre = !feito && pop.conferencia?.conferido;
  return { ...pop, itensAConferir: novos, ...(reabre ? { conferencia: { conferido: false } } : {}) };
}

/** Grava quem conferiu (nome e cargo da pessoa logada) e quando. */
export function marcarComoConferido<T extends PopComConferencia>(pop: T, pessoa: { nome?: string; cargo?: string }, agoraISO: string): T {
  if (!pop.origemModelo) throw new Error("Este POP não veio de modelo.");
  if (!podeMarcarComoConferido(pop)) throw new Error("Marque todos os itens antes de marcar como conferido.");
  return { ...pop, conferencia: { conferido: true, por: { nome: limparTextoDePessoa(pessoa.nome), cargo: limparTextoDePessoa(pessoa.cargo) }, em: agoraISO } };
}
