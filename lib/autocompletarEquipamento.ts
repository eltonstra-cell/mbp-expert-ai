// Autocompletar do campo "Equipamento ou móvel": a partir de 2 letras, até 6 nomes do catálogo de nomes (lib/catalogoNomesEquipamentos.ts, lista a validar
// pela RT) e dos equipamentos que a PRÓPRIA empresa já tem cadastrados (nunca de outras empresas). Só ajuda a digitar: escolher um nome apenas preenche o
// campo; o catálogo não gera sugestão em lote nem limite de temperatura.
import { CATALOGO_DE_NOMES_DE_EQUIPAMENTOS } from "./catalogoNomesEquipamentos.ts";
import { chaveDeEquipamento } from "./sinonimosEquipamentos.ts";

export const MINIMO_DE_LETRAS_PARA_SUGERIR = 2;
export const MAXIMO_DE_SUGESTOES = 6;

const letras = (texto: string) => (String(texto ?? "").match(/\p{L}/gu) || []).length;

/**
 * Sugestões para o texto digitado. Ordem: nome que começa com o texto, depois palavra que começa com o texto, depois texto no meio do nome;
 * dentro de cada grupo, primeiro o que a empresa já cadastrou. Sem repetir e sem devolver o nome já digitado por inteiro.
 */
export function sugerirNomesDeEquipamento(
  digitado: string,
  jaCadastrados: string[] = [],
  catalogo: readonly string[] = CATALOGO_DE_NOMES_DE_EQUIPAMENTOS,
  maximo: number = MAXIMO_DE_SUGESTOES
): string[] {
  if (letras(digitado) < MINIMO_DE_LETRAS_PARA_SUGERIR) return [];
  const busca = chaveDeEquipamento(digitado);
  if (!busca) return [];
  const vistos = new Set<string>();
  const candidatos: { nome: string; grupo: number; ordem: number }[] = [];
  [...jaCadastrados, ...catalogo].forEach((nome, ordem) => {
    const limpo = String(nome ?? "").trim().replace(/\s+/g, " ");
    const chave = chaveDeEquipamento(limpo);
    if (!chave || chave === busca || vistos.has(chave)) return;
    const grupo = chave.startsWith(busca) ? 0 : chave.split(" ").some((palavra) => palavra.startsWith(busca)) ? 1 : chave.includes(busca) ? 2 : -1;
    if (grupo < 0) return;
    vistos.add(chave);
    candidatos.push({ nome: limpo, grupo, ordem });
  });
  return candidatos
    .sort((a, b) => a.grupo - b.grupo || a.ordem - b.ordem)
    .slice(0, maximo)
    .map((item) => item.nome);
}
