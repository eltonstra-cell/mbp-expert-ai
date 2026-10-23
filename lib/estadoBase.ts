// Guarda no aparelho (IndexedDB) a BASE da mesclagem: o estado que o servidor tinha na última sincronização, com a versão (updated_at).
// Sem ela não há como separar "o que eu mudei sem sinal" de "o que o outro aparelho mudou". Os conflitos ainda não resolvidos ficam no localStorage.
import type { AppDB } from "../types/index.ts";
import type { Conflito } from "./mesclaTresVias.ts";

export type BaseSalva = { estado: AppDB; versao: string | null; salvoEm: string };

const BANCO = "mbp-estado-base";
const LOJA = "bases";

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO, 1);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains(LOJA)) pedido.result.createObjectStore(LOJA);
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error || new Error("Armazenamento do aparelho indisponível."));
  });
}

async function operar<T>(modo: IDBTransactionMode, fazer: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const banco = await abrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = banco.transaction(LOJA, modo);
      const pedido = fazer(tx.objectStore(LOJA));
      tx.oncomplete = () => resolve(pedido.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    banco.close();
  }
}

const chaveDaBase = (identidade: string | null | undefined) => `base:${(identidade || "").trim().toLocaleLowerCase("pt-BR")}`;

export async function lerBase(identidade: string | null | undefined): Promise<BaseSalva | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    return ((await operar<BaseSalva | undefined>("readonly", (loja) => loja.get(chaveDaBase(identidade)))) as BaseSalva | undefined) || null;
  } catch {
    return null;
  }
}

export async function gravarBase(identidade: string | null | undefined, estado: AppDB, versao: string | null): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    await operar("readwrite", (loja) => loja.put({ estado, versao, salvoEm: new Date().toISOString() } satisfies BaseSalva, chaveDaBase(identidade)));
    return true;
  } catch {
    return false;
  }
}

const chaveDosConflitos = (identidade: string | null | undefined) => `mbp-expert-ai:conflitos:${(identidade || "").trim().toLocaleLowerCase("pt-BR")}`;

export function lerConflitos(identidade: string | null | undefined): Conflito[] {
  try {
    const bruto = localStorage.getItem(chaveDosConflitos(identidade));
    const lista = bruto ? JSON.parse(bruto) : [];
    return Array.isArray(lista) ? (lista as Conflito[]) : [];
  } catch {
    return [];
  }
}

export function gravarConflitos(identidade: string | null | undefined, conflitos: Conflito[]): void {
  try {
    if (conflitos.length === 0) localStorage.removeItem(chaveDosConflitos(identidade));
    else localStorage.setItem(chaveDosConflitos(identidade), JSON.stringify(conflitos));
  } catch {
    // Sem armazenamento local: os conflitos ficam só na tela.
  }
}

/** Junta conflitos novos aos que já estão na lista, sem repetir o mesmo (mesma chave). */
export function juntarConflitos(atuais: Conflito[], novos: Conflito[]): Conflito[] {
  const mapa = new Map(atuais.map((c) => [c.id, c]));
  for (const c of novos) mapa.set(c.id, mapa.get(c.id) || c);
  return [...mapa.values()];
}
