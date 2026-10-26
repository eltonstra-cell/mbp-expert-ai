import type { TelaKey } from "./screenAccess.ts";

/** Abas da barra de baixo, em ordem. O padrão são os mesmos destinos do trilho (Início, Visitas, Correções, POPs, Relatórios e Mais), com o Registrar no centro. */
export type AbaDaBarra = "inicio" | "visitas" | "checklist" | "registrar" | "correcoes" | "evidencias" | "pops" | "relatorios" | "mais";
export const ABAS_PADRAO: AbaDaBarra[] = ["inicio", "visitas", "correcoes", "registrar", "pops", "relatorios", "mais"];

/** Com esta quantidade de abas ou menos, todas têm a mesma largura (o destaque da aba atual não muda de tamanho com o rótulo). */
export const LIMITE_ABAS_LARGURA_IGUAL = 5;
export function barraComLarguraIgual(quantidade: number): boolean {
  return quantidade <= LIMITE_ABAS_LARGURA_IGUAL;
}

/** Tela de permissão de cada aba. Registrar e Mais não dependem de uma tela (o Registrar é controlado por `podeRegistrar`). */
export const TELA_DA_ABA: Partial<Record<AbaDaBarra, TelaKey>> = {
  inicio: "inicio",
  visitas: "visitas",
  checklist: "checklist",
  correcoes: "correcoes",
  evidencias: "evidencias",
  pops: "pops",
  relatorios: "relatorio",
};

const ABAS_DO_EXECUTOR: AbaDaBarra[] = ["inicio", "checklist", "registrar", "evidencias"];
const ABAS_DO_FISCAL: AbaDaBarra[] = ["inicio", "pops"];

/** Abas do Executor e do Fiscal, sem as que a permissão esconde. Outros perfis devolvem ABAS_PADRAO (a mesma lista, filtrada pelo menu na tela). */
export function abasDoCampoDoPerfil(perfil: string | undefined, telaVisivel: (tela: TelaKey) => boolean): AbaDaBarra[] {
  const base = perfil === "Executor de campo" ? ABAS_DO_EXECUTOR : perfil === "Fiscal" ? ABAS_DO_FISCAL : null;
  if (!base) return ABAS_PADRAO;
  const visiveis = base.filter((aba) => {
    const tela = TELA_DA_ABA[aba];
    return !tela || telaVisivel(tela);
  });
  return visiveis.length ? visiveis : ["inicio"];
}
