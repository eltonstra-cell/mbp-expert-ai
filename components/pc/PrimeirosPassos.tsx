"use client";

import { useEffect, useState } from "react";

export type PassoDoGuia = { chave: string; titulo: string; feito: boolean; onAbrir: () => void };

type Props = {
  passos: PassoDoGuia[];
  /** Endereço do vídeo de apresentação (arquivo em public/). Sem o arquivo, a janela explica que ainda não foi publicado. */
  video?: string;
};

export const VIDEO_PRIMEIROS_PASSOS = "/videos/primeiros-passos.mp4";

// Guia de uso em Ajuda e guias: a ordem (Perfil, Empresa, Ambientes, Equipamentos, Fluxos, Visita, Relatório), o que já está feito e o vídeo.
export default function PrimeirosPassos({ passos, video = VIDEO_PRIMEIROS_PASSOS }: Props) {
  const [videoAberto, setVideoAberto] = useState(false);
  const [videoFalhou, setVideoFalhou] = useState(false);
  const feitos = passos.filter((passo) => passo.feito).length;

  useEffect(() => {
    if (!videoAberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setVideoAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [videoAberto]);

  return (
    <section className="pp" aria-label="Guia de primeiros passos">
      <div className="pp-topo">
        <div className="pp-textos">
          <h2 className="pp-titulo">Primeiros passos</h2>
          <p className="ui-row-sub">A ordem para começar a usar o Ponto Certo · {feitos} de {passos.length} feitos</p>
        </div>
        <button type="button" className="ui-btn ui-btn--primary" onClick={() => { setVideoFalhou(false); setVideoAberto(true); }}>
          Ver o vídeo
        </button>
      </div>
      <ol className="pp-lista">
        {passos.map((passo, indice) => (
          <li key={passo.chave} className="pp-linha">
            <span className={`pp-num${passo.feito ? " is-feito" : ""}`} aria-hidden="true">{passo.feito ? "✓" : indice + 1}</span>
            <button type="button" className="pp-passo" onClick={passo.onAbrir}>
              {passo.titulo}
            </button>
            <span className={`pp-estado${passo.feito ? " is-feito" : ""}`}>{passo.feito ? "Feito" : "Pendente"}</span>
          </li>
        ))}
      </ol>
      {videoAberto && (
        <div className="pc-modal-layer" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setVideoAberto(false)} />
          <section className="pc-modal pp-video" role="dialog" aria-modal="true" aria-label="Vídeo dos primeiros passos">
            <h2 className="pc-modal-title">Primeiros passos</h2>
            {videoFalhou ? (
              <p className="ui-row-sub" role="status">O vídeo ainda não foi publicado. Siga a ordem dos passos da lista: cada um abre a tela certa.</p>
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
