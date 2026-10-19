"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NavIcon } from "@/components/NavIcons";
import { LIMITE_AUDIO, formatarTempo, restanteDoLimite, useCapturaAudio, useCapturaCamera } from "@/components/useCapturaMidia";

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
  /** Abre já com a câmera ligada (usado pelo "Tirar foto" de Evidências). */
  iniciarCamera?: boolean;
};

export default function RegistrarAgoraModal({ aparelho = "computador", visitas, visitaInicialId, itemInicialId, onSalvar, onFechar, onIrVisitas, iniciarCamera = false }: Props) {
  const [visitaId, setVisitaId] = useState(visitaInicialId);
  const [trocando, setTrocando] = useState(false);
  const [itemId, setItemId] = useState(itemInicialId);
  const doAparelho = `do ${aparelho}`;
  const [descricao, setDescricao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState("");
  const [avisoArquivo, setAvisoArquivo] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [origem, setOrigem] = useState<"camera" | "arquivo" | "audio">("camera");
  const arquivoInputRef = useRef<HTMLInputElement | null>(null);
  const previaRef = useRef("");

  const visita = visitas.find((registro) => registro.id === visitaId);
  const semVisita = visitas.length === 0 || !visita;

  const trocarPrevia = useCallback((url: string) => {
    if (previaRef.current) URL.revokeObjectURL(previaRef.current);
    previaRef.current = url;
    setPrevia(url);
  }, []);

  const camera = useCapturaCamera({
    aoCapturar: (foto) => {
      setOrigem("camera");
      setArquivo(foto);
      trocarPrevia(URL.createObjectURL(foto));
    },
  });
  const audio = useCapturaAudio({
    aoGravar: (gravado) => {
      setOrigem("audio");
      setArquivo(gravado);
      trocarPrevia(URL.createObjectURL(gravado));
    },
  });
  const { ativa: cameraAtiva, aviso: avisoCamera, videoRef, cancelar: cancelarCamera } = camera;
  const { gravando, aviso: avisoAudio, segundos, bytes: bytesGravados, niveis } = audio;
  const { liberar: liberarCamera } = camera;
  const { liberar: liberarAudio } = audio;

  const liberarMidia = useCallback(() => {
    liberarCamera();
    liberarAudio();
  }, [liberarCamera, liberarAudio]);

  // Fechar por qualquer caminho (Cancelar, Salvar, Esc, desmontar) para a câmera e o microfone.
  useEffect(() => {
    return () => {
      if (previaRef.current) URL.revokeObjectURL(previaRef.current);
    };
  }, []);

  function fechar() {
    liberarMidia();
    onFechar();
  }

  useEffect(() => {
    if (iniciarCamera) void abrirCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") fechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function abrirCamera() {
    setErro("");
    if (await camera.abrir()) {
      setArquivo(null);
      trocarPrevia("");
    }
  }

  function capturar() {
    camera.capturar();
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
    setErro("");
    if (gravando) {
      audio.parar();
      return;
    }
    cancelarCamera();
    if (await audio.iniciar()) {
      setArquivo(null);
      trocarPrevia("");
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
