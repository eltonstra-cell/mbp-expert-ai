import { nomeDeExibicaoDoAmbiente } from "./checklistEnvs.ts";
import type { EtapaCorrecao } from "./actionPlan.ts";
import { textoDoQueFalta } from "./rascunhoDeCorrecao.ts";

// Textos da lista de Correções: o título é o NOME DO ITEM; o ambiente fica pequeno embaixo.

export const NOME_DAS_ETAPAS = ["Identificada", "Com plano", "Em acompanhamento", "Resolvida"] as const;

export function linhaDaCorrecao(nc: { titulo: string; ambiente: string; numero: number }): { titulo: string; ambiente: string; codigo: string } {
  return {
    titulo: (nc.titulo || "").trim(),
    ambiente: nomeDeExibicaoDoAmbiente((nc.ambiente || "").trim()) || "Sem ambiente",
    codigo: `NC${String(nc.numero).padStart(2, "0")}`,
  };
}

export const NOME_DA_GRAVIDADE: Record<"Crítica" | "Importante" | "Rotina", string> = { Crítica: "Crítica", Importante: "Importante", Rotina: "Leve" };

export type CampoDoPlano = "acao" | "responsavel" | "prazo";
const ROTULO_DA_FALTA: Record<CampoDoPlano, string> = { acao: "o que será feito", responsavel: "responsável", prazo: "prazo" };
const ORDEM_DOS_CAMPOS: CampoDoPlano[] = ["acao", "responsavel", "prazo"];

function listaComE(itens: string[]): string {
  return itens.length <= 1 ? itens.join("") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`;
}

/** "Falta informar: responsável e prazo" (vazio quando nada falta). Campos com valor inválido entram como "Corrija". */
export function mensagemDeFaltas(faltando: CampoDoPlano[], invalidos: CampoDoPlano[] = []): string {
  const falta = ORDEM_DOS_CAMPOS.filter((campo) => faltando.includes(campo)).map((campo) => ROTULO_DA_FALTA[campo]);
  const corrigir = ORDEM_DOS_CAMPOS.filter((campo) => invalidos.includes(campo) && !faltando.includes(campo)).map((campo) => ROTULO_DA_FALTA[campo]);
  const partes: string[] = [];
  if (falta.length > 0) partes.push(`Falta informar: ${listaComE(falta)}`);
  if (corrigir.length > 0) partes.push(`Corrija: ${listaComE(corrigir)}`);
  return partes.join(". ");
}

/** Primeiro campo que precisa de atenção (para levar o foco até ele). */
export function primeiroCampoComProblema(faltando: CampoDoPlano[], invalidos: CampoDoPlano[] = []): CampoDoPlano | null {
  return ORDEM_DOS_CAMPOS.find((campo) => faltando.includes(campo) || invalidos.includes(campo)) ?? null;
}

/** Texto ao lado do "Salvar plano": o que falta, ou o que abre depois de salvar. */
export function rodapeDoSalvar({ faltas, proximoTitulo, etapa, haOutraSemPlano = false }: { faltas: string[]; proximoTitulo: string | null; etapa: EtapaCorrecao; haOutraSemPlano?: boolean }): string {
  if (faltas.length > 0) return textoDoQueFalta(faltas);
  if (proximoTitulo) return `Depois de salvar, abre: ${proximoTitulo}`;
  if (etapa !== "identificadas") return "";
  return haOutraSemPlano ? "Depois de salvar, abre a próxima sem plano" : "Esta é a última sem plano";
}
