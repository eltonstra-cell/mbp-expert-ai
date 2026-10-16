"use client";

import { useEffect, useRef, useState } from "react";

export type ItemMenu = {
  rotulo: string;
  onClick: () => void;
  perigo?: boolean;
  /** Se informado, pede confirmação antes de executar (exclusões sempre confirmam). */
  confirmar?: string;
  desabilitado?: boolean;
};

// Menu "⋯" de uma linha. Exclusões ficam sempre aqui e sempre pedem confirmação.
export function RowMenu({ itens, rotulo = "Mais ações" }: { itens: ItemMenu[]; rotulo?: string }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState<{ top: number; right: number } | null>(null);
  const raizRef = useRef<HTMLDivElement | null>(null);
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!aberto || !botaoRef.current) return;
    const caixa = botaoRef.current.getBoundingClientRect();
    const alturaEstimada = Math.min(itens.length * 38 + 16, 240);
    const abreParaCima = caixa.bottom + alturaEstimada + 8 > window.innerHeight && caixa.top > alturaEstimada;
    setPosicao({ top: abreParaCima ? Math.max(8, caixa.top - alturaEstimada - 4) : caixa.bottom + 4, right: Math.max(8, window.innerWidth - caixa.right) });
    window.requestAnimationFrame(() => popRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());
    const fechar = () => setAberto(false);
    window.addEventListener("resize", fechar);
    window.addEventListener("scroll", fechar, true);
    return () => {
      window.removeEventListener("resize", fechar);
      window.removeEventListener("scroll", fechar, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        setAberto(false);
        botaoRef.current?.focus();
        return;
      }
      if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
        const botoes = Array.from(popRef.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || []);
        if (botoes.length === 0) return;
        evento.preventDefault();
        const atual = botoes.indexOf(document.activeElement as HTMLButtonElement);
        const proximo = evento.key === "ArrowDown" ? (atual + 1) % botoes.length : (atual - 1 + botoes.length) % botoes.length;
        botoes[proximo].focus();
      }
    };
    const aoClicarFora = (evento: MouseEvent) => {
      if (raizRef.current && !raizRef.current.contains(evento.target as Node)) setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("mousedown", aoClicarFora);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("mousedown", aoClicarFora);
    };
  }, [aberto]);

  if (itens.length === 0) return null;
  return (
    <div className="ui-menu" ref={raizRef}>
      <button
        type="button"
        ref={botaoRef}
        className="ui-menu-btn"
        aria-label={rotulo}
        aria-haspopup="menu"
        aria-expanded={aberto}
        onClick={(evento) => {
          evento.stopPropagation();
          setAberto((atual) => !atual);
        }}
      >
        <span aria-hidden="true">⋯</span>
      </button>
      {aberto && (
        <div className="ui-menu-pop" role="menu" ref={popRef} style={posicao ? { top: posicao.top, right: posicao.right } : { visibility: "hidden" }}>
          {itens.map((item) => (
            <button
              key={item.rotulo}
              type="button"
              role="menuitem"
              disabled={item.desabilitado}
              className={`ui-menu-item${item.perigo ? " is-danger" : ""}`}
              onClick={(evento) => {
                evento.stopPropagation();
                setAberto(false);
                if (item.confirmar && !window.confirm(item.confirmar)) return;
                item.onClick();
              }}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
