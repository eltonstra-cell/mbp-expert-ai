// O POP como ciclo de 6 etapas (rodada 12e): Criar, Conferir, Aprovar, Equipe, Registros, Revisar.
// DECISÃO DE PROJETO: a etapa é DERIVADA do estado que já existe (status, conferência do modelo, aprovação, ciência, registros, revisão).
// Nenhuma máquina de estados nova é gravada: não há migração, o POP antigo já cai numa etapa e as regras de aprovação ficam onde estão
// (`aprovarPop`, `exigenciaDeAprovacao`, servidor). Bibliotecas de fluxo (XState, workflows) não servem aqui: o estado vive num documento
// JSONB sincronizado entre aparelhos e a etapa precisa ser recalculada de qualquer cópia, sem guardar o "passo atual".
import type { ProcedimentoOperacionalPadronizado } from "../types/index.ts";
import { frequenciaDoPop } from "./popFrequencia.ts";
import { popNaoConferido } from "./popConferencia.ts";
import { responsavelDaExecucao, type NomeECargo } from "./responsavelDoPop.ts";
import { hojeISO, popPrecisaRevisarPorNorma } from "./popsNorma.ts";

export const ETAPAS_DO_POP = ["Criar", "Conferir", "Aprovar", "Equipe", "Registros", "Revisar"] as const;
export type NomeDaEtapa = (typeof ETAPAS_DO_POP)[number];
export const TOTAL_DE_ETAPAS = ETAPAS_DO_POP.length;

export type ContextoDaEtapa = {
  /** Ciência da versão vigente: quantas pessoas ativas e quantas já confirmaram. Sem equipe cadastrada, total = 0. */
  equipe?: { total: number; confirmadas: number };
  /** Nome e cargo de Dados, para saber se o responsável está definido quando o POP acompanha Dados. */
  dadosDoResponsavel?: NomeECargo;
  hoje?: string;
};

export type EtapaDoPop = { numero: number; nome: NomeDaEtapa };

const escrito = (texto?: string) => Boolean((texto || "").trim());

export function passosEscritos(pop: Pick<ProcedimentoOperacionalPadronizado, "conteudo">): number {
  return (pop.conteudo?.passos || []).filter((passo) => escrito(passo.texto)).length;
}

export function responsavelDefinido(pop: Pick<ProcedimentoOperacionalPadronizado, "conteudo">, dados?: NomeECargo): boolean {
  const executor = responsavelDaExecucao(pop.conteudo, dados);
  return escrito(executor.nome) && escrito(executor.cargo);
}

export function frequenciaDefinida(pop: Pick<ProcedimentoOperacionalPadronizado, "conteudo">): boolean {
  return frequenciaDoPop(pop.conteudo) !== null;
}

/**
 * Em qual das 6 etapas o POP está. Arquivado e inativo ficam fora do ciclo (null).
 * Rascunho: 1 sem nenhum passo escrito; 2 com passos, mas falta conferir o modelo, o responsável ou a frequência; 3 pronto para aprovar.
 * Aguardando aprovação: 3. Aprovado: 4 enquanto a equipe não confirmou a ciência; 6 com revisão vencida; senão 5.
 */
export function etapaDoPop(pop: ProcedimentoOperacionalPadronizado | undefined, contexto: ContextoDaEtapa = {}): EtapaDoPop | null {
  if (!pop || pop.arquivado || pop.status === "Inativo") return null;
  const hoje = contexto.hoje || hojeISO();
  const de = (numero: number): EtapaDoPop => ({ numero, nome: ETAPAS_DO_POP[numero - 1] });
  if (pop.status === "Aguardando aprovação" || pop.status === "Em revisão") return de(3);
  if (pop.status === "Aprovado") {
    if ((pop.proximaRevisao && pop.proximaRevisao < hoje) || popPrecisaRevisarPorNorma(pop)) return de(6);
    const equipe = contexto.equipe;
    if (equipe && equipe.total > 0 && equipe.confirmadas < equipe.total) return de(4);
    return de(5);
  }
  if (passosEscritos(pop) === 0) return de(1);
  if (popNaoConferido(pop) || !frequenciaDefinida(pop) || !responsavelDefinido(pop, contexto.dadosDoResponsavel)) return de(2);
  return de(3);
}

export function textoDaEtapa(etapa: EtapaDoPop | null): string {
  return etapa ? `Etapa ${etapa.numero} de ${TOTAL_DE_ETAPAS} · ${etapa.nome}` : "";
}

export type SituacaoDoPassoDaLinha = "concluida" | "atual" | "futura";

/** As 6 etapas da linha do Resumo: as anteriores à atual concluídas (verde), a atual (azul-marinho) e as seguintes em contorno. */
export function linhaDeEtapas(etapa: EtapaDoPop | null): { numero: number; nome: NomeDaEtapa; situacao: SituacaoDoPassoDaLinha }[] {
  const atual = etapa?.numero ?? 0;
  return ETAPAS_DO_POP.map((nome, indice) => ({ numero: indice + 1, nome, situacao: indice + 1 < atual ? "concluida" : indice + 1 === atual ? "atual" : "futura" }));
}

export type VerificacaoDeAprovacao = { id: "passos" | "responsavel" | "frequencia" | "conferidos"; texto: string; ok: boolean };

/** As 4 verificações da faixa "Pronto para aprovar". Só informam: quem decide se aprova são as regras de sempre (`aprovarPop`). */
export function verificacoesDeAprovacao(pop: ProcedimentoOperacionalPadronizado, dados?: NomeECargo): VerificacaoDeAprovacao[] {
  const frequencia = frequenciaDoPop(pop.conteudo);
  const itens = pop.itensAConferir || [];
  const feitos = itens.filter((item) => item.feito).length;
  const conferidos = !pop.origemModelo ? true : Boolean(pop.conferencia?.conferido);
  return [
    { id: "passos", texto: "Passos preenchidos", ok: passosEscritos(pop) > 0 },
    { id: "responsavel", texto: "Responsável e cargo definidos", ok: responsavelDefinido(pop, dados) },
    { id: "frequencia", texto: frequencia ? `Frequência definida: ${frequencia.tipo === "outra" ? frequencia.texto : frequencia.tipo === "diaria" ? "diária" : frequencia.tipo}` : "Frequência definida", ok: Boolean(frequencia) },
    { id: "conferidos", texto: pop.origemModelo ? `Itens conferidos (${feitos} de ${itens.length})` : "Itens conferidos", ok: conferidos },
  ];
}
