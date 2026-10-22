"use client";

import { useEffect, useId, useRef, useState } from "react";

export type OpcaoDeSecao = { id: string; rotulo: string; atual: boolean };

type Props = {
  /** Nome da seção aberta (aparece no botão creme). */
  rotulo: string;
  opcoes: OpcaoDeSecao[];
  onEscolher: (id: string) => void;
};

// Botão-menu da barra do topo ("Central da Empresa › Documentos ▾"): troca a seção sem uma linha própria de botões.
// Teclado: Enter/Espaço/↓ abrem; ↑ ↓ Home End andam pela lista; Enter escolhe; Esc fecha e devolve o foco; clicar fora fecha.
export default function SeletorDeSecao({ rotulo, opcoes, onEscolher }: Props) {
  const [aberto, setAberto] = useState(false);
  const [foco, setFoco] = useState(0);
  const raiz = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const itens = useRef<(HTMLButtonElement | null)[]>([]);
  const idDaLista = useId();

  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent | TouchEvent) {
      if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    document.addEventListener("touchstart", fora);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("touchstart", fora);
    };
  }, [aberto]);

  useEffect(() => {
    if (aberto) itens.current[foco]?.focus();
  }, [aberto, foco]);

  function abrir() {
    const atual = opcoes.findIndex((opcao) => opcao.atual);
    setFoco(atual >= 0 ? atual : 0);
    setAberto(true);
  }
  function fechar(devolverFoco = true) {
    setAberto(false);
    if (devolverFoco) botao.current?.focus();
  }
  function escolher(id: string) {
    fechar();
    onEscolher(id);
  }
  function teclasDoBotao(evento: React.KeyboardEvent) {
    if (["ArrowDown", "ArrowUp"].includes(evento.key)) {
      evento.preventDefault();
      abrir();
    }
  }
  function teclasDaLista(evento: React.KeyboardEvent) {
    const ultimo = opcoes.length - 1;
    if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      fechar();
    } else if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setFoco((atual) => (atual >= ultimo ? 0 : atual + 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setFoco((atual) => (atual <= 0 ? ultimo : atual - 1));
    } else if (evento.key === "Home") {
      evento.preventDefault();
      setFoco(0);
    } else if (evento.key === "End") {
      evento.preventDefault();
      setFoco(ultimo);
    } else if (evento.key === "Tab") {
      setAberto(false);
    }
  }

  return (
    <div className="sec-menu" ref={raiz}>
      <button
        ref={botao}
        type="button"
        className="sec-menu-botao"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={aberto ? idDaLista : undefined}
        onClick={() => (aberto ? fechar(false) : abrir())}
        onKeyDown={teclasDoBotao}
      >
        <span>{rotulo}</span>
        <span className="sec-menu-seta" aria-hidden="true">▾</span>
      </button>
      {aberto && (
        <div className="sec-menu-lista" id={idDaLista} role="menu" aria-label="Seção da Central" onKeyDown={teclasDaLista}>
          {opcoes.map((opcao, indice) => (
            <button
              key={opcao.id}
              ref={(elemento) => {
                itens.current[indice] = elemento;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={opcao.atual}
              tabIndex={indice === foco ? 0 : -1}
              className={`sec-menu-item${opcao.atual ? " is-atual" : ""}`}
              onClick={() => escolher(opcao.id)}
            >
              <span className="sec-menu-marca" aria-hidden="true">{opcao.atual ? "✓" : ""}</span>
              {opcao.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
