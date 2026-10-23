// Visita rápida: a visita nova já nasce com os ambientes e a ordem da última visita da empresa (sem visita anterior, vale a ordem do cadastro).
// O RT confirma com um toque, desmarca ou reordena antes de iniciar. Lógica pura: funciona offline com o que está no aparelho.

type VisitaComAmbientes = { id: string; empresaId: string; data?: string; criadoEm?: string; arquivada?: boolean; ambientes?: string[] };

/** Ambientes, na ordem, da visita mais recente da empresa que tenha ambientes (a visita `ignorarId` não conta). */
export function ordemDaUltimaVisita(visitas: VisitaComAmbientes[], empresaId: string, ignorarId?: string): string[] {
  const candidatas = visitas
    .filter((visita) => visita.empresaId === empresaId && visita.id !== ignorarId && !visita.arquivada && (visita.ambientes || []).length > 0)
    .sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.criadoEm || "").localeCompare(a.criadoEm || ""));
  return candidatas[0]?.ambientes || [];
}

/**
 * Ambientes da visita nova: os da última visita que ainda existem no cadastro, na ordem dela; depois os do cadastro que a última
 * visita não tinha (novos), na ordem do cadastro. `cadastro` já vem filtrado pelos vínculos (ambientesParaVisita).
 */
export function ambientesIniciais(cadastro: string[], visitas: VisitaComAmbientes[], empresaId: string, ignorarId?: string): string[] {
  const ultima = ordemDaUltimaVisita(visitas, empresaId, ignorarId);
  if (ultima.length === 0) return cadastro;
  const noCadastro = new Set(cadastro);
  const naUltima = ultima.filter((nome) => noCadastro.has(nome));
  const jaEntrou = new Set(naUltima);
  return [...naUltima, ...cadastro.filter((nome) => !jaEntrou.has(nome))];
}

/** Sobe (-1) ou desce (+1) um ambiente na lista; no limite, devolve a mesma lista. */
export function moverAmbiente(lista: string[], nome: string, delta: -1 | 1): string[] {
  const i = lista.indexOf(nome);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= lista.length) return lista;
  const copia = [...lista];
  [copia[i], copia[j]] = [copia[j], copia[i]];
  return copia;
}
