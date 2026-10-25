// Quantas perguntas cada ambiente tem na visita (as do modelo; sem "Equipamentos e móveis", que vem do cadastro). Só conta; não cria pergunta.
import { obterModeloChecklistManual } from "./manualChecklist.ts";
import { PERGUNTAS_POR_FLUXO } from "./operationalFlows.ts";

const ENTRADA_BASICA = "Estrutura geral/personalizada";

export function perguntasDoSetor(setorOuModelo: string): number {
  return obterModeloChecklistManual(setorOuModelo, setorOuModelo).filter((pergunta) => pergunta.categoria !== "Equipamentos e móveis").length;
}

/** Ambiente de nome próprio sem vínculo: o questionário básico. */
export const PERGUNTAS_DO_QUESTIONARIO_BASICO_VISITA = perguntasDoSetor(ENTRADA_BASICA);

/** Perguntas que os fluxos marcados e ligados a um setor acrescentam a ele. */
export function perguntasDeFluxosNoSetor(fluxos: { aplicavel: boolean; setorVinculado: string }[], setor: string): number {
  return fluxos.filter((fluxo) => fluxo.aplicavel && fluxo.setorVinculado === setor).length * PERGUNTAS_POR_FLUXO;
}
