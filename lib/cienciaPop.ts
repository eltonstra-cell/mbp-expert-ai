// Ciência da equipe sobre o POP vigente (rodada 12e, Parte D). Regras puras; o PIN e o servidor ficam em lib/pinCiencia.ts e na rota.
// Cada ciência é uma `LeituraPop` com `viaPin: true`: só pessoa (colaboradorId), versão, data e hora (`criadoEm`). Nada de IP ou local.
// Boa prática do app, NÃO exigência legal (ver o cabeçalho de lib/pinCiencia.ts).
import type { AppDB, Colaborador, LeituraPop } from "../types/index.ts";
import { dataISOLocal } from "./dataLocal.ts";
import { popVigente } from "./popsNorma.ts";
import { leituraDaVersao } from "./registrosEmpresa.ts";

export const AVISO_DA_CIENCIA = "A ciência registra só quem confirmou, qual versão e quando. É o empregador comunicando o procedimento; não é consentimento.";

export type ResultadoDaCiencia = { ok: true; leitura: LeituraPop } | { ok: false; erro: string; status: number };

/** Nova ciência da versão VIGENTE do POP pela pessoa (ativa, da mesma empresa). Uma por pessoa e versão. */
export function novaCiencia(data: Pick<AppDB, "empresas" | "colaboradores" | "leiturasPop">, entrada: { empresaId: string; popId: string; colaboradorId: string }, agora: Date, novoId: string): ResultadoDaCiencia {
  const pop = (data.empresas?.[entrada.empresaId]?.pops || []).find((item) => item.id === entrada.popId);
  const vigente = popVigente(pop);
  if (!pop || !vigente) return { ok: false, erro: "Este POP não tem versão aprovada para a ciência.", status: 409 };
  const pessoa = (data.colaboradores || []).find((item) => item.id === entrada.colaboradorId && item.empresaId === entrada.empresaId && item.ativo);
  if (!pessoa) return { ok: false, erro: "Pessoa não encontrada na equipe desta empresa.", status: 404 };
  if ((data.leiturasPop || []).some((item) => item.popId === pop.id && item.popVersao === vigente.versao && item.colaboradorId === pessoa.id)) {
    return { ok: false, erro: "Esta pessoa já confirmou a ciência desta versão.", status: 409 };
  }
  const criadoEm = agora.toISOString();
  return { ok: true, leitura: { id: novoId, empresaId: entrada.empresaId, popId: pop.id, popVersao: vigente.versao, colaboradorId: pessoa.id, data: dataISOLocal(criadoEm), viaPin: true, criadoEm } };
}

export type LinhaDaEquipe = { colaborador: Colaborador; confirmou: boolean; dataDaCiencia?: string };

/** Lista da equipe com quem confirmou a versão (por PIN ou pela leitura registrada pelo gestor) e quem está pendente. */
export function equipeDaCiencia(popId: string, versao: string, colaboradores: Colaborador[], leituras: LeituraPop[]): { linhas: LinhaDaEquipe[]; confirmadas: number; total: number } {
  const leitura = leituraDaVersao(popId, versao, colaboradores, leituras);
  const linhas = leitura.linhas.map((linha) => ({ colaborador: linha.colaborador, confirmou: Boolean(linha.lido), dataDaCiencia: linha.lido ? linha.data : undefined }));
  return { linhas, confirmadas: leitura.lidos, total: leitura.total };
}

/** Relatório por função (cargo): quantas pessoas de cada cargo confirmaram a versão. Sem cargo = "Sem cargo". */
export function cienciaPorFuncao(linhas: LinhaDaEquipe[]): { funcao: string; total: number; confirmadas: number }[] {
  const mapa = new Map<string, { funcao: string; total: number; confirmadas: number }>();
  for (const linha of linhas) {
    const funcao = (linha.colaborador.cargo || "").trim() || "Sem cargo";
    const atual = mapa.get(funcao) || { funcao, total: 0, confirmadas: 0 };
    atual.total += 1;
    if (linha.confirmou) atual.confirmadas += 1;
    mapa.set(funcao, atual);
  }
  return [...mapa.values()].sort((a, b) => a.funcao.localeCompare(b.funcao, "pt-BR"));
}
