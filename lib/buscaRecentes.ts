// "Recentes" da busca do topo: até 5 destinos de navegação abertos pela busca. Guarda só o rótulo, a rota (id do destino) e o caminho
// mostrado ("Central › Documentos › POPs"): nenhum dado de empresa, visita, checklist ou saúde. Fica no localStorage, por usuário;
// qualquer falha de armazenamento só significa "sem recentes", a busca segue funcionando.

export const LIMITE_DE_RECENTES = 5;
const PREFIXO_DA_CHAVE = "mbp-busca-recentes";

export type Recente = { rotulo: string; rota: string; caminho?: string };

type Armazem = Pick<Storage, "getItem" | "setItem">;

function armazemPadrao(): Armazem | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function chaveDosRecentes(usuarioId?: string | null): string {
  return `${PREFIXO_DA_CHAVE}:${usuarioId || "local"}`;
}

/** Só destinos de navegação ("ir") e de ação ("agir") viram recente; empresas, visitas e itens do checklist nunca. */
export function podeVirarRecente(destino: { grupo: string }): boolean {
  return destino.grupo === "ir" || destino.grupo === "agir";
}

function limpar(valor: unknown): Recente[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  const lista: Recente[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") continue;
    const rotulo = typeof (item as Recente).rotulo === "string" ? (item as Recente).rotulo.slice(0, 80) : "";
    const rota = typeof (item as Recente).rota === "string" ? (item as Recente).rota.slice(0, 80) : "";
    const caminho = typeof (item as Recente).caminho === "string" ? ((item as Recente).caminho as string).slice(0, 120) : undefined;
    if (!rotulo || !rota || vistos.has(rota)) continue;
    vistos.add(rota);
    lista.push({ rotulo, rota, ...(caminho ? { caminho } : {}) });
  }
  return lista.slice(0, LIMITE_DE_RECENTES);
}

export function lerRecentes(usuarioId?: string | null, armazem: Armazem | null = armazemPadrao()): Recente[] {
  try {
    return limpar(JSON.parse(armazem?.getItem(chaveDosRecentes(usuarioId)) || "[]"));
  } catch {
    return [];
  }
}

/** Põe o destino no topo dos recentes (sem repetir a rota, no máximo 5). Devolve a lista nova mesmo que o armazenamento falhe. */
export function registrarRecente(
  destino: { id: string; grupo: string; titulo: string; detalhe?: string },
  usuarioId?: string | null,
  armazem: Armazem | null = armazemPadrao()
): Recente[] {
  const atuais = lerRecentes(usuarioId, armazem);
  if (!podeVirarRecente(destino)) return atuais;
  const novo: Recente = { rotulo: destino.titulo, rota: destino.id, ...(destino.detalhe ? { caminho: destino.detalhe } : {}) };
  const lista = limpar([novo, ...atuais.filter((item) => item.rota !== novo.rota)]);
  try {
    armazem?.setItem(chaveDosRecentes(usuarioId), JSON.stringify(lista));
  } catch {
    /* sem armazenamento: só não lembra */
  }
  return lista;
}
