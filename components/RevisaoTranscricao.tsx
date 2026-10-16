"use client";

import { useState } from "react";

type Props = {
  texto: string;
  onUsar: (texto: string) => void;
  onDescartar: () => void;
};

// O texto ouvido nunca entra sozinho no campo: a pessoa revisa (e pode corrigir) antes.
export default function RevisaoTranscricao({ texto, onUsar, onDescartar }: Props) {
  const [editado, setEditado] = useState(texto);
  const vazio = !editado.trim();
  return (
    <div className="voz-revisao-camada" role="dialog" aria-modal="true" aria-label="Revisar o texto ouvido">
      <button type="button" className="voz-revisao-fundo" aria-label="Descartar" onClick={onDescartar} />
      <div className="voz-revisao">
        <h2 className="ui-card-title">Revise o texto ouvido</h2>
        <p className="ui-row-sub">Confira antes de usar. Nada foi colocado no campo ainda.</p>
        <textarea className={`ui-input${vazio ? " is-invalid" : ""}`} rows={4} value={editado} aria-label="Texto ouvido" onChange={(evento) => setEditado(evento.target.value)} />
        {vazio && <span className="ui-field-error">O texto não pode ficar vazio.</span>}
        <div className="voz-revisao-acoes">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onDescartar}>
            Descartar
          </button>
          <button type="button" className="ui-btn ui-btn--save" disabled={vazio} onClick={() => onUsar(editado.trim())}>
            Usar texto
          </button>
        </div>
      </div>
    </div>
  );
}
