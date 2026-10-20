"use client";

import { useEffect, useRef } from "react";

// Faixa baixa no topo da visita quando ela é de uma empresa diferente da empresa ativa.
// Reserva a própria altura (--faixa-h) para as telas de altura fixa não ficarem com rolagem.
export default function FaixaVisitaOutraEmpresa({
  empresaDaVisita,
  empresaAtiva,
  onTrocar,
  mensagem,
}: {
  empresaDaVisita?: string;
  empresaAtiva?: string;
  onTrocar?: () => void;
  /** Faixa só de aviso (sem botão), ex.: acesso de leitura do Fiscal. */
  mensagem?: string;
}) {
  const raiz = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const alvo = raiz.current;
    if (!alvo || typeof ResizeObserver === "undefined") return;
    const medir = () => document.documentElement.style.setProperty("--faixa-h", `${Math.round(alvo.getBoundingClientRect().height) + 8}px`);
    medir();
    const observador = new ResizeObserver(medir);
    observador.observe(alvo);
    return () => {
      observador.disconnect();
      document.documentElement.style.removeProperty("--faixa-h");
    };
  }, []);

  return (
    <div ref={raiz} className="faixa-outra-empresa" role="status">
      <span className="faixa-outra-texto">{mensagem ?? `Esta visita é de ${empresaDaVisita}. A empresa ativa é ${empresaAtiva}.`}</span>
      {onTrocar && (
        <button type="button" className="ui-btn ui-btn--secondary ui-btn--small faixa-outra-botao" onClick={onTrocar}>
          Trocar para {empresaDaVisita}
        </button>
      )}
    </div>
  );
}
