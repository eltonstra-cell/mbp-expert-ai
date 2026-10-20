"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

type Props = {
  url: string;
  descricao: string;
  onFechar: () => void;
};

// Foto em tela cheia: fecha no botão, no Esc ou tocando fora; sem rolagem.
export default function FotoAmpliada({ url, descricao, onFechar }: Props) {
  useEffect(() => {
    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTecla);
    return () => window.removeEventListener("keydown", aoTecla);
  }, [onFechar]);

  return createPortal(
    <div className="foto-amp-fundo" role="dialog" aria-label="Foto ampliada" onClick={onFechar}>
      <div className="foto-amp-caixa" onClick={(evento) => evento.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="foto-amp-img" src={url} alt={descricao} />
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--small foto-amp-fechar" onClick={onFechar} autoFocus>
          Fechar
        </button>
      </div>
    </div>,
    document.body
  );
}
