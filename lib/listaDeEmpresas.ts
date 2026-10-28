import { quantidade } from "./plural.ts";

// Textos da lista de Empresas (Completo, Equilibrado e Campo usam os mesmos).

/** "10 setores · 2 equipamentos · 1 programa · 3 POPs", sem o que for zero; equipamentos, programas e POPs todos zero = "10 setores · sem equipamentos, programas e POPs". */
export function subtituloDaEmpresa(contagens: { setores: number; equipamentos: number; programas: number; pops: number }): string {
  const partes = [
    contagens.setores > 0 ? quantidade(contagens.setores, "setor", "setores") : "",
    contagens.equipamentos > 0 ? quantidade(contagens.equipamentos, "equipamento", "equipamentos") : "",
    contagens.programas > 0 ? quantidade(contagens.programas, "programa", "programas") : "",
    contagens.pops > 0 ? quantidade(contagens.pops, "POP", "POPs") : "",
  ].filter(Boolean);
  const nada = contagens.equipamentos + contagens.programas + contagens.pops === 0;
  if (nada) partes.push("sem equipamentos, programas e POPs");
  return partes.join(" · ");
}

/** O que falta, em texto simples: "Cadastro completo", "Falta horário de funcionamento" ou "3 pendências". */
export function textoDaPreparacao(faltas: string[]): string {
  if (faltas.length === 0) return "Cadastro completo";
  return faltas.length === 1 ? `Falta ${faltas[0]}` : `${faltas.length} pendências`;
}
