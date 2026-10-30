// Avanço automático do checklist: depois de "Conforme" ou "Não se aplica" a resposta já está gravada e a tela abre o próximo item, sem aviso.
// Continua sendo a resposta individual do RT (um toque = uma resposta); não é lote. "Não conforme" nunca avança sozinho.

/** Pausa para o botão já aparecer marcado antes de a tela trocar. */
export const ESPERA_DO_AVANCO_MS = 500;

export type RespostaDoAvanco = "Conforme" | "Não Conforme" | "Não se aplica" | "Pendente";

export function deveAvancarSozinho(entrada: { status: RespostaDoAvanco; avancarLigado: boolean; observacaoDigitada: boolean; podeEditar: boolean }): boolean {
  if (!entrada.avancarLigado || !entrada.podeEditar) return false;
  if (entrada.status !== "Conforme" && entrada.status !== "Não se aplica") return false;
  // Se o RT já digitou uma observação antes do toque, ele ainda está mexendo no item: não avança sozinho.
  return !entrada.observacaoDigitada;
}

export type ItemDoAvanco = { id: string; ambiente: string; status: RespostaDoAvanco };

export type DestinoDoAvanco = {
  /** Item a abrir; null quando o item respondido era o último da lista. */
  alvo: ItemDoAvanco | null;
  /** O item respondido era o último do ambiente: o avanço leva ao próximo ambiente. */
  trocouDeAmbiente: boolean;
  /** Depois desta resposta não sobra nenhum item pendente na visita. */
  tudoRespondido: boolean;
};

/**
 * Para onde o avanço automático leva depois de uma resposta (lista na ordem da tela; o item respondido ainda pode vir como "Pendente", pois a tela
 * calcula o destino com os dados do toque). Dentro do ambiente vai ao próximo item; ao responder o último do ambiente vai ao primeiro item
 * pendente do ambiente seguinte (ou ao primeiro dele, se não houver pendente). Sem ambiente seguinte, não há alvo.
 */
export function destinoDoAvanco(lista: ItemDoAvanco[], itemId: string): DestinoDoAvanco {
  const posicao = lista.findIndex((item) => item.id === itemId);
  if (posicao < 0) return { alvo: null, trocouDeAmbiente: false, tudoRespondido: false };
  const atual = lista[posicao];
  const tudoRespondido = lista.every((item) => item.id === itemId || item.status !== "Pendente");
  const seguinte = lista[posicao + 1];
  if (seguinte && seguinte.ambiente === atual.ambiente) return { alvo: seguinte, trocouDeAmbiente: false, tudoRespondido };
  // Último da posição no ambiente, mas ficou pergunta sem resposta antes dela: volta a ela em vez de pular o ambiente.
  const pendenteNoAmbiente = lista.find((item) => item.ambiente === atual.ambiente && item.id !== itemId && item.status === "Pendente");
  if (pendenteNoAmbiente) return { alvo: pendenteNoAmbiente, trocouDeAmbiente: false, tudoRespondido };
  if (!seguinte) return { alvo: null, trocouDeAmbiente: false, tudoRespondido };
  const doProximo = lista.filter((item) => item.ambiente === seguinte.ambiente);
  return { alvo: doProximo.find((item) => item.status === "Pendente") || doProximo[0], trocouDeAmbiente: true, tudoRespondido };
}
