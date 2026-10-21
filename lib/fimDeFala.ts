// Fim de fala por silêncio (busca por voz): a gravação para sozinha depois de 1 s de silêncio, mas só DEPOIS de a pessoa ter começado a falar
// (senão pararia antes da primeira palavra). Há um limite máximo de gravação para não ficar presa em ambiente com ruído.
// Função pura: recebe o nível do microfone (0 a 1) e o instante, e diz o que fazer. Nenhum áudio passa por aqui.

export const SILENCIO_PARA_PARAR_MS = 1000;
export const LIMITE_DA_GRAVACAO_MS = 8000;
/** Nível (RMS de 0 a 1) a partir do qual o som conta como fala. */
export const NIVEL_DE_FALA = 0.03;

export type DecisaoDaGravacao = "continuar" | "fim-de-fala" | "limite";

export type DetectorDeFimDeFala = {
  /** `nivel` do instante `agoraMs` (qualquer relógio em milissegundos); chamar de tempos em tempos enquanto grava. */
  processar: (nivel: number, agoraMs: number) => DecisaoDaGravacao;
  /** Já houve fala? */
  falou: () => boolean;
};

export function criarDetectorDeFimDeFala(opcoes: { silencioMs?: number; limiteMs?: number; nivelDeFala?: number; inicioMs: number }): DetectorDeFimDeFala {
  const silencioMs = opcoes.silencioMs ?? SILENCIO_PARA_PARAR_MS;
  const limiteMs = opcoes.limiteMs ?? LIMITE_DA_GRAVACAO_MS;
  const nivelDeFala = opcoes.nivelDeFala ?? NIVEL_DE_FALA;
  let comecouAFalar = false;
  let ultimoSomEm = opcoes.inicioMs;
  return {
    processar(nivel, agoraMs) {
      if (nivel >= nivelDeFala) {
        comecouAFalar = true;
        ultimoSomEm = agoraMs;
      }
      if (agoraMs - opcoes.inicioMs >= limiteMs) return "limite";
      // O silêncio só conta depois que a fala começou.
      if (comecouAFalar && agoraMs - ultimoSomEm >= silencioMs) return "fim-de-fala";
      return "continuar";
    },
    falou: () => comecouAFalar,
  };
}
