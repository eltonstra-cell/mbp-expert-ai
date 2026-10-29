// Lista de Ambientes da empresa (Cadastros): só agrupamento NA EXIBIÇÃO. Nenhum dado muda.
// Ambiente próprio vinculado a um setor oficial MARCADO na empresa não ganha linha própria: aparece na linha do setor oficial.
import { limparVinculos, type VinculosDeAmbiente } from "./ambientesVisita.ts";

export type LinhaDeAmbiente = { setor: string; proprios: string[] };

export type AmbientesAgrupados = {
  /** Linhas a mostrar, na ordem da lista; `proprios` = ambientes próprios vinculados a esta linha (setor oficial), na ordem da lista. */
  linhas: LinhaDeAmbiente[];
  /** Ambiente próprio agrupado -> setor oficial cuja linha o mostra. Próprio sem entrada aqui tem linha normal. */
  linhaDoProprio: Record<string, string>;
};

export function agruparAmbientesPorVinculo(setores: string[], vinculos?: VinculosDeAmbiente): AmbientesAgrupados {
  const validos = limparVinculos(vinculos, setores);
  const linhaDoProprio: Record<string, string> = {};
  for (const setor of setores) {
    const oficial = validos[setor];
    if (oficial && setores.includes(oficial)) linhaDoProprio[setor] = oficial;
  }
  const linhas = setores
    .filter((setor) => !(setor in linhaDoProprio))
    .map((setor) => ({ setor, proprios: setores.filter((outro) => linhaDoProprio[outro] === setor) }));
  return { linhas, linhaDoProprio };
}

/** Nota da linha do setor oficial: "vinculado ao ambiente próprio X" (vários: "vinculado aos ambientes próprios X, Y e Z"). Vazia sem próprios. */
export function notaDosProprios(proprios: string[]): string {
  if (proprios.length === 0) return "";
  if (proprios.length === 1) return `vinculado ao ambiente próprio ${proprios[0]}`;
  const ultimo = proprios[proprios.length - 1];
  return `vinculado aos ambientes próprios ${proprios.slice(0, -1).join(", ")} e ${ultimo}`;
}
