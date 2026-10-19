"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { iniciarMedidorDeVolume } from "@/components/useNivelDeAudio";
import { MENSAGEM_SEM_FALA, ehSilencio } from "@/lib/transcricao";

export const LIMITE_AUDIO = 3 * 1024 * 1024;
const BARRAS_MEDIDOR = 14;

export function formatarTempo(total: number) {
  const minutos = Math.floor(total / 60);
  return `${minutos}:${String(total % 60).padStart(2, "0")}`;
}

export function restanteDoLimite(bytes: number, segundos: number) {
  if (segundos < 2 || bytes <= 0) return "—";
  const porSegundo = bytes / segundos;
  const restantes = Math.max(0, Math.floor((LIMITE_AUDIO - bytes) / Math.max(1, porSegundo)));
  return formatarTempo(restantes);
}

function pararTrilhas(stream: MediaStream | null) {
  stream?.getTracks().forEach((trilha) => trilha.stop());
}

function ehPermissaoNegada(falha: unknown) {
  return falha instanceof DOMException && (falha.name === "NotAllowedError" || falha.name === "SecurityError");
}

function complemento(alternativa: string) {
  return alternativa ? ` Libere no navegador ou use “${alternativa}”.` : " Libere o acesso no navegador.";
}

type OpcoesCamera = {
  /** Foto tirada (JPEG). Nada é salvo aqui: quem chama decide o que fazer com ela. */
  aoCapturar: (foto: File) => void;
  /** Nome do botão de arquivo citado nos avisos (vazio = sem sugestão). */
  alternativa?: string;
};

/** Câmera ao vivo (getUserMedia) com captura de um quadro. Compartilhada pelo Registrar e pelas Evidências. */
export function useCapturaCamera({ aoCapturar, alternativa = "Enviar arquivo" }: OpcoesCamera) {
  const [ativa, setAtiva] = useState(false);
  const [aviso, setAviso] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const aoCapturarRef = useRef(aoCapturar);
  aoCapturarRef.current = aoCapturar;

  const liberar = useCallback(() => {
    pararTrilhas(streamRef.current);
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setAtiva(false);
  }, []);

  useEffect(() => liberar, [liberar]);

  // Liga a prévia só depois que o <video> existe (evita corrida entre o estado e a renderização).
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!ativa || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [ativa]);

  const abrir = useCallback(async (): Promise<boolean> => {
    setAviso("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setAviso(`Este navegador não permite usar a câmera.${alternativa ? ` Use “${alternativa}”.` : ""}`);
      return false;
    }
    try {
      pararTrilhas(streamRef.current);
      streamRef.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      setAtiva(true);
      return true;
    } catch (falha) {
      setAviso(
        ehPermissaoNegada(falha)
          ? `A permissão da câmera foi negada.${complemento(alternativa)}`
          : `Não encontramos uma câmera neste aparelho.${alternativa ? ` Use “${alternativa}”.` : ""}`
      );
      return false;
    }
  }, [alternativa]);

  const capturar = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setAviso("A câmera ainda está iniciando. Tente de novo em instantes.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        liberar();
        if (!blob) {
          setAviso("Não foi possível capturar a foto. Tente de novo.");
          return;
        }
        aoCapturarRef.current(new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  }, [liberar]);

  return { ativa, aviso, setAviso, videoRef, abrir, capturar, cancelar: liberar, liberar };
}

type OpcoesAudio = {
  /** Gravação pronta (com som e dentro do limite). Nada é salvo aqui. */
  aoGravar: (audio: File, segundos: number) => void;
  alternativa?: string;
};

