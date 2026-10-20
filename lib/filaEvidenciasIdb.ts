// Armazém da fila de evidências no IndexedDB do aparelho. O conteúdo fica SEM criptografia (limitação conhecida).
import { FalhaDeEnvio, causaDaResposta, type ArmazemDaFila, type ItemDaFila } from "./filaEvidencias.ts";

export const NOME_DO_BANCO = "mbp-fila-evidencias";
const LOJA = "itens";

function abrir(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(NOME_DO_BANCO, 1);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains(LOJA)) pedido.result.createObjectStore(LOJA, { keyPath: "id" });
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error || new Error("Armazenamento do aparelho indisponível."));
  });
}

async function transacao<T>(modo: IDBTransactionMode, operacao: (loja: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const banco = await abrir();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = banco.transaction(LOJA, modo);
      const pedido = operacao(tx.objectStore(LOJA));
      tx.oncomplete = () => resolve(pedido.result);
      tx.onerror = () => reject(tx.error || new Error("Falha ao gravar no aparelho."));
      tx.onabort = () => reject(tx.error || new Error("Falha ao gravar no aparelho."));
    });
  } finally {
    banco.close();
  }
}

export function indexedDbDisponivel(): boolean {
  return typeof indexedDB !== "undefined";
}

export const armazemDoAparelho: ArmazemDaFila = {
  salvar: async (item) => {
    await transacao("readwrite", (loja) => loja.put(item));
  },
  ler: (id) => transacao<ItemDaFila | undefined>("readonly", (loja) => loja.get(id)),
  listar: () => transacao<ItemDaFila[]>("readonly", (loja) => loja.getAll()),
  apagar: async (id) => {
    await transacao("readwrite", (loja) => loja.delete(id));
  },
};

/** Envio de um item pela rota de upload, com a chave do item e progresso. Usa XMLHttpRequest só para medir o progresso. */
export function enviarItemPeloNavegador(item: ItemDaFila, arquivo: Blob, aoProgresso: (percentual: number) => void): Promise<{ pathname: string; url: string }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", arquivo, item.nomeArquivo);
    form.append("visitaId", item.visitaId);
    form.append("evidenciaId", item.id);
    form.append("chaveEnvio", item.id);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/evidencias/upload");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (evento) => {
      if (evento.lengthComputable && evento.total > 0) aoProgresso(Math.min(99, Math.round((evento.loaded / evento.total) * 100)));
    };
    xhr.onerror = () => reject(new FalhaDeEnvio("rede"));
    xhr.ontimeout = () => reject(new FalhaDeEnvio("rede"));
    xhr.onload = () => {
      const ehJson = (xhr.getResponseHeader("content-type") || "").includes("application/json");
      const redirecionou = Boolean(xhr.responseURL) && !xhr.responseURL.includes("/api/evidencias/upload");
      const causa = causaDaResposta(xhr.status, ehJson, redirecionou);
      if (causa) return reject(new FalhaDeEnvio(causa));
      try {
        const corpo = JSON.parse(xhr.responseText);
        if (typeof corpo?.pathname !== "string") return reject(new FalhaDeEnvio("servidor"));
        resolve({ pathname: corpo.pathname, url: String(corpo.url || "") });
      } catch {
        reject(new FalhaDeEnvio("servidor"));
      }
    };
    xhr.send(form);
  });
}
