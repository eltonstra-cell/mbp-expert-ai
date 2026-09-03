import type { AppDB } from "@/types";

export const STORAGE_KEY = "mbp-expert-ai-v2";

export function normalizeStorageIdentity(identity?: string | null): string | null {
  const normalized = identity?.trim().toLocaleLowerCase("pt-BR");
  return normalized || null;
}

export function scopedStorageKey(baseKey: string, identity?: string | null): string {
  const normalized = normalizeStorageIdentity(identity);
  return normalized
    ? `${baseKey}:usuario:${encodeURIComponent(normalized)}`
    : baseKey;
}

export const emptyDB: AppDB = {
  empresas: {},
  empresaAtualId: null,
  visitas: [],
  ncs: [],
  evidencias: [],
  usuarios: [],
  registrosAuditoria: [],
  configuracaoAcesso: {
    versao: 1,
    modo: "Preparação",
    autenticacao: "Não configurada",
    atualizadoEm: "",
  },
};

export function loadDB(identity?: string | null): AppDB {
  if (typeof window === "undefined") return emptyDB;

  try {
    const raw = localStorage.getItem(scopedStorageKey(STORAGE_KEY, identity));
    if (!raw) return emptyDB;

    const parsed = JSON.parse(raw);

    // Compatibilidade com versões anteriores que ainda não possuíam evidências.
    return {
      ...emptyDB,
      ...parsed,
      empresas: parsed.empresas || {},
      visitas: Array.isArray(parsed.visitas) ? parsed.visitas : [],
      ncs: Array.isArray(parsed.ncs) ? parsed.ncs : [],
      evidencias: Array.isArray(parsed.evidencias) ? parsed.evidencias : [],
      usuarios: Array.isArray(parsed.usuarios) ? parsed.usuarios : [],
      registrosAuditoria: Array.isArray(parsed.registrosAuditoria)
        ? parsed.registrosAuditoria
        : [],
      configuracaoAcesso:
        parsed.configuracaoAcesso && typeof parsed.configuracaoAcesso === "object"
          ? parsed.configuracaoAcesso
          : emptyDB.configuracaoAcesso,
    };
  } catch {
    return emptyDB;
  }
}

export function saveDB(db: AppDB, identity?: string | null): boolean {
  if (typeof window === "undefined") return false;

  const chaveAtual = scopedStorageKey(STORAGE_KEY, identity);
  const conteudo = JSON.stringify(db);

  try {
    localStorage.setItem(chaveAtual, conteudo);
    return true;
  } catch {
    // Depois que o armazenamento passou a ser separado por usuário, a chave
    // antiga sem identidade deixou de ser lida em sessões autenticadas. No
    // Safari ela pode continuar ocupando toda a cota do site. Remove somente
    // essa cópia obsoleta e tenta novamente, sem tocar nas cópias dos usuários.
    if (normalizeStorageIdentity(identity) && chaveAtual !== STORAGE_KEY) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.setItem(chaveAtual, conteudo);
        return true;
      } catch {
        // A nuvem continua sendo a fonte principal. A interface informará que
        // o modo offline permanece indisponível neste aparelho.
      }
    }

    return false;
  }
}
