// Estado visual dos botões de resposta do checklist.
// Antes de responder os três ficam claros; depois o escolhido fica na cor cheia e os outros apagados.

export type RespostaDoChecklist = "Conforme" | "Não Conforme" | "Não se aplica";
export type EstadoDoBotao = "claro" | "marcado" | "apagado";

export function estadosDosBotoes(status: string): Record<RespostaDoChecklist, EstadoDoBotao> {
  const escolhido: RespostaDoChecklist | null = status === "Conforme" || status === "Não Conforme" || status === "Não se aplica" ? status : null;
  const estado = (resposta: RespostaDoChecklist): EstadoDoBotao => (escolhido === null ? "claro" : escolhido === resposta ? "marcado" : "apagado");
  return { Conforme: estado("Conforme"), "Não Conforme": estado("Não Conforme"), "Não se aplica": estado("Não se aplica") };
}

type Gravidade = "Crítica" | "Importante" | "Rotina";
type ComGravidade = { criticidade?: Gravidade; criticidadeSugerida?: Gravidade };

/** A gravidade "sugerida" é a que veio do critério: a original, mesmo depois de o profissional trocar. */
export function gravidadeSugerida(item: ComGravidade): Gravidade | undefined {
  return item.criticidadeSugerida ?? item.criticidade;
}

/** Alteração a gravar ao escolher uma gravidade: guarda a sugerida na primeira troca e nunca a sobrescreve. */
export function trocaDeGravidade(item: ComGravidade, nova: Gravidade): { criticidade: Gravidade; criticidadeSugerida?: Gravidade } {
  const sugerida = gravidadeSugerida(item);
  return sugerida ? { criticidade: nova, criticidadeSugerida: sugerida } : { criticidade: nova };
}
