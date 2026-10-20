"use client";

/**
 * Mede o volume de uma gravação em andamento. `pico()` devolve o maior volume (0 a 1) ouvido até agora e
 * `nivel()` o volume do momento (para o medidor de barrinhas). Nada do áudio é guardado.
 * Sem Web Audio no aparelho, devolve 1 (não bloqueia a gravação).
 */
export function iniciarMedidorDeVolume(stream: MediaStream): { pico: () => number; nivel: () => number; parar: () => void } {
  try {
    const Contexto = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return { pico: () => 1, nivel: () => 0, parar: () => undefined };
    const contexto = new Contexto();
    const fonte = contexto.createMediaStreamSource(stream);
    const analisador = contexto.createAnalyser();
    analisador.fftSize = 1024;
    fonte.connect(analisador);
    const amostras = new Uint8Array(analisador.fftSize);
    let maior = 0;
    let agora = 0;
    const tempo = window.setInterval(() => {
      analisador.getByteTimeDomainData(amostras);
      let deste = 0;
      for (let i = 0; i < amostras.length; i += 1) {
        const nivel = Math.abs(amostras[i] - 128) / 128;
        if (nivel > maior) maior = nivel;
        if (nivel > deste) deste = nivel;
      }
      agora = deste;
    }, 80);
    return {
      pico: () => maior,
      nivel: () => agora,
      parar: () => {
        window.clearInterval(tempo);
        void contexto.close().catch(() => undefined);
      },
    };
  } catch {
    return { pico: () => 1, nivel: () => 0, parar: () => undefined };
  }
}
