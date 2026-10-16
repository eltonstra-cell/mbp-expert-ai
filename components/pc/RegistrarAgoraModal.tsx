"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NavIcon } from "@/components/NavIcons";

export type VisitaParaRegistro = {
  id: string;
  rotulo: string;
  itens: { id: string; rotulo: string; ambiente: string }[];
};

type Props = {
  /** Aparelho em uso, para os textos ("câmera do celular", "do tablet", "do computador"). */
  aparelho?: "celular" | "tablet" | "computador";
  visitas: VisitaParaRegistro[];
  visitaInicialId: string;
  itemInicialId: string;
  onSalvar: (dados: {
    visitaId: string;
    arquivo: File;
    tipo: "Foto" | "Áudio";
    origem: "camera" | "arquivo" | "audio";
    descricao: string;
    item: { id: string; ambiente: string } | null;
  }) => Promise<void> | void;
  onFechar: () => void;
  onIrVisitas: () => void;
};

const LIMITE_AUDIO = 3 * 1024 * 1024;

function restanteDoLimite(bytes: number, segundos: number) {
  if (segundos < 2 || bytes <= 0) return "—";
  const porSegundo = bytes / segundos;
  const restantes = Math.max(0, Math.floor((LIMITE_AUDIO - bytes) / Math.max(1, porSegundo)));
  return formatarTempo(restantes);
}

function formatarTempo(total: number) {
  const minutos = Math.floor(total / 60);
  return `${minutos}:${String(total % 60).padStart(2, "0")}`;
}

function pararTrilhas(stream: MediaStream | null) {
  stream?.getTracks().forEach((trilha) => trilha.stop());
}

import { iniciarMedidorDeVolume } from "@/components/useNivelDeAudio";
import { MENSAGEM_SEM_FALA, ehSilencio } from "@/lib/transcricao";

