"use client";

import { useState } from "react";

type Props = {
  texto: string;
  onUsar: (texto: string) => void;
  onDescartar: () => void;
  /** Quando existe, o botão da esquerda vira "Ditar de novo" (grava outra vez). */
  onDitarDeNovo?: () => void;
};

// O texto ouvido nunca entra sozinho no campo: a pessoa revisa (e pode corrigir) antes.
export default function RevisaoTranscricao({ texto, onUsar, onDescartar, onDitarDeNovo }: Props) {
  const [editado, setEditado] = useState(texto);
  const vazio = !editado.trim();
  return (
    <div className="voz-revisao-camada" role="dialog" aria-modal="true" aria-label="Revisar o que você disse">
      <button type="button" className="voz-revisao-fundo" aria-label="Descartar" onClick={onDescartar} />
      <div className="voz-revisao">
        <h2 className="ui-card-title">Revisar o que você disse</h2>
        <p className="ui-row-sub">Toque no texto para corrigir antes de usar. Nada foi colocado no campo ainda.</p>
        <div className="voz-onda" aria-hidden="true">
          {Array.from({ length: 16 }, (_, indice) => (
            <i key={indice} style={{ animationDelay: `${(indice % 8) * 90}ms` }} />
          ))}
        </div>
        <textarea className={`ui-input${vazio ? " is-invalid" : ""}`} rows={4} value={editado} aria-label="Texto ouvido" onChange={(evento) => setEditado(evento.target.value)} />
        {vazio && <span className="ui-field-error">O texto não pode ficar vazio.</span>}
        <div className="voz-revisao-acoes">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onDitarDeNovo || onDescartar}>
            {onDitarDeNovo ? "Ditar de novo" : "Descartar"}
          </button>
          <button type="button" className="ui-btn ui-btn--save" disabled={vazio} onClick={() => onUsar(editado.trim())}>
            Usar texto
          </button>
        </div>
      </div>
    </div>
  );
}
