// UMA regra para "correção da empresa" e "correção vencida": a lista de Correções da empresa e o número vermelho do trilho usam estas funções.
import { ncAtrasada } from "./actionPlan.ts";
import type { NaoConformidade } from "../types/index.ts";

type NcDaEmpresa = Pick<NaoConformidade, "empresaId" | "status" | "prazo" | "inativaNoChecklist" | "canceladaPeloUsuarioEm">;

/** Correções abertas (não resolvidas, ativas no checklist) da empresa, de qualquer visita: o que a lista de Correções da empresa mostra. */
export function correcoesAbertasDaEmpresa<T extends NcDaEmpresa>(ncs: T[] | undefined, empresaId: string): T[] {
  return (ncs || []).filter((nc) => nc.empresaId === empresaId && !nc.inativaNoChecklist && !nc.canceladaPeloUsuarioEm && nc.status !== "Resolvida");
}

/** Dessas, as de prazo anterior a hoje (hoje = AAAA-MM-DD de America/Sao_Paulo, de `hojeLocalISO`): as "Atrasadas" da lista. */
export function correcoesVencidasDaEmpresa<T extends NcDaEmpresa>(ncs: T[] | undefined, empresaId: string, hoje: string): T[] {
  return correcoesAbertasDaEmpresa(ncs, empresaId).filter((nc) => ncAtrasada(nc, hoje));
}
