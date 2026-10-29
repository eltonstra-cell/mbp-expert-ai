// Botão "←" (Voltar) das telas internas: histórico de telas dentro do app (não depende da barra de endereço, então funciona no app instalado).
// Volta uma tela; sem histórico, vai ao nível acima. A pilha vive só na memória.

export type LocalDeTela = {
  /** Tela (view) do app. */
  view: string;
  /** Ficha de POP aberta nela, quando houver. */
  popId?: string;
  /** Sub-aba da Central ou dos Documentos aberta nela, quando houver. */
  sub?: string;
};

export const LIMITE_DO_HISTORICO = 30;

export const mesmoLocal = (a: LocalDeTela | undefined, b: LocalDeTela | undefined): boolean => Boolean(a && b) && a!.view === b!.view && (a!.popId || "") === (b!.popId || "") && (a!.sub || "") === (b!.sub || "");

/** Acrescenta o local atual ao fim da pilha (sem repetir o que já está no topo). */
export function registrarLocal(pilha: LocalDeTela[], local: LocalDeTela): LocalDeTela[] {
  if (mesmoLocal(pilha[pilha.length - 1], local)) return pilha;
  return [...pilha, local].slice(-LIMITE_DO_HISTORICO);
}

/** A tela de antes, se houver: devolve o destino e a pilha sem o local atual. */
export function voltarUma(pilha: LocalDeTela[]): { destino?: LocalDeTela; pilha: LocalDeTela[] } {
  if (pilha.length < 2) return { pilha };
  const nova = pilha.slice(0, -1);
  return { destino: nova[nova.length - 1], pilha: nova };
}

const TELAS_DA_VISITA = new Set(["visita", "ambientes", "checklist", "ncs", "plano", "evidencias", "relatorio", "popsvisita", "correcoes", "historico", "acompanhamento"]);

/** Sem histórico: a tela um nível acima. Ficha de POP volta à lista de POPs; etapas da visita voltam a Visitas; o resto vai ao Início. */
export function nivelAcima(local: LocalDeTela): LocalDeTela {
  if (local.popId) return { view: local.view, sub: "pops" };
  if (TELAS_DA_VISITA.has(local.view)) return { view: "visitas" };
  return { view: "inicio" };
}

/** O botão "←" aparece em toda tela interna: tudo, menos Início e Visitas (as duas telas de entrada). */
export const mostrarVoltar = (local: LocalDeTela): boolean => local.view !== "inicio" && local.view !== "visitas";
