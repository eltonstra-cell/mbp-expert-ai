"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import "../../app/cadastro-estrutura.css";

export type ItemDoMenuMais = {
  rotulo: string;
  onClick: () => void;
  perigo?: boolean;
  /** O item abre um campo ou diálogo que fica com o foco (o foco não volta ao ⋯). */
  assumeFoco?: boolean;
  /** Item visível mas sem efeito (com a razão no `title`). */
  desabilitado?: boolean;
  titulo?: string;
};

type Props = {
  /** Texto lido pelo leitor de tela no botão ⋯ (ex.: "Mais ações de Churrasqueira"). */
  rotulo: string;
  itens: ItemDoMenuMais[];
  /** Linha de 15 px cinza no fim do menu (ex.: "Base: … · conferido em …"). */
  rodape?: string;
  /** Dica do rodapé (trecho da norma e link). */
  rodapeTitulo?: string;
  dataFoco?: string;
};

// Menu ⋯ (botão de 36 px, fundo #EEF1F7): setas, Home/End, Enter, Esc e Tab fecham e devolvem o foco; clique fora fecha.
export default function MenuMais({ rotulo, itens, rodape, rodapeTitulo, dataFoco }: Props) {
  const [aberto, setAberto] = useState(false);
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (aberto) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function aoClicarFora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (menuRef.current?.contains(alvo) || botaoRef.current?.contains(alvo)) return;
      setAberto(false);
    }
    document.addEventListener("mousedown", aoClicarFora);
    return () => document.removeEventListener("mousedown", aoClicarFora);
  }, [aberto]);

  function fechar(devolverFoco: boolean) {
    setAberto(false);
    if (devolverFoco) window.setTimeout(() => botaoRef.current?.focus(), 0);
  }

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    const lista = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') || []);
    const posicao = lista.indexOf(document.activeElement as HTMLElement);
    const ir = (indice: number) => {
      evento.preventDefault();
      lista[(indice + lista.length) % lista.length]?.focus();
    };
    if (evento.key === "ArrowDown") ir(posicao + 1);
    else if (evento.key === "ArrowUp") ir(posicao - 1);
    else if (evento.key === "Home") ir(0);
    else if (evento.key === "End") ir(lista.length - 1);
    else if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      fechar(true);
    } else if (evento.key === "Tab") {
      evento.preventDefault();
      fechar(true);
    }
  }

  return (
    <span className="cadest-menuwrap">
      <button
        type="button"
        ref={botaoRef}
        className="cadest-mais"
        data-foco={dataFoco}
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-label={rotulo}
        onClick={() => setAberto((valor) => !valor)}
        onKeyDown={(evento) => {
          if (evento.key === "ArrowDown" && !aberto) {
            evento.preventDefault();
            setAberto(true);
          }
        }}
      >
        ⋯
      </button>
      {aberto && (
        <div ref={menuRef} className="cadest-menu" role="menu" aria-orientation="vertical" aria-label={rotulo} onKeyDown={aoTeclar}>
          {itens.map((item) => (
            <button
              key={item.rotulo}
              type="button"
              role="menuitem"
              className={`cadest-menu-item${item.perigo ? " cadest-menu-item--perigo" : ""}`}
              aria-disabled={item.desabilitado || undefined}
              title={item.titulo}
              onClick={() => {
                if (item.desabilitado) return;
                setAberto(false);
                item.onClick();
                // O foco volta ao ⋯, a menos que o item abra um campo que assume o foco.
                if (!item.assumeFoco) window.setTimeout(() => botaoRef.current?.focus(), 0);
              }}
            >
              {item.rotulo}
            </button>
          ))}
          {rodape && (
            <p className="cadest-menu-base" title={rodapeTitulo}>
              {rodape}
            </p>
          )}
        </div>
      )}
    </span>
  );
}
