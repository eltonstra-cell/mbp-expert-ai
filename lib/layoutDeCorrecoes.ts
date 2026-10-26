import { linhaDaCorrecao } from "./correcaoRotulos.ts";
import type { AgruparCorrecoes } from "./fluxoDeCorrecoes.ts";
import { seloDaReincidencia } from "./memoriaDoPlano.ts";

// Regras de exibição do painel e do cartão de Correções (só decidem o que aparece; nada grava).

type ComPar = { par?: { antes: unknown[]; depois: unknown[] } | null };

type EvidenciaComTipo = { tipo?: string };

/** Evidências que não são foto (áudio etc.): não entram no par antes/depois, então são listadas à parte. */
export function evidenciasSemFoto<T extends EvidenciaComTipo>(evidencias: T[]): T[] {
  return evidencias.filter((ev) => ev.tipo !== "Foto");
}

function fotosDoPar(nc: ComPar): number {
  return (nc.par?.antes.length ?? 0) + (nc.par?.depois.length ?? 0);
}

/** Número mostrado no título de Evidências: fotos do par antes/depois mais as evidências que não são foto. */
export function contagemDeEvidencias(nc: ComPar, evidencias: EvidenciaComTipo[]): number {
  return fotosDoPar(nc) + evidenciasSemFoto(evidencias).length;
}

/** Evidências com conteúdo: a contagem é maior que zero. */
export function conteudoDeEvidencias(nc: ComPar, evidencias: EvidenciaComTipo[]): boolean {
  return contagemDeEvidencias(nc, evidencias) > 0;
}

export function conteudoDeAtualizacoes(nc: { historico: unknown[] }): boolean {
  return nc.historico.length > 0;
}

/** Quais acréscimos entram na linha do fim do detalhe: só o que está vazio e que a pessoa pode fazer. */
export function acrescimosVazios(
  nc: ComPar & { historico: unknown[] },
  _evidencias: EvidenciaComTipo[],
  permissoes: { podeEditar: boolean; podeEvidenciar: boolean }
): { foto: boolean; atualizacao: boolean } {
  return {
    // O link "+ Foto" vale enquanto não houver FOTO (par vazio), mesmo com áudio já listado.
    foto: permissoes.podeEvidenciar && fotosDoPar(nc) === 0,
    atualizacao: permissoes.podeEditar && !conteudoDeAtualizacoes(nc),
  };
}

/** Os acréscimos vazios ficam na linha das Evidências só quando há evidências e não há bloco de Atualizações (com conteúdo ou em edição). */
export function acrescimosNaLinhaDasEvidencias(mostrarEvidencias: boolean, mostrarAtualizacoes: boolean): boolean {
  return mostrarEvidencias && !mostrarAtualizacoes;
}

export function rotuloDeRegistrarAtualizacao(resolvida: boolean): string {
  return resolvida ? "Registrar nova atualização / reabrir" : "+ Registrar atualização";
}

/** Segunda linha do cartão da lista: o ambiente só no agrupamento por Gravidade, mais os selos. Sem nada, não há segunda linha. */
export function selosDoCartao(
  nc: { titulo: string; ambiente: string; numero: number; reincidente: boolean; status: string; marcadaFeita: unknown },
  agrupar: AgruparCorrecoes
): { ambiente: string | null; selos: string[]; temLinha: boolean } {
  const ambiente = agrupar === "gravidade" ? linhaDaCorrecao(nc).ambiente : null;
  const selos = [...(nc.reincidente ? ["Reincidente"] : []), ...(nc.marcadaFeita && nc.status !== "Resolvida" ? ["Feita, a confirmar"] : [])];
  return { ambiente, selos, temLinha: Boolean(ambiente) || selos.length > 0 };
}

/** Segunda linha do detalhe: "Importante · Cozinha · item 2 · pela 2ª vez"; o código (NC01) vai à parte, para o fim da linha. */
export function contextoDoDetalhe(nc: { titulo: string; ambiente: string; numero: number; itemNumero: number; reincidente: boolean; vezes?: number }, nomeDaGravidade: string): { texto: string; codigo: string } {
  const linha = linhaDaCorrecao(nc);
  const partes = [nomeDaGravidade, linha.ambiente];
  if (nc.itemNumero > 0) partes.push(`item ${nc.itemNumero}`);
  if (nc.reincidente) partes.push((seloDaReincidencia(nc.vezes || 0) || "Reincidente").toLocaleLowerCase("pt-BR"));
  return { texto: partes.join(" · "), codigo: linha.codigo };
}

/** Largura mínima (px) reservada ao link "+N sugestões" / "Recolher sugestões" (o mais largo dos dois). */
export const RESERVA_DO_LINK_DE_SUGESTOES = 150;

/**
 * O chip "Ação que funcionou antes · Visita N" só fica na barra do campo da ação quando cabe INTEIRO, ao lado das ferramentas e (se houver
 * outras sugestões) do link "+N sugestões". Se não cabe, ele entra na lista de "+N sugestões" (nunca é cortado nem perde o "Visita N").
 * Larguras em px; `reservaDoMais` só vale quando há outras sugestões.
 */
export function chipDaAcaoCabeNaBarra(medidas: { larguraDaBarra: number; ferramentas: number; chip: number; reservaDoMais: number; espaco?: number }): boolean {
  const espaco = medidas.espaco ?? 8;
  const itens = medidas.reservaDoMais > 0 ? 3 : 2;
  const necessario = medidas.ferramentas + medidas.chip + medidas.reservaDoMais + espaco * (itens - 1);
  return medidas.larguraDaBarra >= necessario;
}
