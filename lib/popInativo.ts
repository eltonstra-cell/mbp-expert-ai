// Fluxo do status "Inativo" (rodada 12e).
// Inativar = tirar de uso um POP APROVADO (ex.: o procedimento deixou de existir). Exige motivo, autor e data; nada é apagado: a versão
// aprovada, a assinatura e os registros ficam guardados e o POP sai da lista de vigentes e das cobranças (registro atrasado, revisão).
// Reativar = voltar a usar: nasce uma NOVA versão em Rascunho (a aprovada antiga fica guardada) e o POP passa de novo pelo ciclo
// (Conferir, Aprovar, Equipe), porque quem o tirou de uso pode ter mudado o que vale. POP que nunca foi aprovado não se inativa: arquiva-se.
import type { MotivoDeMudancaDoPop, ProcedimentoOperacionalPadronizado } from "../types/index.ts";
import { iniciarNovaVersao } from "./popsNorma.ts";

export function podeInativarPop(pop: ProcedimentoOperacionalPadronizado): boolean {
  return pop.status === "Aprovado" && !pop.arquivado;
}

export function inativarPop(pop: ProcedimentoOperacionalPadronizado, mudanca: MotivoDeMudancaDoPop): ProcedimentoOperacionalPadronizado {
  if (!podeInativarPop(pop)) throw new Error("Só um POP aprovado pode ser inativado.");
  const motivo = (mudanca.motivo || "").trim();
  if (!motivo) throw new Error("Informe o motivo para inativar o POP.");
  return { ...pop, status: "Inativo", inativacao: { ...mudanca, motivo } };
}

export function reativarPop(pop: ProcedimentoOperacionalPadronizado): ProcedimentoOperacionalPadronizado {
  if (pop.status !== "Inativo") throw new Error("Só um POP inativo pode ser reativado.");
  // Reaproveita a regra de "nova versão": a aprovada vira versão guardada e a nova nasce Rascunho.
  const { inativacao: _inativacao, ...resto } = pop;
  return iniciarNovaVersao({ ...resto, status: "Aprovado" });
}
