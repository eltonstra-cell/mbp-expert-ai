// Ambientes próprios x setores oficiais na visita: regras puras (sem tela).
import { SETORES_OFICIAIS_MANUAL, normalizarSetorManual } from "./manualBase.ts";

/** Nome próprio do ambiente -> setor oficial vinculado (campo opcional da empresa; sem ele, nada muda). */
export type VinculosDeAmbiente = Record<string, string>;

/** Sem acento, sem diferença de maiúsculas e sem espaços repetidos. */
export function chaveDoNome(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

const eOficial = (nome: string) => (SETORES_OFICIAIS_MANUAL as readonly string[]).includes(nome);

/** O vínculo só vale para ambiente próprio da lista e com um setor oficial de verdade. */
export function limparVinculos(vinculos: VinculosDeAmbiente | undefined, setores: string[]): VinculosDeAmbiente {
  const limpo: VinculosDeAmbiente = {};
  for (const [nome, oficial] of Object.entries(vinculos || {})) {
    if (setores.includes(nome) && !eOficial(nome) && eOficial(oficial)) limpo[nome] = oficial;
  }
  return limpo;
}

/**
 * Ambientes que a visita mostra: se um ambiente próprio está vinculado a um setor oficial MARCADO, a visita mostra um item só
 * (o nome próprio) e o setor oficial sai da lista. Sem vínculo, a lista é a de sempre.
 */
export function ambientesParaVisita(setores: string[], vinculos?: VinculosDeAmbiente): string[] {
  const validos = limparVinculos(vinculos, setores);
  const cobertos = new Set(Object.values(validos).filter((oficial) => setores.includes(oficial)));
  return setores.filter((nome) => !cobertos.has(nome));
}

/** Se o nome já existe no Cadastro (ou nos setores oficiais, inclusive pelo apelido conhecido), devolve o nome existente. */
export function nomeJaExistente(nome: string, cadastro: string[]): string | undefined {
  const chave = chaveDoNome(nome);
  if (!chave) return undefined;
  const igual = [...cadastro, ...SETORES_OFICIAIS_MANUAL].find((existente) => chaveDoNome(existente) === chave);
  if (igual) return igual;
  const apelido = normalizarSetorManual(nome.trim());
  return apelido !== nome.trim() && eOficial(apelido) ? apelido : undefined;
}
