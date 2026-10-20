// Conteúdo que só aparece quando existe de verdade: nada de texto de norma inventado nem de exemplo ainda não validado.

const PLACEHOLDER = /reservad|a definir|a validar|exemplo|em breve|lorem|texto aqui|\.\.\.$/i;

/** Texto oficial da base legal salvo para o critério; vazio quando não há (o bloco some). */
export function textoDeBaseLegal(item: { baseLegal?: string | null }): string {
  const texto = (item.baseLegal || "").trim();
  return texto && !PLACEHOLDER.test(texto) ? texto : "";
}

/** A ação padrão do critério só é mostrada depois de marcada como validada pelo RT. */
export function acaoPadraoVisivel(nc: { acaoSugerida?: string; acaoSugeridaValidada?: boolean }): string {
  return nc.acaoSugeridaValidada === true ? (nc.acaoSugerida || "").trim() : "";
}
