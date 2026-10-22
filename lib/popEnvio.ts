// "Enviar para aprovação" nunca fica sem resposta: o que falta, em qual seção do editor, e o texto "Falta: …" mostrado ao lado do botão.
import type { ProcedimentoOperacionalPadronizado } from "../types/index.ts";
import { MODELOS_COM_BLOQUEIO } from "./popConferencia.ts";
import type { IdDaSecao } from "./popDocumento.ts";
import { responsavelDaExecucao, type NomeECargo } from "./responsavelDoPop.ts";

export type FaltaDoEnvio = { id: IdDaSecao; titulo: string };

export const AVISO_CONFERIR_ITENS_DE_SEGURANCA = "Será preciso conferir os itens de segurança antes de aprovar";

const escrito = (texto: string | undefined) => Boolean((texto || "").trim());

/** Seções incompletas, na ordem do editor. O título é o mesmo da lista da esquerda. */
export function secoesQueFaltamParaEnviar(pop: Pick<ProcedimentoOperacionalPadronizado, "titulo" | "conteudo">, dados?: NomeECargo): FaltaDoEnvio[] {
  const c = pop.conteudo || {};
  const faltas: FaltaDoEnvio[] = [];
  if (!escrito(pop.titulo)) faltas.push({ id: "identificacao", titulo: "Identificação" });
  const executor = responsavelDaExecucao(c, dados);
  const semResponsavel = !escrito(executor.nome) || !escrito(executor.cargo);
  if (semResponsavel || !escrito(c.frequencia)) faltas.push({ id: "responsavel", titulo: "Responsável e frequência" });
  const passos = c.passos || [];
  if (!passos.some((passo) => escrito(passo.texto)) || (passos.some((passo) => !escrito(passo.texto)) && passos.some((passo) => escrito(passo.texto)))) {
    faltas.push({ id: "passos", titulo: "Passos" });
  }
  return faltas;
}

/** "Falta: Responsável e frequência" (várias: separadas por ponto e vírgula). Vazio quando nada falta. */
export function textoDaFalta(faltas: FaltaDoEnvio[]): string {
  return faltas.length ? `Falta: ${faltas.map((falta) => falta.titulo).join("; ")}` : "";
}

/** Modelo da lista de bloqueio: a aprovação exigirá a conferência dos itens de segurança (aviso informativo antes de enviar). */
export function avisoDeConferenciaObrigatoria(pop: Pick<ProcedimentoOperacionalPadronizado, "origemModelo" | "conferencia">): string {
  if (!pop.origemModelo || pop.conferencia?.conferido) return "";
  return MODELOS_COM_BLOQUEIO.includes(pop.origemModelo.id) ? AVISO_CONFERIR_ITENS_DE_SEGURANCA : "";
}
