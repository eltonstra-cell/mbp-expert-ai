"use client";

import { useRef, useState } from "react";

type Props = {
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  contexto?: string;
  somenteVoz?: boolean;
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
}: Props) {
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [melhorando, setMelhorando] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

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
        setTranscrevendo(true);
        stream.getTracks().forEach((track) => track.stop());

        try {
          const tipo = recorder.mimeType || mimeType || "audio/mp4";
          const blob = new Blob(chunksRef.current, { type: tipo });
          if (!blob.size) throw new Error("O áudio ficou vazio. Tente falar por alguns segundos.");

          const extensao = tipo.includes("webm") ? "webm" : tipo.includes("ogg") ? "ogg" : "m4a";
          const form = new FormData();
          form.append("audio", blob, `ditado-${fieldKey}.${extensao}`);

          const response = await fetch("/api/audio/transcrever", {
            method: "POST",
            credentials: "same-origin",
            body: form,
          });
          const body = await response.json().catch(() => null);
          if (!response.ok) throw new Error(body?.error || "Não foi possível transcrever o áudio.");

          const texto = typeof body?.text === "string" ? body.text.trim() : "";
          if (!texto) throw new Error("Não foi possível identificar fala nesse áudio.");
          onChange(juntarTexto(value, texto));
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

  return (
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
          <span>{melhorando ? "Ajustando" : "IA"}</span>
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
        <span>{transcrevendo ? "Transcrevendo" : gravando ? "Parar" : "Falar"}</span>
      </button>
    </div>
  );
}
