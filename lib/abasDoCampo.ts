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

/** Faixa da visita no Campo (celular): só estes assuntos, para o ✓ de finalizar caber ao lado sem cortar aba. POPs e Relatório da visita ficam em Mais › Desta visita. */
export const PASSOS_DA_FAIXA_NO_CAMPO = ["central", "checklist", "evidencias", "correcoes"] as const;

/** Em Mais › Cadastros e documentos, "POPs e documentos" e "Relatórios" só aparecem quando a barra de baixo NÃO tem esse destino (Executor e Fiscal): o caminho é o mesmo da barra (`irParaTelaCampo`), então repetir seria duplicar. */
export function destinoFicaSoNoMais(destino: "pops" | "relatorios", abasNaBarra: AbaDaBarra[]): boolean {
  return !abasNaBarra.includes(destino);
}

/** O ✓ de finalizar da faixa vira "✓ Finalizar" só quando o checklist tem itens e todos já foram respondidos. */
export function finalizarComRotulo(total: number, pendentes: number): boolean {
  return total > 0 && pendentes === 0;
}

/** Barra de baixo do celular (abaixo de 600 px): 5 destinos com o Registrar no centro; POPs e Relatórios passam para "Mais". */
export const ABAS_CELULAR: AbaDaBarra[] = ["inicio", "visitas", "registrar", "correcoes", "mais"];
