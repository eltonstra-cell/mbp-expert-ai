// Avanço automático do checklist: depois de "Conforme" ou "Não se aplica" a resposta já está gravada e a tela abre o próximo item.
// Continua sendo a resposta individual do RT (um toque = uma resposta); não é lote. "Não conforme" nunca avança sozinho.

/** Pausa para o botão já aparecer marcado antes de a tela trocar. */
export const ESPERA_DO_AVANCO_MS = 500;
/** Tempo do aviso com "Desfazer". */
export const DURACAO_DO_AVISO_DO_AVANCO_MS = 4500;

export type RespostaDoAvanco = "Conforme" | "Não Conforme" | "Não se aplica" | "Pendente";

export function deveAvancarSozinho(entrada: { status: RespostaDoAvanco; avancarLigado: boolean; observacaoDigitada: boolean; podeEditar: boolean }): boolean {
  if (!entrada.avancarLigado || !entrada.podeEditar) return false;
  if (entrada.status !== "Conforme" && entrada.status !== "Não se aplica") return false;
  // Se o RT já digitou uma observação antes do toque, ele ainda está mexendo no item: não avança sozinho.
  return !entrada.observacaoDigitada;
}

/** "Item 4 · Conforme", "Ambiente concluído · Próximo: Cozinha" ou "Ambiente concluído · Fim do checklist". */
export function textoDoAvanco(entrada: { posNoAmbiente: number; status: RespostaDoAvanco; proximoAmbiente: string; fimDaLista: boolean }): string {
  if (entrada.fimDaLista) return "Ambiente concluído · Fim do checklist";
  if (entrada.proximoAmbiente) return `Ambiente concluído · Próximo: ${entrada.proximoAmbiente}`;
  return `Item ${entrada.posNoAmbiente} · ${entrada.status === "Não se aplica" ? "Não se aplica" : "Conforme"}`;
}
