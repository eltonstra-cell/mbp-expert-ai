import { planoPorDefinir, type NcDoPlano } from "./actionPlan.ts";

export type ProximaEtapa =
  | { tipo: "checklist"; titulo: string; quantidade: number }
  | { tipo: "correcoes"; titulo: string; quantidade: number }
  | { tipo: "relatorio"; titulo: string; quantidade: 0 };

export type ItemDeDestino = { id: string; ambiente: string; titulo: string; status?: string };

/** Primeiro item sem resposta, na ordem dos ambientes da visita. */
export function primeiroItemSemResposta<T extends { ambiente: string; status: string }>(lista: T[], ordemDosAmbientes: string[]): T | undefined {
  const ordem = ordemDosAmbientes.length ? ordemDosAmbientes : [...new Set(lista.map((item) => item.ambiente))];
  return ordem.flatMap((nome) => lista.filter((item) => item.ambiente === nome)).find((item) => item.status === "Pendente");
}

/** Acha o item descrito no cartão dentro do checklist aberto: pelo id e, se o id mudou, por ambiente e título. */
export function acharItemDeDestino<T extends ItemDeDestino>(checklist: T[], destino: ItemDeDestino): T | undefined {
  return checklist.find((item) => item.id === destino.id) || checklist.find((item) => item.ambiente === destino.ambiente && item.titulo === destino.titulo);
}

/** O cartão "Próxima etapa" só aparece depois que os itens acabam; antes disso o "Continuar checklist" já cobre. */
export function mostrarCartaoProximaEtapa(etapa: ProximaEtapa | null | undefined): boolean {
  return !!etapa && etapa.tipo !== "checklist";
}

/** Texto pequeno do botão "Continuar checklist": quantos itens ainda sem resposta. */
export function textoDoContinuar(etapa: ProximaEtapa | null | undefined): string | undefined {
  return etapa && etapa.tipo === "checklist" ? etapa.titulo : undefined;
}

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
