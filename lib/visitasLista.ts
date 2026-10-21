// Lista de visitas: agrupar por empresa, dizer o que existe numa visita sem progresso, avisar visita aberta há muito tempo.
import { quantidade } from "./plural.ts";

export const DIAS_PADRAO_DE_VISITA_ABERTA = 3;

/** "2 evidências, 1 não conformidade" (só o que existe; vazio quando não há nada). */
export function textoDoConteudoDaVisita(conta: { evidencias: number; naoConformidades: number; respostas?: number }): string {
  const partes: string[] = [];
  if (conta.evidencias > 0) partes.push(quantidade(conta.evidencias, "evidência", "evidências"));
  if (conta.naoConformidades > 0) partes.push(quantidade(conta.naoConformidades, "não conformidade", "não conformidades"));
  return partes.join(", ");
}

/** Texto ao lado da barra: "0% concluída" só quando a visita está realmente vazia; com evidência ou não conformidade mostra o que existe. */
export function textoDeProgressoDaVisita(percentual: number, conta: { evidencias: number; naoConformidades: number }): string {
  const existente = textoDoConteudoDaVisita(conta);
  if (percentual > 0) return `${percentual}% do checklist${existente ? ` · ${existente}` : ""}`;
  return existente || "0% concluída";
}

const DIA_MS = 24 * 60 * 60 * 1000;

function dataEmMs(texto: string): number {
  const [ano, mes, dia] = texto.slice(0, 10).split("-").map(Number);
  return Date.UTC(ano || 1970, (mes || 1) - 1, dia || 1);
}

/** Dias inteiros desde a data da visita (AAAA-MM-DD) até hoje (AAAA-MM-DD); nunca negativo. */
export function diasDeVisitaAberta(dataDaVisita: string, hoje: string): number {
  if (!dataDaVisita) return 0;
  return Math.max(0, Math.round((dataEmMs(hoje) - dataEmMs(dataDaVisita)) / DIA_MS));
}

/** Limite de dias para avisar: o que o Administrador configurou (1 a 60), senão 3. */
export function limiteDeDiasDaVisita(configurado: number | undefined | null): number {
  const n = Math.round(Number(configurado));
  return Number.isFinite(n) && n >= 1 && n <= 60 ? n : DIAS_PADRAO_DE_VISITA_ABERTA;
}

/** "Aberta há 5 dias" quando a visita em andamento passou do limite; vazio caso contrário. */
export function avisoDeVisitaAberta(status: "Em andamento" | "Concluída", dataDaVisita: string, hoje: string, limite: number): string {
  if (status !== "Em andamento") return "";
  const dias = diasDeVisitaAberta(dataDaVisita, hoje);
  return dias >= limite ? `Aberta há ${quantidade(dias, "dia", "dias")}` : "";
}

export type GrupoDeEmpresa<T> = { empresaId: string; empresa: string; ativa: boolean; itens: T[] };

/** Agrupa por empresa: a ativa primeiro, depois as outras em ordem alfabética; dentro do grupo mantém a ordem recebida. */
export function agruparPorEmpresa<T extends { empresaId: string; empresa: string; empresaAtiva: boolean }>(linhas: T[]): GrupoDeEmpresa<T>[] {
  const mapa = new Map<string, GrupoDeEmpresa<T>>();
  for (const linha of linhas) {
    const grupo = mapa.get(linha.empresaId) || { empresaId: linha.empresaId, empresa: linha.empresa, ativa: linha.empresaAtiva, itens: [] };
    grupo.itens.push(linha);
    mapa.set(linha.empresaId, grupo);
  }
  return [...mapa.values()].sort((a, b) => Number(b.ativa) - Number(a.ativa) || a.empresa.localeCompare(b.empresa, "pt-BR"));
}

const CHAVE_DOS_GRUPOS = "mbp-visitas-grupos-recolhidos";

type Armazem = Pick<Storage, "getItem" | "setItem">;

function armazemPadrao(): Armazem | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Grupos de empresa recolhidos pela pessoa (estado local; falha de armazenamento nunca quebra a lista). */
export function lerGruposRecolhidos(armazem: Armazem | null = armazemPadrao()): string[] {
  try {
    const lista = JSON.parse(armazem?.getItem(CHAVE_DOS_GRUPOS) || "[]");
    return Array.isArray(lista) ? lista.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function gravarGruposRecolhidos(ids: string[], armazem: Armazem | null = armazemPadrao()): void {
  try {
    armazem?.setItem(CHAVE_DOS_GRUPOS, JSON.stringify(ids));
  } catch {
    /* sem armazenamento: só não lembra */
  }
}

/** Por que uma visita não pode ser excluída (e o que fazer no lugar); vazio quando pode. */
export function motivoParaNaoExcluirVisita(dados: { respostas: number; naoConformidades: number; evidencias: number; concluida: boolean; temRelatorioEmitido: boolean }): string {
  if (dados.temRelatorioEmitido) {
    return "Esta visita tem relatório emitido e não pode ser excluída: o relatório e as fotos citadas ficam guardados. Para tirá-la da lista, use Arquivar.";
  }
  if (dados.respostas > 0 || dados.naoConformidades > 0 || dados.evidencias > 0 || dados.concluida) {
    return (
      "Esta visita já possui registros e está protegida contra exclusão acidental.\n\n" +
      `Respostas: ${dados.respostas}\nNão conformidades: ${dados.naoConformidades}\nEvidências: ${dados.evidencias}\n\n` +
      "Para tirá-la da lista sem perder nada, use Arquivar."
    );
  }
  return "";
}
