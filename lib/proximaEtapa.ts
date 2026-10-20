import { planoPorDefinir, type NcDoPlano } from "./actionPlan.ts";

export type ProximaEtapa =
  | { tipo: "checklist"; titulo: string; quantidade: number }
  | { tipo: "correcoes"; titulo: string; quantidade: number }
  | { tipo: "relatorio"; titulo: string; quantidade: 0 };

const plural = (n: number, singular: string, pluralTxt: string) => `${n} ${n === 1 ? singular : pluralTxt}`;

/** Uma etapa por vez: itens sem resposta, depois correções sem plano, depois o relatório. */
export function proximaEtapaDaVisita(semResposta: number, ncsAbertasDaVisita: NcDoPlano[]): ProximaEtapa {
  if (semResposta > 0) {
    return { tipo: "checklist", quantidade: semResposta, titulo: plural(semResposta, "item sem resposta", "itens sem resposta") };
  }
  const semPlano = ncsAbertasDaVisita.filter(planoPorDefinir).length;
  if (semPlano > 0) {
    return { tipo: "correcoes", quantidade: semPlano, titulo: plural(semPlano, "correção sem plano", "correções sem plano") };
  }
  return { tipo: "relatorio", quantidade: 0, titulo: "Gerar relatório" };
}
