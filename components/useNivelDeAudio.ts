"use client";

/**
 * Mede o volume de uma gravação em andamento. `pico()` devolve o maior volume (0 a 1) ouvido até agora.
 * Sem Web Audio no aparelho, devolve 1 (não bloqueia a gravação).
 */
export function iniciarMedidorDeVolume(stream: MediaStream): { pico: () => number; parar: () => void } {
  try {
    const Contexto = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Contexto) return { pico: () => 1, parar: () => undefined };
    const contexto = new Contexto();
    const fonte = contexto.createMediaStreamSource(stream);
    const analisador = contexto.createAnalyser();
    analisador.fftSize = 1024;
    fonte.connect(analisador);
    const amostras = new Uint8Array(analisador.fftSize);
    let maior = 0;
    const tempo = window.setInterval(() => {
      analisador.getByteTimeDomainData(amostras);
      for (let i = 0; i < amostras.length; i += 1) {
        const nivel = Math.abs(amostras[i] - 128) / 128;
        if (nivel > maior) maior = nivel;
      }
    }, 80);
    return {
      pico: () => maior,
      parar: () => {
        window.clearInterval(tempo);
        void contexto.close().catch(() => undefined);
      },
    };
  } catch {
    return { pico: () => 1, parar: () => undefined };
  }
}
