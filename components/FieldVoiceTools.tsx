"use client";

import { useEffect, useRef, useState } from "react";
import { useIaPermitida } from "@/components/IaPermissionContext";
import RevisaoTranscricao from "@/components/RevisaoTranscricao";
import { iniciarMedidorDeVolume } from "@/components/useNivelDeAudio";
import { MENSAGEM_SEM_FALA, ehSilencio } from "@/lib/transcricao";

type Props = {
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  contexto?: string;
  somenteVoz?: boolean;
  /** Texto do botão de IA (padrão "IA"). */
  rotuloIa?: string;
  /** Texto do botão de voz (padrão "Falar"). */
  rotuloVoz?: string;
};

function juntarTexto(atual: string, novo: string) {
  const base = (atual || "").trim();
  const texto = (novo || "").trim();
  if (!base) return texto;
  if (!texto) return base;
  return `${base}${/[.!?]$/.test(base) ? " " : ". "}${texto}`;
}

function escolherMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const tipos = [
    "audio/mp4",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  return tipos.find((tipo) => MediaRecorder.isTypeSupported?.(tipo)) || "";
}

export default function FieldVoiceTools({
  fieldKey,
  value,
  onChange,
  contexto = "",
  somenteVoz = false,
  rotuloIa = "IA",
  rotuloVoz = "Falar",
}: Props) {
  const iaPermitida = useIaPermitida();
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [melhorando, setMelhorando] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const medidorRef = useRef<{ pico: () => number; parar: () => void } | null>(null);
  const inicioRef = useRef(0);
  const [proposta, setProposta] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    if (!aviso) return;
    const tempo = window.setTimeout(() => setAviso(""), 3500);
    return () => window.clearTimeout(tempo);
  }, [aviso]);

  async function iniciarOuParar() {
    if (gravando && recorderRef.current) {
      const gravador = recorderRef.current;
      try { gravador.requestData(); } catch {}
      window.setTimeout(() => {
        if (gravador.state === "recording") gravador.stop();
      }, 120);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      window.alert("Este dispositivo não oferece gravação de áudio compatível.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mimeType = escolherMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];
      medidorRef.current = iniciarMedidorDeVolume(stream);
      inicioRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunksRef.current.push(event.data);
      };

      recorder.onerror = () => {
        setGravando(false);
        setTranscrevendo(false);
        stream.getTracks().forEach((track) => track.stop());
        window.alert("Não foi possível gravar o áudio.");
      };

      recorder.onstop = async () => {
        setGravando(false);
        stream.getTracks().forEach((track) => track.stop());
        const pico = medidorRef.current?.pico() ?? 1;
        medidorRef.current?.parar();
        medidorRef.current = null;
        const duracao = Math.max(0, Math.round((Date.now() - inicioRef.current) / 1000));
        // Sem som: nem envia ao serviço de transcrição.
        if (ehSilencio(pico)) {
          setAviso(MENSAGEM_SEM_FALA);
          chunksRef.current = [];
          recorderRef.current = null;
          streamRef.current = null;
          return;
        }
        setTranscrevendo(true);

        try {
          const tipo = recorder.mimeType || mimeType || "audio/mp4";
          const blob = new Blob(chunksRef.current, { type: tipo });
          if (!blob.size) throw new Error("O áudio ficou vazio. Tente falar por alguns segundos.");

          const extensao = tipo.includes("webm") ? "webm" : tipo.includes("ogg") ? "ogg" : "m4a";
          const form = new FormData();
          form.append("audio", blob, `ditado-${fieldKey}.${extensao}`);
          form.append("duracao", String(duracao));

          const response = await fetch("/api/audio/transcrever", {
            method: "POST",
            credentials: "same-origin",
            body: form,
          });
          const body = await response.json().catch(() => null);
          if (body?.semFala) {
            setAviso(MENSAGEM_SEM_FALA);
            return;
          }
          if (!response.ok) throw new Error(body?.error || "Não foi possível transcrever o áudio.");

          const texto = typeof body?.text === "string" ? body.text.trim() : "";
          if (!texto) {
            setAviso(MENSAGEM_SEM_FALA);
            return;
          }
          // O texto ouvido só entra no campo depois da revisão.
          setProposta(texto);
        } catch (error) {
          window.alert(error instanceof Error ? error.message : "Não foi possível transcrever o áudio.");
        } finally {
          setTranscrevendo(false);
          chunksRef.current = [];
          recorderRef.current = null;
          streamRef.current = null;
        }
      };

      recorder.start(250);
      setGravando(true);
    } catch (error) {
      setGravando(false);
      window.alert("Não consegui acessar o microfone. Verifique a permissão do navegador.");
    }
  }

  async function melhorar() {
    const texto = (value || "").trim();
    if (!texto) {
      window.alert("Primeiro escreva ou dite algum texto.");
      return;
    }
    if (!navigator.onLine) {
      window.alert("A melhoria de texto com IA precisa de internet.");
      return;
    }

    try {
      setMelhorando(true);
      const response = await fetch("/api/texto/melhorar", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, contexto }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || "Não foi possível melhorar o texto.");
      const melhorado = typeof body?.text === "string" ? body.text.trim() : "";
      if (!melhorado) throw new Error("A IA não retornou um texto utilizável.");
      onChange(melhorado);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Não foi possível melhorar o texto.");
    } finally {
      setMelhorando(false);
    }
  }

  if (!iaPermitida) return null;

  return (
    <>
    <div className="field-assist-tools">
      {!somenteVoz && (
        <button
          type="button"
          onClick={melhorar}
          disabled={melhorando || gravando || transcrevendo}
          className={`field-assist-ai ${melhorando ? "is-working" : ""}`}
          title="Melhorar texto com IA"
        >
          <span aria-hidden="true">✦</span>
          <span>{melhorando ? "Ajustando" : rotuloIa}</span>
        </button>
      )}
      <button
        type="button"
        onClick={iniciarOuParar}
        disabled={melhorando || transcrevendo}
        className={`field-assist-voice ${gravando ? "is-recording" : ""}`}
        title={gravando ? "Parar e transcrever" : "Falar"}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M6 10a6 6 0 0 0 12 0" />
          <path d="M12 16v5M9 21h6" />
        </svg>
        <span>{transcrevendo ? "Transcrevendo" : gravando ? "Parar" : rotuloVoz}</span>
      </button>
    </div>
    {aviso && (
      <div className="pc-toast voz-toast" role="status">
        <span>{aviso}</span>
      </div>
    )}
    {proposta !== null && (
      <RevisaoTranscricao
        texto={proposta}
        onDescartar={() => setProposta(null)}
        onDitarDeNovo={() => {
          setProposta(null);
          void iniciarOuParar();
        }}
        onUsar={(texto) => {
          onChange(juntarTexto(value, texto));
          setProposta(null);
        }}
      />
    )}
    </>
  );
}
