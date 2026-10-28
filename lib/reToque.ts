// Re-toque na resposta já marcada limpa a resposta; um toque duplo acidental logo após marcar não pode apagá-la.
export const IGNORAR_RETOQUE_MS = 700;

/** Verdadeiro quando o re-toque vale (já passou a janela depois de marcar). `marcadoEm` nulo = nunca marcado nesta tela. */
export function reToqueValido(agora: number, marcadoEm: number | null): boolean {
  if (marcadoEm === null) return true;
  return agora - marcadoEm >= IGNORAR_RETOQUE_MS;
}
