// Como a fonte de uma pergunta do checklist aparece na tela. Nada é inventado: sem fonte registrada, o texto é "Fonte não registrada".
// Checklists criados ANTES desta regra guardam textos genéricos no campo "referencia" ("Boas Práticas — critério operacional",
// "Manual de Boas Práticas — Capítulo 1"): eles não dizem de onde a pergunta veio, então aparecem como "Fonte não registrada" (o dado guardado não é mexido).

export const SEM_FONTE = "Fonte não registrada";

const GENERICOS = [/^Boas Práticas — critério operacional$/i, /^Manual de Boas Práticas — Capítulo [123](?: — .*)?$/i, /^Boas Práticas — .*$/i];

/** Texto "Fonte: …" para a tela; sem fonte registrada mostra só "Fonte não registrada" (sem repetir a palavra). Não altera o dado guardado. */
export function rotuloDaFonte(referencia: string | undefined | null): string {
  const fonte = fonteParaExibir(referencia);
  return fonte === SEM_FONTE ? SEM_FONTE : `Fonte: ${fonte}`;
}

/** Linha de fonte da coluna de apoio: a fonte real sempre aparece; "Fonte não registrada" só aparece quando não há fonte E nenhum outro material de apoio (uma linha só). */
export function linhaDeFonteDoApoio(fonte: string | undefined | null, temOutroApoio: boolean): string {
  const exibida = fonteParaExibir(fonte);
  if (exibida === SEM_FONTE && temOutroApoio) return "";
  return rotuloDaFonte(fonte);
}

export function fonteParaExibir(referencia: string | undefined | null): string {
  const texto = (referencia || "").trim();
  if (!texto) return SEM_FONTE;
  if (texto === SEM_FONTE) return SEM_FONTE;
  if (/^(Derivada do Manual|Parcial:)/.test(texto)) return texto;
  if (GENERICOS.some((padrao) => padrao.test(texto))) return SEM_FONTE;
  return texto;
}
