// Regras puras da transcrição de voz: o texto da instrução interna nunca pode virar "fala",
// e áudio sem som não é enviado.

/** Instrução enviada ao serviço de transcrição (não é fala do usuário). */
export const INSTRUCAO_DE_TRANSCRICAO =
  "Transcreva fielmente em português do Brasil. Preserve termos técnicos de segurança dos alimentos, higiene, checklist, não conformidade, POP e plano de ação.";

/** Pico de volume (0 a 1) abaixo do qual a gravação é tratada como silêncio. */
export const LIMITE_DE_SILENCIO = 0.05;

export const MENSAGEM_SEM_FALA = "Não ouvi nada, tente de novo";

export function ehSilencio(picoDeVolume: number, limite = LIMITE_DE_SILENCIO): boolean {
  return !(picoDeVolume >= limite);
}

function palavras(texto: string): string[] {
  return texto
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

const PALAVRAS_DA_INSTRUCAO = palavras(INSTRUCAO_DE_TRANSCRICAO);

/** Maior sequência de palavras seguidas do texto que também existe, na mesma ordem, na instrução. */
function maiorTrechoEmComum(texto: string[], instrucao: string[]): number {
  let melhor = 0;
  for (let i = 0; i < texto.length; i += 1) {
    for (let j = 0; j < instrucao.length; j += 1) {
      let k = 0;
      while (i + k < texto.length && j + k < instrucao.length && texto[i + k] === instrucao[j + k]) k += 1;
      if (k > melhor) melhor = k;
    }
  }
  return melhor;
}

/** True quando o resultado repete (inteiro ou em partes) a instrução enviada à transcrição. */
export function ehEcoDaInstrucao(texto: string): boolean {
  const lista = palavras(texto);
  if (lista.length === 0) return false;
  const comum = maiorTrechoEmComum(lista, PALAVRAS_DA_INSTRUCAO);
  if (comum >= 5) return true;
  return comum >= 3 && comum / lista.length >= 0.6;
}

export type AvaliacaoDeTranscricao = { ok: true; texto: string } | { ok: false; motivo: "vazio" | "eco" | "curto" };

/** `duracaoSeg` é opcional (informada pelo aplicativo). */
export function avaliarTranscricao(texto: string, duracaoSeg?: number): AvaliacaoDeTranscricao {
  const limpo = (texto || "").trim();
  const lista = palavras(limpo);
  if (lista.length === 0) return { ok: false, motivo: "vazio" };
  if (ehEcoDaInstrucao(limpo)) return { ok: false, motivo: "eco" };
  if (typeof duracaoSeg === "number" && duracaoSeg >= 10 && lista.length < 2) return { ok: false, motivo: "curto" };
  return { ok: true, texto: limpo };
}
