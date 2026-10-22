// "Continuar de onde parei" (Início): as últimas 3 telas abertas (ficha de POP, comprovantes, visita em andamento), por usuário e empresa.
// Guarda SÓ a rota e o rótulo ("POP-05 · Lavagem e higienização de mãos"): nenhum nome de pessoa, dado de saúde, foto ou localização.
// Fica no localStorage; qualquer falha do armazenamento só significa "sem lista". Some no logout (`limparContinuar`).

export const LIMITE_DE_TELAS_RECENTES = 3;
const PREFIXO_DA_CHAVE = "mbp-continuar";

export type TelaRecente = {
  /** pop = ficha de um POP; comprovantes = lista de comprovantes; visita = visita em andamento. */
  tipo: "pop" | "comprovantes" | "visita";
  /** Id do POP ou da visita (a rota); vazio em "comprovantes". */
  id: string;
  rotulo: string;
};

type Armazem = Pick<Storage, "getItem" | "setItem" | "removeItem">;
type ArmazemComChaves = Armazem & Pick<Storage, "key" | "length">;

function armazemPadrao(): ArmazemComChaves | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function chaveDoContinuar(usuarioId?: string | null, empresaId?: string | null): string {
  return `${PREFIXO_DA_CHAVE}:${usuarioId || "local"}:${empresaId || "sem-empresa"}`;
}

const TIPOS = new Set(["pop", "comprovantes", "visita"]);

function limpar(valor: unknown): TelaRecente[] {
  if (!Array.isArray(valor)) return [];
  const vistos = new Set<string>();
  const lista: TelaRecente[] = [];
  for (const item of valor) {
    if (!item || typeof item !== "object") continue;
    const { tipo, id, rotulo } = item as Partial<TelaRecente>;
    if (typeof tipo !== "string" || !TIPOS.has(tipo) || typeof rotulo !== "string") continue;
    const rotuloLimpo = rotulo.replace(/\s+/g, " ").trim().slice(0, 90);
    const idLimpo = typeof id === "string" ? id.slice(0, 80) : "";
    const chave = `${tipo}:${idLimpo}`;
    if (!rotuloLimpo || vistos.has(chave)) continue;
    vistos.add(chave);
    lista.push({ tipo: tipo as TelaRecente["tipo"], id: idLimpo, rotulo: rotuloLimpo });
  }
  return lista.slice(0, LIMITE_DE_TELAS_RECENTES);
}

export function lerContinuar(usuarioId?: string | null, empresaId?: string | null, armazem: Armazem | null = armazemPadrao()): TelaRecente[] {
  try {
    return limpar(JSON.parse(armazem?.getItem(chaveDoContinuar(usuarioId, empresaId)) || "[]"));
  } catch {
    return [];
  }
}

/** Põe a tela no topo (sem repetir a mesma, no máximo 3). Devolve a lista nova mesmo que o armazenamento falhe. */
export function registrarTela(tela: TelaRecente, usuarioId?: string | null, empresaId?: string | null, armazem: Armazem | null = armazemPadrao()): TelaRecente[] {
  const atuais = lerContinuar(usuarioId, empresaId, armazem);
  const lista = limpar([tela, ...atuais.filter((item) => !(item.tipo === tela.tipo && item.id === tela.id))]);
  try {
    armazem?.setItem(chaveDoContinuar(usuarioId, empresaId), JSON.stringify(lista));
  } catch {
    /* sem armazenamento: só não lembra */
  }
  return lista;
}

/** Tira uma tela da lista (POP excluído, visita concluída). */
export function esquecerTela(tipo: TelaRecente["tipo"], id: string, usuarioId?: string | null, empresaId?: string | null, armazem: Armazem | null = armazemPadrao()): TelaRecente[] {
  const lista = lerContinuar(usuarioId, empresaId, armazem).filter((item) => !(item.tipo === tipo && item.id === id));
  try {
    armazem?.setItem(chaveDoContinuar(usuarioId, empresaId), JSON.stringify(lista));
  } catch {
    /* ignora */
  }
  return lista;
}

/** No logout: apaga a lista de todos os usuários e empresas deste aparelho. */
export function limparContinuar(armazem: ArmazemComChaves | null = armazemPadrao()): void {
  try {
    if (!armazem) return;
    const chaves: string[] = [];
    for (let i = 0; i < armazem.length; i += 1) {
      const chave = armazem.key(i);
      if (chave && chave.startsWith(`${PREFIXO_DA_CHAVE}:`)) chaves.push(chave);
    }
    chaves.forEach((chave) => armazem.removeItem(chave));
  } catch {
    /* ignora */
  }
}
