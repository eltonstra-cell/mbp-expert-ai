"use client";

import { useEffect, useRef } from "react";

// Confirmação do "Finalizar visita" no modo Campo: o ✓ da faixa abre SEMPRE esta janela; nada é encerrado no primeiro toque.
// Acessível: role=dialog + aria-modal, o foco vai para "Cancelar" (o lado seguro), Tab fica dentro da janela, Esc cancela e o foco volta ao ✓.
export default function ConfirmarFinalizar({ onCancelar, onFinalizar }: { onCancelar: () => void; onFinalizar: () => void }) {
  const cancelarRef = useRef<HTMLButtonElement | null>(null);
  const finalizarRef = useRef<HTMLButtonElement | null>(null);
  const finalizando = useRef(false);

  const confirmar = () => {
    if (finalizando.current) return;
    finalizando.current = true;
    onFinalizar();
  };

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    cancelarRef.current?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        evento.stopPropagation();
        evento.stopImmediatePropagation();
        onCancelar();
      } else if (evento.key === "Tab") {
        const ordem = [cancelarRef.current, finalizarRef.current].filter((botao): botao is HTMLButtonElement => Boolean(botao));
        const posicao = ordem.indexOf(document.activeElement as HTMLButtonElement);
        const proximo = evento.shiftKey ? (posicao <= 0 ? ordem.length - 1 : posicao - 1) : posicao === ordem.length - 1 ? 0 : posicao + 1;
        evento.preventDefault();
        ordem[proximo]?.focus();
      }
    };
    window.addEventListener("keydown", aoTeclar, true);
    return () => {
      window.removeEventListener("keydown", aoTeclar, true);
      const destino = anterior && anterior !== document.body && anterior.isConnected ? anterior : document.querySelector<HTMLElement>(".fv--campo .fv-finalizar");
      destino?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="cf-camada">
      <button type="button" className="cf-fundo" tabIndex={-1} aria-label="Fechar sem finalizar" onClick={onCancelar} />
      <div className="cf-janela" role="dialog" aria-modal="true" aria-labelledby="cf-titulo">
        <h2 id="cf-titulo" className="cf-titulo">
          Finalizar a visita?
        </h2>
        <div className="cf-botoes">
          <button ref={cancelarRef} type="button" className="cf-btn cf-btn--cancelar" onClick={onCancelar}>
            Cancelar
          </button>
          <button ref={finalizarRef} type="button" className="cf-btn cf-btn--finalizar" onClick={confirmar}>
            Finalizar
          </button>
        </div>
      </div>
    </div>
  );
}
