import type { AppDB } from "@/types";

export const STORAGE_KEY = "mbp-expert-ai-v2";

export const emptyDB: AppDB = {
  empresas: {},
  empresaAtualId: null,
  visitas: [],
  ncs: [],
  evidencias: [],
};

export function loadDB(): AppDB {
  if (typeof window === "undefined") return emptyDB;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
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
    };
  } catch {
    return emptyDB;
  }
}

export function saveDB(db: AppDB) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }
}
