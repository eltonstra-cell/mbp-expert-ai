"use client";

import { avisar } from "@/lib/dialogos";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useIaPermitida } from "@/components/IaPermissionContext";
import { useOnline } from "@/components/useOnline";
import RevisaoTranscricao from "@/components/RevisaoTranscricao";
import { iniciarMedidorDeVolume } from "@/components/useNivelDeAudio";
import { MENSAGEM_SEM_FALA, ehSilencio } from "@/lib/transcricao";
import { estadoDaLinha, formatarTempo, type EstadoVoz } from "@/lib/vozLinha";

type Props = {
  fieldKey: string;
  value: string;
  onChange: (value: string) => void;
  contexto?: string;
  somenteVoz?: boolean;
  /** Só o ícone do microfone (sem o texto "Falar"), para ficar DENTRO do campo, na ponta direita. */
  soIcone?: boolean;
  /** Texto do botão de IA (padrão "IA"). */
  rotuloIa?: string;
  /** Texto do botão de voz (padrão "Falar"). */
  rotuloVoz?: string;
  /** "linha": uma linha só (item à esquerda, Falar e IA), com barra de gravação e avisos no próprio campo. */
  variante?: "padrao" | "linha";
  /** Variante linha: botão que vem antes do Falar (ex.: Foto); recebe se está gravando. */
  linhaInicio?: (gravando: boolean) => ReactNode;
  /** Variante linha: situação da voz (para o campo mostrar "Ouvindo…"). */
  onEstado?: (estado: EstadoVoz) => void;
  /** Variante linha: avisos de erro dados no próprio campo, em vez de uma janela. */
  onAviso?: (texto: string) => void;
  /** Quem interpreta a fala (ex.: equipamentos): recebe o texto ditado no lugar de juntá-lo ao campo. */
  onTextoDitado?: (texto: string) => void;
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
  soIcone = false,
  rotuloIa = "IA",
  rotuloVoz = "Falar",
  variante = "padrao",
  linhaInicio,
  onEstado,
  onAviso,
  onTextoDitado,
}: Props) {
  const iaPermitida = useIaPermitida();
  const online = useOnline();
  const SEM_INTERNET = "Precisa de internet";
  const [gravando, setGravando] = useState(false);
  const [transcrevendo, setTranscrevendo] = useState(false);
  const [melhorando, setMelhorando] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const medidorRef = useRef<{ pico: () => number; nivel: () => number; parar: () => void } | null>(null);
  const [barras, setBarras] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);
  const [segundos, setSegundos] = useState(0);
  const inicioRef = useRef(0);
  const [proposta, setProposta] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");

  const avisarErro = (texto: string) => {
    if (onAviso) onAviso(texto);
    else void avisar(texto);
  };

  useEffect(() => {
    onEstado?.(gravando ? "gravando" : transcrevendo ? "transcrevendo" : "ocioso");
  }, [gravando, transcrevendo, onEstado]);

  // Medidor de barrinhas e relógio enquanto grava (só o volume do momento; nada é guardado).
  useEffect(() => {
    if (!gravando || variante !== "linha") return;
    setSegundos(0);
    const tempo = window.setInterval(() => {
      const nivel = medidorRef.current?.nivel() ?? 0;
      setBarras((antes) => [...antes.slice(1), Math.min(1, nivel * 2.2)]);
      setSegundos(Math.floor((Date.now() - inicioRef.current) / 1000));
    }, 100);
    return () => window.clearInterval(tempo);
  }, [gravando, variante]);

  useEffect(() => {
    if (!aviso) return;
    const tempo = window.setTimeout(() => setAviso(""), 3500);
    return () => window.clearTimeout(tempo);
  }, [aviso]);

  async function iniciarOuParar() {
    if (!online && !gravando) {
      avisarErro(variante === "linha" ? "Sem sinal: digite a observação." : "O ditado por voz precisa de internet para transformar a fala em texto. Digite no campo.");
      return;
    }
    if (gravando && recorderRef.current) {
      const gravador = recorderRef.current;
      try { gravador.requestData(); } catch {}
      window.setTimeout(() => {
        if (gravador.state === "recording") gravador.stop();
      }, 120);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      avisarErro("Este aparelho não grava áudio para ditar. Digite a observação.");
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
        avisarErro("Não foi possível gravar o áudio. Tente de novo ou digite.");
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
          avisarErro(error instanceof Error ? error.message : "Não foi possível transcrever o áudio.");
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
      avisarErro("Não consegui usar o microfone. Libere o microfone nas permissões do navegador e tente de novo, ou digite.");
    }
  }

  async function melhorar() {
    const texto = (value || "").trim();
    if (!texto) {
      void avisar("Primeiro escreva ou dite algum texto.");
      return;
    }
    if (!navigator.onLine) {
      if (variante === "linha" && onAviso) onAviso("Sem sinal: a IA volta com a conexão.");
      else void avisar("A melhoria de texto com IA precisa de internet.");
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
      void avisar(error instanceof Error ? error.message : "Não foi possível melhorar o texto.");
    } finally {
      setMelhorando(false);
    }
  }

  const extras = (
    <>
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
            if (onTextoDitado) onTextoDitado(texto);
          else onChange(juntarTexto(value, texto));
            setProposta(null);
          }}
        />
      )}
    </>
  );

  if (variante === "linha") {
    if (!iaPermitida) return <div className="voz-linha">{linhaInicio?.(false)}</div>;
    const estado = estadoDaLinha(gravando ? "gravando" : transcrevendo ? "transcrevendo" : "ocioso", { podeFotografar: true, melhorando });
    return (
      <>
        <div className={`voz-linha${gravando ? " is-gravando" : ""}`}>
          {linhaInicio?.(gravando)}
          {estado.falar.modo === "barra" ? (
            <div className="voz-falar voz-barra" role="status" aria-label="Gravando a observação">
              <span className="voz-ponto" aria-hidden="true" />
              <span className="voz-medidor" aria-hidden="true">
                {barras.map((nivel, indice) => (
                  <span key={indice} style={{ height: `${4 + Math.round(nivel * 14)}px` }} />
                ))}
              </span>
              <span className="voz-tempo">{formatarTempo(segundos)}</span>
              <button type="button" className="voz-parar" onClick={iniciarOuParar}>
                Parar
              </button>
            </div>
          ) : (
            <button type="button" className={`voz-falar voz-btn${!online ? " is-sem-sinal" : ""}`} onClick={iniciarOuParar} disabled={estado.falar.desativado} title={!online ? "Sem sinal: digite a observação" : "Falar a observação"}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M6 10a6 6 0 0 0 12 0" />
                <path d="M12 16v5M9 21h6" />
              </svg>
              <span>{transcrevendo ? "Transcrevendo" : rotuloVoz}</span>
              {!online && <span className="voz-semsinal" aria-hidden="true">🔒</span>}
            </button>
          )}
          {!somenteVoz && (
            <button type="button" className={`voz-ia${estado.ia.apagado || !online ? " is-apagado is-sem-sinal" : ""}`} onClick={melhorar} disabled={estado.ia.desativado} title={!online ? "Sem sinal: a IA volta com a conexão" : "Melhorar texto com IA"}>
              <span aria-hidden="true">✦</span>
              <span>{melhorando ? "Ajustando" : rotuloIa}</span>
              {!online && <span className="voz-semsinal" aria-hidden="true">🔒</span>}
            </button>
          )}
        </div>
        {extras}
      </>
    );
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
          <span>{melhorando ? "Ajustando" : !online ? SEM_INTERNET : rotuloIa}</span>
        </button>
      )}
      <button
        type="button"
        onClick={iniciarOuParar}
        disabled={melhorando || transcrevendo}
        className={`field-assist-voice ${gravando ? "is-recording" : ""}${soIcone ? " field-assist-voice--icone" : ""}`}
        title={gravando ? "Parar e transcrever" : "Falar"}
        aria-label={gravando ? "Parar e transcrever" : transcrevendo ? "Transcrevendo" : !online ? SEM_INTERNET : rotuloVoz}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M6 10a6 6 0 0 0 12 0" />
          <path d="M12 16v5M9 21h6" />
        </svg>
        {!soIcone && <span>{transcrevendo ? "Transcrevendo" : gravando ? "Parar" : !online ? SEM_INTERNET : rotuloVoz}</span>}
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
          if (onTextoDitado) onTextoDitado(texto);
          else onChange(juntarTexto(value, texto));
          setProposta(null);
        }}
      />
    )}
    </>
  );
}
