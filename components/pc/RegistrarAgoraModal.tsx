"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VisitaParaRegistro = {
  id: string;
  rotulo: string;
  itens: { id: string; rotulo: string; ambiente: string }[];
};

type Props = {
  visitas: VisitaParaRegistro[];
  visitaInicialId: string;
  itemInicialId: string;
  onSalvar: (dados: {
    visitaId: string;
    arquivo: File;
    tipo: "Foto" | "Áudio";
    descricao: string;
    item: { id: string; ambiente: string } | null;
  }) => Promise<void> | void;
  onFechar: () => void;
  onIrVisitas: () => void;
};

const LIMITE_AUDIO = 3 * 1024 * 1024;

function pararTrilhas(stream: MediaStream | null) {
  stream?.getTracks().forEach((trilha) => trilha.stop());
}

export default function RegistrarAgoraModal({ visitas, visitaInicialId, itemInicialId, onSalvar, onFechar, onIrVisitas }: Props) {
  const [visitaId, setVisitaId] = useState(visitaInicialId);
  const [trocando, setTrocando] = useState(false);
  const [itemId, setItemId] = useState(itemInicialId);
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState("");
  const [cameraAtiva, setCameraAtiva] = useState(false);
  const [avisoCamera, setAvisoCamera] = useState("");
  const [gravando, setGravando] = useState(false);
  const [avisoAudio, setAvisoAudio] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

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
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play().catch(() => undefined);
        }
      });
    } catch (falha) {
      const negada = falha instanceof DOMException && (falha.name === "NotAllowedError" || falha.name === "SecurityError");
      setAvisoCamera(
        negada
          ? "A permissão da câmera foi negada. Libere no navegador ou use “Enviar arquivo”."
          : "Não encontramos uma câmera neste computador. Use “Enviar arquivo”."
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
    cancelarCamera();
    if (!escolhido.type.startsWith("image/") && !escolhido.type.startsWith("audio/")) {
      setErro("Escolha uma foto ou um áudio. Outros tipos de arquivo não são aceitos nas evidências.");
      return;
    }
    if (escolhido.type.startsWith("audio/") && escolhido.size > LIMITE_AUDIO) {
      setErro("O áudio está muito grande. Use um arquivo de até 3 MB.");
      return;
    }
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
      const gravador = new MediaRecorder(stream);
      trechosRef.current = [];
      gravador.ondataavailable = (evento) => {
        if (evento.data.size > 0) trechosRef.current.push(evento.data);
      };
      gravador.onstop = () => {
        pararTrilhas(streamAudioRef.current);
        streamAudioRef.current = null;
        setGravando(false);
        const tipo = gravador.mimeType || "audio/webm";
        const blob = new Blob(trechosRef.current, { type: tipo });
        if (blob.size === 0) return;
        if (blob.size > LIMITE_AUDIO) {
          setAvisoAudio("A gravação passou de 3 MB. Grave um trecho mais curto.");
          return;
        }
        const extensao = tipo.includes("mp4") ? "m4a" : tipo.includes("ogg") ? "ogg" : "webm";
        const audio = new File([blob], `audio-${Date.now()}.${extensao}`, { type: tipo });
        setArquivo(audio);
        trocarPrevia(URL.createObjectURL(audio));
      };
      gravadorRef.current = gravador;
      setArquivo(null);
      trocarPrevia("");
      gravador.start();
      setGravando(true);
    } catch (falha) {
      const negada = falha instanceof DOMException && (falha.name === "NotAllowedError" || falha.name === "SecurityError");
      setAvisoAudio(negada ? "A permissão do microfone foi negada. Libere no navegador ou use “Enviar arquivo”." : "Não encontramos um microfone neste computador.");
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
          <div className={`pc-reg-card pc-reg-card--foto${camposDesabilitados ? " is-off" : ""}`}>
            <span className="pc-reg-card-title">Tirar foto</span>
            {cameraAtiva ? (
              <>
                <video ref={videoRef} className="pc-reg-video" muted playsInline aria-label="Prévia da câmera" />
                <div className="pc-reg-row">
                  <button type="button" className="ui-btn ui-btn--primary ui-btn--small" onClick={capturar}>
                    Capturar
                  </button>
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={cancelarCamera}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="ui-btn ui-btn--secondary" disabled={camposDesabilitados} onClick={abrirCamera}>
                {tipoArquivo === "foto" ? "Tirar outra" : "Abrir câmera"}
              </button>
            )}
            {avisoCamera && (
              <p className="pc-reg-aviso" role="alert">
                {avisoCamera}
              </p>
            )}
          </div>

          <div className={`pc-reg-card pc-reg-card--arq${camposDesabilitados ? " is-off" : ""}`}>
            <span className="pc-reg-card-title">Enviar arquivo</span>
            <label className={`ui-btn ui-btn--secondary${camposDesabilitados ? " is-disabled" : ""}`}>
              Escolher foto ou áudio
              <input type="file" accept="image/*,audio/*" className="sr-only" disabled={camposDesabilitados} onChange={(evento) => { escolherArquivo(evento.target.files); evento.currentTarget.value = ""; }} />
            </label>
          </div>

          <div className={`pc-reg-card pc-reg-card--audio${camposDesabilitados ? " is-off" : ""}`}>
            <span className="pc-reg-card-title">Gravar áudio</span>
            <button type="button" className="ui-btn ui-btn--secondary" disabled={camposDesabilitados} onClick={alternarGravacao}>
              {gravando ? "Parar gravação" : tipoArquivo === "audio" ? "Gravar de novo" : "Gravar"}
            </button>
            {gravando && <span className="ui-row-sub">Gravando... toque em parar para terminar.</span>}
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
              <audio controls src={previa} />
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
          <span className="ui-eyebrow">Descrição (opcional)</span>
          <input className="ui-input" value={descricao} disabled={camposDesabilitados} onChange={(evento) => setDescricao(evento.target.value)} placeholder="Ex.: embalagem avariada no recebimento" />
        </label>

        <p className="ui-note">Antes de usar a IA, evite enquadrar rostos, crachás e documentos pessoais.</p>
        {erro && <span className="ui-field-error" role="alert">{erro}</span>}

        <div className="pc-modal-foot">
          <span className="ui-row-sub">{arquivo ? "Pronto para salvar." : "Tire uma foto, envie um arquivo ou grave um áudio para salvar."}</span>
          <div className="ui-footer-actions">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={fechar}>
              Cancelar
            </button>
            <button type="button" className="ui-btn ui-btn--save" disabled={!arquivo || semVisita || salvando} onClick={salvar}>
              {salvando ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
