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
  const raizRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
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
        <div className="ui-menu-pop" role="menu">
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
