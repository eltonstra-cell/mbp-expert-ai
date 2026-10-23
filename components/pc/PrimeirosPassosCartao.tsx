"use client";

import { useEffect, useState } from "react";

export type PassoDosPrimeiros = { chave: string; titulo: string; onAbrir: () => void };

type Props = {
  passos: PassoDosPrimeiros[];
  onDispensar: () => void;
  /** Endereço do vídeo de apresentação (arquivo em public/). Sem o arquivo, a janela explica que ainda não foi publicado. */
  video?: string;
};

export const VIDEO_DO_CARTAO = "/videos/primeiros-passos.mp4";

// Cartão do Início com a ordem de uso do app (Perfil, Empresa, Ambientes, Equipamentos, Fluxos, Visita, Relatório) e o vídeo.
export default function PrimeirosPassosCartao({ passos, onDispensar, video = VIDEO_DO_CARTAO }: Props) {
  const [videoAberto, setVideoAberto] = useState(false);
  const [videoFalhou, setVideoFalhou] = useState(false);

  useEffect(() => {
    if (!videoAberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setVideoAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [videoAberto]);

  return (
    <section className="ui-card ppc" aria-label="Primeiros passos">
      <div className="ppc-topo">
        <div className="ppc-textos">
          <div className="ui-eyebrow">Primeiros passos</div>
          <div className="ui-row-sub">A ordem para começar a usar o Ponto Certo.</div>
        </div>
        <div className="ppc-acoes">
          <button type="button" className="ui-btn ui-btn--primary" onClick={() => { setVideoFalhou(false); setVideoAberto(true); }}>
            Ver o vídeo
          </button>
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onDispensar}>
            Dispensar
          </button>
        </div>
      </div>
      <ol className="ppc-lista">
        {passos.map((passo, indice) => (
          <li key={passo.chave}>
            <button type="button" className="ppc-passo" onClick={passo.onAbrir}>
              <span className="ppc-num" aria-hidden="true">{indice + 1}</span>
              <span className="ppc-titulo">{passo.titulo}</span>
            </button>
          </li>
        ))}
      </ol>
      {videoAberto && (
        <div className="pc-modal-layer" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setVideoAberto(false)} />
          <section className="pc-modal pp-video" role="dialog" aria-modal="true" aria-label="Vídeo dos primeiros passos">
            <h2 className="pc-modal-title">Primeiros passos</h2>
            {videoFalhou ? (
              <p className="ui-row-sub" role="status">O vídeo ainda não foi publicado. Siga a ordem dos passos do cartão: cada um abre a tela certa.</p>
            ) : (
              <video className="pp-player" src={video} controls autoPlay playsInline onError={() => setVideoFalhou(true)} />
            )}
            <div className="pc-modal-foot">
              <span />
              <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setVideoAberto(false)}>
                Fechar
              </button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
