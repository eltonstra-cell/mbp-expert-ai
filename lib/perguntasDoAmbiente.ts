// Quantas perguntas cada ambiente tem na visita e quais são. UMA função monta a lista (a visita e o Cadastro usam a mesma), então o número que o
// Cadastro mostra é o número real que a visita traz. Só organiza e conta; não cria pergunta.
import type { ConfigQuestionario, FluxoOperacional } from "../types/index.ts";
import { modelosChecklist } from "./checklistModelosAntigos.ts";
import { SETORES_OFICIAIS_MANUAL, normalizarSetorManual, obterModeloQuestionarioParaAmbiente } from "./manualBase.ts";
import { obterModeloChecklistManual, type ModeloChecklistManual } from "./manualChecklist.ts";
import { PERGUNTAS_POR_FLUXO, obterCriteriosOperacionaisParaSetor } from "./operationalFlows.ts";
import { itensDoQuestionario } from "./questionarioAmbiente.ts";

const ENTRADA_BASICA = "Estrutura geral/personalizada";
const CATEGORIA_DOS_EQUIPAMENTOS = "Equipamentos e móveis";

export type PerguntaDoAmbiente = Pick<ModeloChecklistManual, "categoria" | "titulo" | "criticidade" | "referencia" | "orientacao">;

export type OpcoesDoAmbiente = {
  /** Questionário escolhido por ambiente (já inclui o vínculo com o setor oficial). */
  modelosQuestionario?: Record<string, string>;
  /** Questionário personalizado pelo RT (perguntas ativas, na ordem escolhida). */
  questionarios?: Record<string, ConfigQuestionario>;
  fluxos?: FluxoOperacional[];
};

/** As perguntas que a visita traz para o ambiente: as do questionário (ou do modelo) e as dos fluxos ligados a ele; sem "Equipamentos e móveis". */
export function itensDoAmbiente(ambiente: string, opcoes: OpcoesDoAmbiente = {}): PerguntaDoAmbiente[] {
  const modeloReferencia = opcoes.modelosQuestionario?.[ambiente] || obterModeloQuestionarioParaAmbiente(ambiente);
  const setorNormalizado = normalizarSetorManual(modeloReferencia);
  const setorDoManual = SETORES_OFICIAIS_MANUAL.includes(setorNormalizado as (typeof SETORES_OFICIAIS_MANUAL)[number]);
  const doModelo = () => (setorDoManual ? obterModeloChecklistManual(ambiente, modeloReferencia) : modelosChecklist[ambiente] || obterModeloChecklistManual(ambiente, modeloReferencia));
  const modeloDoAmbiente = doModelo().filter((item) => item.categoria !== CATEGORIA_DOS_EQUIPAMENTOS);
  const personalizado = itensDoQuestionario(opcoes.questionarios?.[ambiente], modeloDoAmbiente);
  const estrutura = personalizado ? personalizado : doModelo();
  return [
    ...estrutura.filter((item) => item.categoria !== CATEGORIA_DOS_EQUIPAMENTOS),
    ...obterCriteriosOperacionaisParaSetor(opcoes.fluxos, setorNormalizado, ambiente),
  ];
}

/** Número de perguntas que a visita traz para o ambiente. */
export const perguntasDoAmbiente = (ambiente: string, opcoes: OpcoesDoAmbiente = {}): number => itensDoAmbiente(ambiente, opcoes).length;

/** Perguntas só do modelo (sem fluxos), para texto como "11 perguntas deste setor". */
export function perguntasDoSetor(setorOuModelo: string): number {
  return obterModeloChecklistManual(setorOuModelo, setorOuModelo).filter((pergunta) => pergunta.categoria !== CATEGORIA_DOS_EQUIPAMENTOS).length;
}

/** Ambiente de nome próprio sem vínculo e sem nome de mapa antigo: o questionário básico. */
export const PERGUNTAS_DO_QUESTIONARIO_BASICO_VISITA = perguntasDoSetor(ENTRADA_BASICA);

/** Perguntas que os fluxos marcados e ligados a um setor acrescentam a ele. */
export function perguntasDeFluxosNoSetor(fluxos: { aplicavel: boolean; setorVinculado: string }[], setor: string): number {
  return fluxos.filter((fluxo) => fluxo.aplicavel && fluxo.setorVinculado === setor).length * PERGUNTAS_POR_FLUXO;
}
