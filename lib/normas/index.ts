import { RDC_216_2004 } from "./rdc216-2004.ts";
import { SES_799_2023_RS } from "./ses799-2023-rs.ts";
import type { Norma } from "./tipos.ts";

export type { ItemDeNorma, Norma } from "./tipos.ts";

/** Catálogo inicial: só estas duas normas. Nada é inventado para outros estados. */
export const CATALOGO_DE_NORMAS: Norma[] = [RDC_216_2004, SES_799_2023_RS];

export const MENSAGEM_SEM_NORMA = "Norma ainda não cadastrada no app. Defina os POPs manualmente.";

export function normaPorId(id: string, catalogo: Norma[] = CATALOGO_DE_NORMAS): Norma | undefined {
  return catalogo.find((norma) => norma.id === id);
}

export const AVISO_SEM_NORMA_ESTADUAL = "Norma estadual não cadastrada; consulte a Vigilância Sanitária local.";

/** Normas que o app oferece para a empresa: a federal vale para todos os estados; a estadual só onde está cadastrada. */
export function normasDisponiveis(uf: string | undefined, catalogo: Norma[] = CATALOGO_DE_NORMAS): Norma[] {
  const sigla = (uf || "").trim().toUpperCase();
  return catalogo.filter((norma) => norma.esfera === "federal" || (sigla !== "" && norma.uf === sigla));
}

/** Há norma estadual cadastrada para a UF? Se não, o app mostra o aviso de consultar a Vigilância Sanitária local. */
export function temNormaEstadual(uf: string | undefined, catalogo: Norma[] = CATALOGO_DE_NORMAS): boolean {
  return normasDisponiveis(uf, catalogo).some((norma) => norma.esfera !== "federal");
}

/** Normas aplicadas da empresa que existem no catálogo (ids desconhecidos são ignorados). */
export function normasDaEmpresa(empresa: { normasAplicadas?: string[] }, catalogo: Norma[] = CATALOGO_DE_NORMAS): Norma[] {
  return (empresa.normasAplicadas || []).map((id) => normaPorId(id, catalogo)).filter((norma): norma is Norma => Boolean(norma));
}

/** Versão atual do catálogo de cada norma (guardada no POP aprovado). */
export function versoesDoCatalogo(catalogo: Norma[] = CATALOGO_DE_NORMAS): Record<string, string> {
  return Object.fromEntries(catalogo.map((norma) => [norma.id, norma.versaoCatalogo]));
}
