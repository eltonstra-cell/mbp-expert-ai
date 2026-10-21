"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LIMITE_DA_GRAVACAO_MS, SILENCIO_PARA_PARAR_MS, criarDetectorDeFimDeFala } from "@/lib/fimDeFala";

export type EstadoVoz = "parado" | "ouvindo" | "transcrevendo";

// Mesma rota de transcrição e mesma autenticação (cookie da sessão) do ditado das não
// conformidades. A rota continua exigindo a permissão de IA no servidor. O áudio fica só na
// memória durante a gravação e nunca é guardado nem registrado em log. O fim de fala por silêncio (1 s, só depois de a pessoa começar a
// falar) é medido no próprio aparelho, pelo nível do microfone; nenhum áudio vai para o estado, para o Blob ou para log.
const ENDPOINT = "/api/audio/transcrever";

const TIPOS_PREFERIDOS = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];

export function useVoiceCapture({
  limiteMs = LIMITE_DA_GRAVACAO_MS,
  silencioMs = SILENCIO_PARA_PARAR_MS,
  onTexto,
}: {
  limiteMs?: number;
  /** Silêncio (depois de começar a falar) que encerra a gravação sozinha; 0 desliga. */
  silencioMs?: number;
  onTexto: (texto: string) => void;
}) {
  const [estado, setEstado] = useState<EstadoVoz>("parado");
  const [erro, setErro] = useState<string | null>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const medidorRef = useRef<{ intervalo: number; contexto: AudioContext } | null>(null);
  const canceladoRef = useRef(false);
  const onTextoRef = useRef(onTexto);
  onTextoRef.current = onTexto;

  const soltarMicrofone = useCallback(() => {
    if (medidorRef.current) {
      window.clearInterval(medidorRef.current.intervalo);
      void medidorRef.current.contexto.close().catch(() => undefined);
      medidorRef.current = null;
    }
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((faixa) => faixa.stop());
    streamRef.current = null;
  }, []);

  const parar = useCallback(() => {
    const gravador = gravadorRef.current;
    if (gravador && gravador.state === "recording") {
      try {
        gravador.requestData();
      } catch {
        // Alguns navegadores não exigem requestData antes de parar.
      }
      window.setTimeout(() => {
        if (gravador.state === "recording") gravador.stop();
      }, 120);
    }
  }, []);

  const cancelar = useCallback(() => {
    canceladoRef.current = true;
    const gravador = gravadorRef.current;
    if (gravador && gravador.state === "recording") gravador.stop();
    else soltarMicrofone();
    setEstado("parado");
  }, [soltarMicrofone]);

  const iniciar = useCallback(async () => {
    if (estado !== "parado") return;
    setErro(null);
    canceladoRef.current = false;

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setErro("O microfone precisa de internet para transformar a fala em texto. Digite no campo.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setErro("Este navegador não liberou a gravação. Digite no campo.");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
    } catch (error) {
      const nome = (error as { name?: string })?.name;
      setErro(
        nome === "NotAllowedError" || nome === "SecurityError"
          ? "Microfone bloqueado: libere a permissão no navegador ou digite."
          : "Microfone indisponível: digite no campo."
      );
      return;
    }
    streamRef.current = stream;

    const mimeType = TIPOS_PREFERIDOS.find((tipo) => MediaRecorder.isTypeSupported(tipo));
    let gravador: MediaRecorder;
    try {
      gravador = new MediaRecorder(
        stream,
        mimeType ? { mimeType, audioBitsPerSecond: 32000 } : { audioBitsPerSecond: 32000 }
      );
    } catch {
      gravador = new MediaRecorder(stream);
    }
    gravadorRef.current = gravador;
    const partes: BlobPart[] = [];

    gravador.ondataavailable = (evento) => {
      if (evento.data && evento.data.size > 0) partes.push(evento.data);
    };
    gravador.onerror = () => {
      soltarMicrofone();
      gravadorRef.current = null;
      setEstado("parado");
      setErro("Não foi possível gravar o áudio. Digite no campo.");
    };
    gravador.onstop = async () => {
      soltarMicrofone();
      gravadorRef.current = null;
      if (canceladoRef.current) {
        setEstado("parado");
        return;
      }
      const tipoAudio = gravador.mimeType || mimeType || "audio/mp4";
      const audio = new Blob(partes, { type: tipoAudio });
      partes.length = 0;
      if (!audio.size) {
        setEstado("parado");
        setErro("Não detectei áudio. Toque no microfone, fale e tente de novo.");
        return;
      }
      setEstado("transcrevendo");
      try {
        const extensao = tipoAudio.includes("webm") ? "webm" : tipoAudio.includes("ogg") ? "ogg" : tipoAudio.includes("wav") ? "wav" : "m4a";
        const form = new FormData();
        form.append("audio", audio, `busca.${extensao}`);
        const resposta = await fetch(ENDPOINT, { method: "POST", credentials: "same-origin", body: form });
        const corpo = await resposta.json().catch(() => null);
        if (!resposta.ok) {
          throw new Error(corpo?.error || "Não foi possível transcrever o áudio.");
        }
        const texto = typeof corpo?.text === "string" ? corpo.text.trim() : "";
        if (!texto) {
          setErro("Não consegui identificar fala. Tente de novo ou digite no campo.");
        } else {
          onTextoRef.current(texto);
        }
      } catch (error) {
        setErro(error instanceof Error ? error.message : "Não foi possível transcrever o áudio. Digite no campo.");
      } finally {
        setEstado("parado");
      }
    };

    gravador.start(250);
    setEstado("ouvindo");
    // Fim de fala: mede o nível do microfone a cada 100 ms; 1 s de silêncio depois da primeira fala encerra e transcreve.
    if (silencioMs > 0) {
      try {
        const Contexto = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Contexto) {
          const contexto = new Contexto();
          const analisador = contexto.createAnalyser();
          analisador.fftSize = 1024;
          contexto.createMediaStreamSource(stream).connect(analisador);
          const amostras = new Uint8Array(analisador.fftSize);
          const detector = criarDetectorDeFimDeFala({ silencioMs, limiteMs, inicioMs: performance.now() });
          const intervalo = window.setInterval(() => {
            analisador.getByteTimeDomainData(amostras);
            let soma = 0;
            for (const amostra of amostras) {
              const x = (amostra - 128) / 128;
              soma += x * x;
            }
            const decisao = detector.processar(Math.sqrt(soma / amostras.length), performance.now());
            if (decisao !== "continuar" && gravador.state === "recording") {
              window.clearInterval(intervalo);
              gravador.stop();
            }
          }, 100);
          medidorRef.current = { intervalo, contexto };
        }
      } catch {
        // Sem medidor, vale o botão do microfone e o limite de tempo.
      }
    }
    // Limite máximo de gravação: comando curto, nunca uma gravação esquecida aberta.
    timerRef.current = window.setTimeout(() => {
      if (gravador.state === "recording") gravador.stop();
    }, limiteMs);
  }, [estado, limiteMs, silencioMs, soltarMicrofone]);

  useEffect(
    () => () => {
      canceladoRef.current = true;
      const gravador = gravadorRef.current;
      if (gravador && gravador.state === "recording") gravador.stop();
      soltarMicrofone();
    },
    [soltarMicrofone]
  );

  return { estado, erro, iniciar, parar, cancelar, limparErro: () => setErro(null) };
}
