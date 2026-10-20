"use client";

import { useEffect, useRef, useState } from "react";

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
  const caixa = useRef<HTMLTextAreaElement | null>(null);
  const camada = useRef<HTMLDivElement | null>(null);

  // O quadro cresce com o texto; o limite de altura vem do CSS (a janela deixa os botões à vista).
  useEffect(() => {
    const alvo = caixa.current;
    if (!alvo) return;
    alvo.style.height = "auto";
    alvo.style.height = `${alvo.scrollHeight + alvo.offsetHeight - alvo.clientHeight}px`;
  }, [editado]);

  // Com o teclado aberto, a janela acompanha a altura visível da tela.
  useEffect(() => {
    const visual = window.visualViewport;
    if (!visual) return;
    const ajustar = () => camada.current?.style.setProperty("--vv-altura", `${Math.round(visual.height)}px`);
    ajustar();
    visual.addEventListener("resize", ajustar);
    return () => visual.removeEventListener("resize", ajustar);
  }, []);

  return (
    <div ref={camada} className="voz-revisao-camada" role="dialog" aria-modal="true" aria-label="Revisar o que você disse">
      <button type="button" className="voz-revisao-fundo" aria-label="Descartar" onClick={onDescartar} />
      <div className="voz-revisao">
        <h2 className="ui-card-title">Revisar o que você disse</h2>
        <p className="voz-revisao-aviso">Toque no texto para corrigir antes de usar. Nada foi colocado no campo ainda.</p>
        <div className="voz-onda" aria-hidden="true">
          {Array.from({ length: 16 }, (_, indice) => (
            <i key={indice} style={{ animationDelay: `${(indice % 8) * 90}ms` }} />
          ))}
        </div>
        <textarea ref={caixa} className={`ui-input voz-revisao-texto${vazio ? " is-invalid" : ""}`} rows={2} value={editado} aria-label="Texto ouvido" onChange={(evento) => setEditado(evento.target.value)} />
        {vazio && <span className="ui-field-error">O texto não pode ficar vazio.</span>}
        <p className="voz-revisao-nota">Só o texto é usado. O áudio não é guardado.</p>
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
