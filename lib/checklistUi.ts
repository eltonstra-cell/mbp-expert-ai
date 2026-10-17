// Estado visual dos botões de resposta do checklist.
// Antes de responder os três ficam claros; depois o escolhido fica na cor cheia e os outros apagados.

export type RespostaDoChecklist = "Conforme" | "Não Conforme" | "Não se aplica";
export type EstadoDoBotao = "claro" | "marcado" | "apagado";

export function estadosDosBotoes(status: string): Record<RespostaDoChecklist, EstadoDoBotao> {
  const escolhido: RespostaDoChecklist | null = status === "Conforme" || status === "Não Conforme" || status === "Não se aplica" ? status : null;
  const estado = (resposta: RespostaDoChecklist): EstadoDoBotao => (escolhido === null ? "claro" : escolhido === resposta ? "marcado" : "apagado");
  return { Conforme: estado("Conforme"), "Não Conforme": estado("Não Conforme"), "Não se aplica": estado("Não se aplica") };
}