export default function RegistrarAgoraModal({ aparelho = "computador", visitas, visitaInicialId, itemInicialId, onSalvar, onFechar, onIrVisitas }: Props) {
  const [visitaId, setVisitaId] = useState(visitaInicialId);
  const [trocando, setTrocando] = useState(false);
  const [itemId, setItemId] = useState(itemInicialId);
  const doAparelho = `do ${aparelho}`;
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState("");
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [avisoCamera, setAvisoCamera] = useState("");
  const [gravando, setGravando] = useState(false);
  const [avisoAudio, setAvisoAudio] = useState("");
  const [avisoArquivo, setAvisoArquivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [origem, setOrigem] = useState<"camera" | "arquivo" | "audio">("camera");
  const [segundos, setSegundos] = useState(0);
  const arquivoInputRef = useRef<HTMLInputElement | null>(null);
  const relogioRef = useRef<number | null>(null);
  const [bytesGravados, setBytesGravados] = useState(0);
  const [niveis, setNiveis] = useState<number[]>(() => Array.from({ length: 14 }, () => 0));
  const audioCtxRef = useRef<AudioContext | null>(null);
  const medidorRef = useRef<number | null>(null);
  const volumeRef = useRef<{ pico: () => number; parar: () => void } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamCameraRef = useRef<MediaStream | null>(null);
  const streamAudioRef = useRef<MediaStream | null>(null);
  const gravadorRef = useRef<MediaRecorder | null>(null);
  const trechosRef = useRef<Blob[]>([]);
  const previaRef = useRef("");

  const visita = visitas.find((registro) => registro.id === visitaId);
  const semVisita = visitas.length === 0 || !visita;

  const liberarMidia = useCallback(() => {
    pararTrilhas(streamCameraRef.current);
    streamCameraRef.current = null;
    pararTrilhas(streamAudioRef.current);
    streamAudioRef.current = null;
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
    if (relogioRef.current) window.clearInterval(relogioRef.current);
    relogioRef.current = null;
    if (medidorRef.current) window.clearInterval(medidorRef.current);
    medidorRef.current = null;
    void audioCtxRef.current?.close().catch(() => undefined);
    audioCtxRef.current = null;
    volumeRef.current?.parar();
    volumeRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const trocarPrevia = useCallback((url: string) => {
    if (previaRef.current) URL.revokeObjectURL(previaRef.current);
    previaRef.current = url;
    setPrevia(url);
  }, []);

  // Fechar por qualquer caminho (Cancelar, Salvar, Esc, desmontar) para a câmera e o microfone.
  useEffect(() => {
    return () => {
      liberarMidia();
      if (previaRef.current) URL.revokeObjectURL(previaRef.current);
    };
  }, [liberarMidia]);

  // Liga a prévia só depois que o <video> existe (evita corrida entre o estado e a renderização).
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamCameraRef.current;
    if (!cameraAtiva || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
  }, [cameraAtiva]);

  function fechar() {
    liberarMidia();
    onFechar();
  }

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function abrirCamera() {
    setAvisoCamera("");
    setErro("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setAvisoCamera("Este navegador não permite usar a câmera. Use “Enviar arquivo”.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamCameraRef.current = stream;
      setArquivo(null);
      trocarPrevia("");
      setCameraAtiva(true);
    } catch (falha) {
      const negada = falha instanceof DOMException && (falha.name === "NotAllowedError" || falha.name === "SecurityError");
      setAvisoCamera(
        negada
          ? "A permissão da câmera foi negada. Libere no navegador ou use “Enviar arquivo”."
          : "Não encontramos uma câmera neste aparelho. Use “Enviar arquivo”."
      );
    }
  }

  function capturar() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setAvisoCamera("A câmera ainda está iniciando. Tente de novo em instantes.");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        pararTrilhas(streamCameraRef.current);
        streamCameraRef.current = null;
        setCameraAtiva(false);
        if (!blob) {
          setAvisoCamera("Não foi possível capturar a foto. Tente de novo.");
          return;
        }
        const foto = new File([blob], `foto-${Date.now()}.jpg`, { type: "image/jpeg" });
        setOrigem("camera");
        setArquivo(foto);
        trocarPrevia(URL.createObjectURL(foto));
      },
      "image/jpeg",
      0.9
    );
  }

  function cancelarCamera() {
    pararTrilhas(streamCameraRef.current);
    streamCameraRef.current = null;
    setCameraAtiva(false);
  }

  function escolherArquivo(lista: FileList | null) {
    const escolhido = lista?.[0];
    if (!escolhido) return;
    setErro("");
    setAvisoArquivo("");
    cancelarCamera();
    if (!escolhido.type.startsWith("image/") && !escolhido.type.startsWith("audio/")) {
      setAvisoArquivo("Escolha uma foto ou um áudio. Outros tipos de arquivo não são aceitos nas evidências.");
      return;
    }
    if (escolhido.type.startsWith("audio/") && escolhido.size > LIMITE_AUDIO) {
      setAvisoArquivo("O áudio está muito grande. Use um arquivo de até 3 MB.");
      return;
    }
    setOrigem("arquivo");
    setArquivo(escolhido);
    trocarPrevia(URL.createObjectURL(escolhido));
  }

  async function alternarGravacao() {
    setAvisoAudio("");
    setErro("");
    if (gravando && gravadorRef.current) {
      gravadorRef.current.stop();
      return;
    }
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setAvisoAudio("Este navegador não grava áudio. Use “Enviar arquivo”.");
      return;
    }
    try {
      cancelarCamera();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamAudioRef.current = stream;
      volumeRef.current = iniciarMedidorDeVolume(stream);
      const gravador = new MediaRecorder(stream);
      trechosRef.current = [];
      setBytesGravados(0);
      gravador.ondataavailable = (evento) => {
        if (evento.data.size > 0) {
          trechosRef.current.push(evento.data);
          const total = trechosRef.current.reduce((soma, trecho) => soma + trecho.size, 0);
          setBytesGravados(total);
          // Para sozinho perto do limite de 3 MB, sem estourar o arquivo.
          if (total >= LIMITE_AUDIO * 0.97 && gravador.state === "recording") gravador.stop();
        }
      };
      gravador.onstop = () => {
        pararTrilhas(streamAudioRef.current);
        streamAudioRef.current = null;
        if (relogioRef.current) window.clearInterval(relogioRef.current);
        relogioRef.current = null;
        if (medidorRef.current) window.clearInterval(medidorRef.current);
        medidorRef.current = null;
        void audioCtxRef.current?.close().catch(() => undefined);
        audioCtxRef.current = null;
        setNiveis(Array.from({ length: 14 }, () => 0));
        setGravando(false);
        const picoDoVolume = volumeRef.current?.pico() ?? 1;
        volumeRef.current?.parar();
        volumeRef.current = null;
        const tipo = gravador.mimeType || "audio/webm";
        const blob = new Blob(trechosRef.current, { type: tipo });
        if (blob.size === 0) return;
        // Gravação sem som não vira registro.
        if (ehSilencio(picoDoVolume)) {
          setAvisoAudio(MENSAGEM_SEM_FALA);
          return;
        }
        if (blob.size > LIMITE_AUDIO) {
          setAvisoAudio("A gravação passou de 3 MB. Grave um trecho mais curto.");
          return;
        }
        const extensao = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm";
        const audio = new File([blob], `audio-${Date.now()}.${extensao}`, { type: tipo });
        setOrigem("audio");
        setArquivo(audio);
        trocarPrevia(URL.createObjectURL(audio));
      };
      gravadorRef.current = gravador;
      setArquivo(null);
      trocarPrevia("");
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
            const passo = Math.max(1, Math.floor(dados.length / 14));
            setNiveis(Array.from({ length: 14 }, (_, i) => Math.min(1, (dados[i * passo] || 0) / 200)));
          }, 80);
        }
      } catch {
        // sem medidor: a gravação continua normalmente
      }
      gravador.start(500);
      setSegundos(0);
      if (relogioRef.current) window.clearInterval(relogioRef.current);
      relogioRef.current = window.setInterval(() => setSegundos((atual) => atual + 1), 1000);
      setGravando(true);
    } catch (falha) {
      const negada = falha instanceof DOMException && (falha.name === "NotAllowedError" || falha.name === "SecurityError");
      setAvisoAudio(negada ? "A permissão do microfone foi negada. Libere no navegador ou use “Enviar arquivo”." : "Não encontramos um microfone neste aparelho.");
    }
  }

  async function salvar() {
    if (!arquivo || !visita || salvando) return;
    setSalvando(true);
    liberarMidia();
    const item = visita.itens.find((registro) => registro.id === itemId) || null;
    try {
      await onSalvar({
        visitaId: visita.id,
        arquivo,
        tipo: arquivo.type.startsWith("audio/") ? "Áudio" : "Foto",
        origem,
        descricao,
        item: item ? { id: item.id, ambiente: item.ambiente } : null,
      });
      onFechar();
    } catch {
      setErro("Não foi possível salvar agora. Tente novamente.");
      setSalvando(false);
    }
  }

  const tipoArquivo = arquivo?.type.startsWith("audio/") ? "audio" : arquivo ? "foto" : null;
  const camposDesabilitados = semVisita;

  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={fechar} />
      <section className="pc-modal pc-reg" role="dialog" aria-modal="true" aria-label="Registrar agora">
        <h2 className="pc-modal-title">Registrar agora</h2>

        {semVisita ? (
          <div className="pc-reg-save is-empty">
            <span>Inicie uma visita para registrar fotos, arquivos e áudios.</span>
            <button type="button" className="ui-btn ui-btn--primary ui-btn--small" onClick={onIrVisitas}>
              Ir para Visitas
            </button>
          </div>
        ) : (
          <div className="pc-reg-save">
            <span>
              <span className="ui-eyebrow">Salvar em:</span> {visita.rotulo}
            </span>
            {visitas.length > 1 && (
              <button type="button" className="pc-link-btn" onClick={() => setTrocando((aberto) => !aberto)}>
                {trocando ? "Fechar" : "Trocar"}
              </button>
            )}
          </div>
        )}
        {trocando && (
          <select
            className="ui-input"
            value={visitaId}
            aria-label="Visita para salvar"
            onChange={(evento) => {
              setVisitaId(evento.target.value);
              setItemId("");
              setTrocando(false);
            }}
          >
            {visitas.map((registro) => (
              <option key={registro.id} value={registro.id}>
                {registro.rotulo}
              </option>
            ))}
          </select>
        )}

        <div className="pc-reg-cards">
          <div
            className={`pc-reg-card pc-reg-card--foto${camposDesabilitados ? " is-off" : ""}`}
            role="button"
            tabIndex={camposDesabilitados ? -1 : 0}
            aria-disabled={camposDesabilitados}
            aria-label={`Tirar foto, usa a câmera ${doAparelho}`}
            onClick={() => {
              if (!camposDesabilitados && !cameraAtiva) void abrirCamera();
            }}
            onKeyDown={(evento) => {
              if ((evento.key === "Enter" || evento.key === " ") && evento.target === evento.currentTarget && !camposDesabilitados && !cameraAtiva) {
                evento.preventDefault();
                void abrirCamera();
              }
            }}
          >
            <span className="pc-reg-tile"><NavIcon name="registrar" size={28} strokeWidth={1.9} /></span>
            <span className="pc-reg-card-title">Tirar foto</span>
            <span className="pc-reg-card-sub">
              {cameraAtiva ? "Câmera ligada" : origem === "camera" && arquivo ? "Foto capturada" : `Usa a câmera ${doAparelho}`}
            </span>
            {cameraAtiva && (
              <>
                <video ref={videoRef} className="pc-reg-video" muted playsInline aria-label="Prévia da câmera" />
                <span className="pc-reg-row">
                  <button type="button" className="ui-btn ui-btn--primary ui-btn--small" onClick={(evento) => { evento.stopPropagation(); capturar(); }}>
                    Capturar
                  </button>
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={(evento) => { evento.stopPropagation(); cancelarCamera(); }}>
                    Cancelar
                  </button>
                </span>
              </>
            )}
            {avisoCamera && (
              <p className="pc-reg-aviso" role="alert">
                {avisoCamera}
              </p>
            )}
          </div>

          <div
            className={`pc-reg-card pc-reg-card--arq${camposDesabilitados ? " is-off" : ""}`}
            role="button"
            tabIndex={camposDesabilitados ? -1 : 0}
            aria-disabled={camposDesabilitados}
            aria-label={`Enviar arquivo, foto ou áudio ${doAparelho}`}
            onClick={() => {
              if (!camposDesabilitados) arquivoInputRef.current?.click();
            }}
            onKeyDown={(evento) => {
              if ((evento.key === "Enter" || evento.key === " ") && evento.target === evento.currentTarget && !camposDesabilitados) {
                evento.preventDefault();
                arquivoInputRef.current?.click();
              }
            }}
          >
            <span className="pc-reg-tile">
              <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 16V4M7 9l5-5 5 5M5 20h14" />
              </svg>
            </span>
            <span className="pc-reg-card-title">Enviar arquivo</span>
            <span className="pc-reg-card-sub">
              {origem === "arquivo" && arquivo ? arquivo.name : `Foto ou áudio ${doAparelho} (só foto e áudio)`}
            </span>
            {avisoArquivo && (
              <p className="pc-reg-aviso" role="alert">
                {avisoArquivo}
              </p>
            )}
            <input
              ref={arquivoInputRef}
              type="file"
              accept="image/*,audio/*"
              className="sr-only"
              tabIndex={-1}
              disabled={camposDesabilitados}
              onClick={(evento) => evento.stopPropagation()}
              onChange={(evento) => {
                escolherArquivo(evento.target.files);
                evento.currentTarget.value = "";
              }}
            />
          </div>

          <div
            className={`pc-reg-card pc-reg-card--audio${camposDesabilitados ? " is-off" : ""}`}
            role="button"
            tabIndex={camposDesabilitados ? -1 : 0}
            aria-disabled={camposDesabilitados}
            aria-label={gravando ? "Parar gravação" : "Gravar áudio, fale o que observou"}
            onClick={() => {
              if (!camposDesabilitados && !gravando) void alternarGravacao();
            }}
            onKeyDown={(evento) => {
              if ((evento.key === "Enter" || evento.key === " ") && evento.target === evento.currentTarget && !camposDesabilitados && !gravando) {
                evento.preventDefault();
                void alternarGravacao();
              }
            }}
          >
            <span className="pc-reg-tile"><NavIcon name="microfone" size={28} strokeWidth={1.9} /></span>
            <span className="pc-reg-card-title">{gravando ? "Gravando..." : "Gravar áudio"}</span>
            <span className="pc-reg-card-sub">
              {gravando
                ? `${formatarTempo(segundos)} · restam ${restanteDoLimite(bytesGravados, segundos)}`
                : origem === "audio" && arquivo
                  ? `Áudio gravado · ${formatarTempo(segundos)}`
                  : "Fale o que observou"}
            </span>
            {gravando && (
              <>
                <span className="pc-reg-meter" role="img" aria-label="Nível do som captado">
                  {niveis.map((nivel, indice) => (
                    <i key={indice} style={{ height: `${Math.max(8, Math.round(nivel * 100))}%` }} />
                  ))}
                </span>
                <button
                  type="button"
                  className="ui-btn ui-btn--primary pc-reg-stop"
                  onClick={(evento) => {
                    evento.stopPropagation();
                    void alternarGravacao();
                  }}
                >
                  Parar
                </button>
              </>
            )}
            {!gravando && origem === "audio" && arquivo && (
              <button
                type="button"
                className="ui-btn ui-btn--secondary ui-btn--small"
                onClick={(evento) => {
                  evento.stopPropagation();
                  void alternarGravacao();
                }}
              >
                Regravar
              </button>
            )}
            {avisoAudio && (
              <p className="pc-reg-aviso" role="alert">
                {avisoAudio}
              </p>
            )}
          </div>
        </div>

        {previa && (
          <div className="pc-reg-preview">
            {tipoArquivo === "audio" ? (
              <>
                <span className="ui-row-sub">Ouvir:</span> <audio controls src={previa} />
              </>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previa} alt="Prévia da foto" />
            )}
            <span className="ui-row-sub">{arquivo?.name}</span>
          </div>
        )}

        <label className="pc-plan-block">
          <span className="ui-eyebrow">Vincular ao item do checklist (opcional)</span>
          <select className="ui-input" value={itemId} disabled={camposDesabilitados} onChange={(evento) => setItemId(evento.target.value)}>
            <option value="">Sem vínculo, só registrar</option>
            {(visita?.itens || []).map((item) => (
              <option key={item.id} value={item.id}>
                {item.ambiente} · {item.rotulo}
              </option>
            ))}
          </select>
        </label>

        <label className="pc-plan-block">
          <span className="ui-eyebrow">Anotação (opcional)</span>
          <input className="ui-input" value={descricao} disabled={camposDesabilitados} onChange={(evento) => setDescricao(evento.target.value)} placeholder="Ex.: embalagem avariada no recebimento" aria-label="Anotação sobre este registro" />
        </label>

        <p className="ui-note">Antes de usar a IA, evite enquadrar rostos, crachás e documentos pessoais.</p>
        {erro && <span className="ui-field-error" role="alert">{erro}</span>}

        <div className="pc-modal-foot">
          <span className="ui-row-sub">{gravando ? "Pare a gravação para salvar." : arquivo ? "Pronto para salvar." : "Tire uma foto, envie um arquivo ou grave um áudio para salvar."}</span>
          <div className="ui-footer-actions">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={fechar}>
              Cancelar
            </button>
            <button type="button" className="ui-btn ui-btn--save" disabled={!arquivo || semVisita || salvando || gravando} onClick={salvar}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
