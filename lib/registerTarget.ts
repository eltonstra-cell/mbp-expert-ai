export type VisitaAberta = { id: string; empresaId: string; criadoEm?: string; data?: string };

const marca = (visita: VisitaAberta) => `${visita.data || ""}|${visita.criadoEm || ""}`;

/** Mais recente primeiro (data da visita, depois criação). */
export function maisRecentesPrimeiro<T extends VisitaAberta>(visitas: T[]): T[] {
  return [...visitas].sort((a, b) => marca(b).localeCompare(marca(a)));
}

/**
 * Destino padrão do "Registrar agora": a visita em que o usuário está trabalhando; sem ela,
 * a visita aberta mais recente da empresa ativa; sem empresa ativa com visita, a mais recente de todas.
 * Nunca "a primeira da lista".
 */
export function visitaPadraoParaRegistro<T extends VisitaAberta>(
  abertas: T[],
  visitaAtualId: string | null | undefined,
  empresaAtivaId: string | null | undefined
): T | undefined {
  if (abertas.length === 0) return undefined;
  const emTrabalho = abertas.find((visita) => visita.id === visitaAtualId);
  if (emTrabalho) return emTrabalho;
  const daEmpresa = maisRecentesPrimeiro(abertas.filter((visita) => visita.empresaId === empresaAtivaId));
  if (daEmpresa.length > 0) return daEmpresa[0];
  return maisRecentesPrimeiro(abertas)[0];
}