/** Gravação de áudio (MediaRecorder) com medidor de volume, relógio e limite de 3 MB. */
export function useCapturaAudio({ aoGravar, alternativa = "Enviar arquivo" }: OpcoesAudio) {
  const [gravando, setGravando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [segundos, setSegundos] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [niveis, setNiveis] = useState<number[]>(() => Array.from({ length: BARRAS_MEDIDOR }, () => 0));
  const streamRef = useRef<MediaStream | null>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const trechosRef = useRef<Blob[]>([]);
  const relogioRef = useRef<number | null>(null);
  const medidorRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const volumeRef = useRef<{ pico: () => number; parar: () => void } | null>(null);
  const segundosRef = useRef(0);
  const aoGravarRef = useRef(aoGravar);
  aoGravarRef.current = aoGravar;

  const encerrarApoios = useCallback(() => {
    pararTrilhas(streamRef.current);
    streamRef.current = null;
    if (relogioRef.current) window.clearInterval(relogioRef.current);
    relogioRef.current = null;
    if (medidorRef.current) window.clearInterval(medidorRef.current);
    medidorRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    volumeRef.current?.parar();
    volumeRef.current = null;
  }, []);

  /** Descarta a gravação em andamento (cancelar, fechar, desmontar). */
  const liberar = useCallback(() => {
    const gravador = gravadorRef.current;
    if (gravador && gravador.state !== "inactive") {
      gravador.ondataavailable = null;
      gravador.onstop = null;
      try {
        gravador.stop();
      } catch {
        // gravador já encerrado
      }
    }
    gravadorRef.current = null;
    encerrarApoios();
    setNiveis(Array.from({ length: BARRAS_MEDIDOR }, () => 0));
    setGravando(false);
  }, [encerrarApoios]);

  useEffect(() => liberar, [liberar]);

  const parar = useCallback(() => {
    if (gravadorRef.current && gravadorRef.current.state !== "inactive") gravadorRef.current.stop();
  }, []);

  const iniciar = useCallback(async (): Promise<boolean> => {
    setAviso("");
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAviso(`Este navegador não grava áudio.${alternativa ? ` Use “${alternativa}”.` : ""}`);
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      volumeRef.current = iniciarMedidorDeVolume(stream);
      const gravador = new MediaRecorder(stream);
      trechosRef.current = [];
      setBytes(0);
      gravador.ondataavailable = (evento) => {
        if (evento.data.size > 0) {
          trechosRef.current.push(evento.data);
          const total = trechosRef.current.reduce((soma, trecho) => soma + trecho.size, 0);
          setBytes(total);
          // Para sozinho perto do limite de 3 MB, sem estourar o arquivo.
          if (total >= LIMITE_AUDIO * 0.97 && gravador.state === "recording") gravador.stop();
        }
      };
      gravador.onstop = () => {
        const picoDoVolume = volumeRef.current?.pico() ?? 1;
        encerrarApoios();
        setNiveis(Array.from({ length: BARRAS_MEDIDOR }, () => 0));
        setGravando(false);
        const tipo = gravador.mimeType || "audio/webm";
        const blob = new Blob(trechosRef.current, { type: tipo });
        if (blob.size === 0) return;
        // Gravação sem som não vira registro.
        if (ehSilencio(picoDoVolume)) {
          setAviso(MENSAGEM_SEM_FALA);
          return;
        }
        if (blob.size > LIMITE_AUDIO) {
          setAviso("A gravação passou de 3 MB. Grave um trecho mais curto.");
          return;
        }
        const extensao = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm";
        aoGravarRef.current(new File([blob], `audio-${Date.now()}.${extensao}`, { type: tipo }), segundosRef.current);
      };
      gravadorRef.current = gravador;
      // Medidor de som ao vivo (Web Audio): mostra que o microfone está captando.
      try {
        const Contexto = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Contexto) {
          const contexto = new Contexto();
          const analisador = contexto.createAnalyser();
          analisador.fftSize = 64;
          contexto.createMediaStreamSource(stream).connect(analisador);
          audioCtxRef.current = contexto;
          const dados = new Uint8Array(analisador.frequencyBinCount);
          if (medidorRef.current) window.clearInterval(medidorRef.current);
          medidorRef.current = window.setInterval(() => {
            analisador.getByteFrequencyData(dados);
            const passo = Math.max(1, Math.floor(dados.length / BARRAS_MEDIDOR));
            setNiveis(Array.from({ length: BARRAS_MEDIDOR }, (_, i) => Math.min(1, (dados[i * passo] || 0) / 200)));
          }, 80);
        }
      } catch {
        // sem medidor: a gravação continua normalmente
      }
      gravador.start(500);
      segundosRef.current = 0;
      setSegundos(0);
      if (relogioRef.current) window.clearInterval(relogioRef.current);
      relogioRef.current = window.setInterval(() => {
        segundosRef.current += 1;
        setSegundos(segundosRef.current);
      }, 1000);
      setGravando(true);
      return true;
    } catch (falha) {
      setAviso(
        ehPermissaoNegada(falha)
          ? `A permissão do microfone foi negada.${complemento(alternativa)}`
          : "Não encontramos um microfone neste aparelho."
      );
      return false;
    }
  }, [alternativa, encerrarApoios]);

  return { gravando, aviso, setAviso, segundos, bytes, niveis, iniciar, parar, liberar };
}
