"use client";

import { useEffect, useRef, useState } from "react";
import { PALAVRA_DE_CONFIRMACAO, confirmacaoDeExclusaoValida } from "@/lib/userManagement";

type Props = {
  titulo: string;
  nome: string;
  explicacao: string;
  onConfirmar: () => void;
  onCancelar: () => void;
};

// Confirmação própria do app (no lugar da caixa nativa do navegador): o botão vermelho só libera ao digitar EXCLUIR.
export default function ConfirmarExclusaoModal({ titulo, nome, explicacao, onConfirmar, onCancelar }: Props) {
  const [texto, setTexto] = useState("");
  const [tocou, setTocou] = useState(false);
  const campoRef = useRef<HTMLInputElement | null>(null);
  const valido = confirmacaoDeExclusaoValida(texto);
  const erro = tocou && texto.length > 0 && !valido ? `Digite ${PALAVRA_DE_CONFIRMACAO}, em maiúsculas, para liberar o botão.` : "";

  useEffect(() => {
    campoRef.current?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onCancelar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onCancelar]);

  return (
    <div className="voz-revisao-camada" role="dialog" aria-modal="true" aria-label={titulo}>
      <button type="button" className="voz-revisao-fundo" aria-label="Cancelar" onClick={onCancelar} />
      <div className="voz-revisao">
        <h2 className="ui-card-title">{titulo}</h2>
        <p className="ui-row-sub">
          <strong className="excluir-nome">{nome}</strong>
        </p>
        <p className="ui-row-sub">{explicacao}</p>
        <label className="pc-plan-block">
          <span className="ui-eyebrow">Para confirmar, digite {PALAVRA_DE_CONFIRMACAO}</span>
          <input
            ref={campoRef}
            className={`ui-input${erro ? " is-invalid" : ""}`}
            value={texto}
            autoComplete="off"
            aria-invalid={Boolean(erro)}
            onChange={(evento) => {
              setTexto(evento.target.value);
              setTocou(true);
            }}
            onKeyDown={(evento) => {
              if (evento.key === "Enter" && valido) onConfirmar();
            }}
          />
          {erro && <span className="ui-field-error">{erro}</span>}
        </label>
        <div className="voz-revisao-acoes">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="ui-btn ui-btn--danger-solid" disabled={!valido} onClick={onConfirmar}>
            Excluir definitivamente
          </button>
        </div>
      </div>
    </div>
  );
}
