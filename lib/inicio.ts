// Início (PC): regras puras da tela (sem JSX): visitas recentes, visitas paradas, configuração da empresa e o guia de primeiros passos.
import { diasDeVisitaAberta } from "./visitasLista.ts";
import { quantidade } from "./plural.ts";
import type { Empresa, Visita } from "../types/index.ts";

export const DIAS_DE_VISITA_PARADA = 30;

type ComData = { data?: string; criadoEm?: string };

/** Da mais recente para a mais antiga (data da visita; empate pela criação). Não altera a lista recebida. */
export function ordenarRecentes<T extends ComData>(visitas: T[]): T[] {
  return [...visitas].sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.criadoEm || "").localeCompare(a.criadoEm || ""));
}

/** Visitas em andamento, não arquivadas, abertas há mais de 30 dias. */
export function visitasParadas<T extends Pick<Visita, "id" | "status" | "data" | "arquivada">>(visitas: T[], hoje: string, limite = DIAS_DE_VISITA_PARADA): T[] {
  return visitas.filter((visita) => visita.status === "Em andamento" && !visita.arquivada && diasDeVisitaAberta(visita.data, hoje) > limite);
}

export function textoDasParadas(n: number): string {
  return `${quantidade(n, "visita parada", "visitas paradas")} há mais de ${DIAS_DE_VISITA_PARADA} dias`;
}

/** Resumo do cabeçalho de "Visitas recentes" quando está fechado. */
export function resumoDeVisitasRecentes(emAndamento: number, paradas: number): string {
  const base = `${emAndamento} em andamento`;
  return paradas > 0 ? `${base} · ${quantidade(paradas, "parada", "paradas")} há mais de ${DIAS_DE_VISITA_PARADA} dias` : base;
}

export const linhaDaVisita = (numero: number | undefined, data: string): string => `Visita ${numero ?? "—"} · ${data}`;

/** Sem itens no checklist não há barra nem "0 de 0": diz que ainda não há resposta. */
export function textoDeProgresso(respondidos: number, total: number): string {
  return total === 0 ? "ainda sem itens respondidos" : `${respondidos} de ${total} itens respondidos`;
}

export type PassoDeConfiguracao = { chave: "perfil" | "empresa" | "ambientes" | "equipamentos" | "fluxos" | "visita" | "relatorio"; titulo: string; feito: boolean };

export const TITULO_DOS_PASSOS: Record<PassoDeConfiguracao["chave"], string> = {
  perfil: "Perfil",
  empresa: "Empresa",
  ambientes: "Ambientes",
  equipamentos: "Equipamentos",
  fluxos: "Fluxos",
  visita: "Visita",
  relatorio: "Relatório",
};

type DadosDoPerfil = { nome?: string; cargo?: string; perfil?: string; crn?: string; telefone?: string };

/**
 * UM cálculo só para "o que falta configurar": serve à linha do Início e ao guia de primeiros passos em Ajuda e guias.
 * Tudo vem de dados que já existem (nada novo é gravado).
 */
export function passosDeConfiguracao(entrada: {
  usuario?: DadosDoPerfil | null;
  empresa?: Pick<Empresa, "id" | "nomeFantasia" | "razaoSocial" | "cnpj" | "responsavel" | "responsavelEstabelecimento" | "setoresManual" | "equipamentosSetores" | "fluxosOperacionais"> | null;
  visitas: Pick<Visita, "empresaId" | "status" | "arquivada">[];
  relatoriosEmitidos?: { empresaId: string }[];
}): PassoDeConfiguracao[] {
  const { usuario, empresa } = entrada;
  const escrito = (valor?: string) => Boolean((valor || "").trim());
  const assina = usuario?.perfil === "Consultor/RT" || usuario?.perfil === "Administrador";
  const perfilFeito = Boolean(usuario) && escrito(usuario?.nome) && escrito(usuario?.cargo) && (!assina || (escrito(usuario?.crn) && escrito(usuario?.telefone)));
  const empresaFeita = Boolean(empresa) && escrito(empresa?.nomeFantasia || empresa?.razaoSocial) && escrito(empresa?.cnpj) && (escrito(empresa?.responsavel) || escrito(empresa?.responsavelEstabelecimento?.nome));
  const doAlvo = (id?: string) => entrada.visitas.filter((visita) => visita.empresaId === id && !visita.arquivada);
  const visitas = doAlvo(empresa?.id);
  const feitos: Record<PassoDeConfiguracao["chave"], boolean> = {
    perfil: perfilFeito,
    empresa: empresaFeita,
    ambientes: (empresa?.setoresManual || []).length > 0,
    equipamentos: (empresa?.equipamentosSetores || []).length > 0,
    fluxos: (empresa?.fluxosOperacionais || []).some((fluxo) => fluxo.aplicavel),
    visita: visitas.length > 0,
    relatorio: (entrada.relatoriosEmitidos || []).some((item) => item.empresaId === empresa?.id) || visitas.some((visita) => visita.status === "Concluída"),
  };
  return (Object.keys(TITULO_DOS_PASSOS) as PassoDeConfiguracao["chave"][]).map((chave) => ({ chave, titulo: TITULO_DOS_PASSOS[chave], feito: feitos[chave] }));
}

/** "Configuração da empresa: 4 de 7 · faltam" (os itens que faltam viram links na tela). Vazio quando tudo está completo. */
export function resumoDaConfiguracao(passos: PassoDeConfiguracao[]): { feitos: number; total: number; faltam: PassoDeConfiguracao[]; completo: boolean } {
  const faltam = passos.filter((passo) => !passo.feito);
  return { feitos: passos.length - faltam.length, total: passos.length, faltam, completo: faltam.length === 0 };
}
