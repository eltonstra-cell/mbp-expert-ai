"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  titulo: string;
  explicacao: string;
  rotuloDoBotao: string;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
};

// Arquivar e inativar um POP exigem o motivo (quem e quando ficam gravados junto). Sem motivo o botão não liga.
export default function MotivoDaMudanca({ titulo, explicacao, rotuloDoBotao, onConfirmar, onCancelar }: Props) {
  const [motivo, setMotivo] = useState("");
  const campo = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    campo.current?.focus();
    const fechar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", fechar);
    return () => window.removeEventListener("keydown", fechar);
  }, [onCancelar]);
  const pronto = motivo.trim().length >= 3;
  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={onCancelar} />
      <section className="pc-modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <h2 className="pc-modal-title">{titulo}</h2>
        <p className="ui-row-sub">{explicacao}</p>
        <label className="pc-field">
          <span className="ui-eyebrow">Motivo (obrigatório)</span>
          <textarea ref={campo} className="ui-input" rows={3} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Escreva por que" />
        </label>
        <div className="pc-modal-actions">
          <button type="button" className="rz-btn rz-btn--sec" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="rz-btn rz-btn--pri" disabled={!pronto} onClick={() => onConfirmar(motivo.trim())}>
            {rotuloDoBotao}
          </button>
        </div>
      </section>
    </div>
  );
}
