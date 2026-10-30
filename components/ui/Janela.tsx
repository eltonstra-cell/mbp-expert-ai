"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type Props = {
  titulo: string;
  onFechar: () => void;
  children: ReactNode;
  /** Botões do rodapé (Cancelar / Salvar). */
  rodape?: ReactNode;
  /** Largura máxima em px no PC e no tablet. */
  largura?: number;
  /** Elemento que volta a ter o foco ao fechar (por padrão, o que tinha o foco ao abrir). */
  devolverFocoA?: HTMLElement | null;
};

const FOCAVEIS = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

// Janela de diálogo: centralizada no PC e no tablet, folha de baixo no celular. Esc fecha, Tab fica preso, o foco entra na janela e volta a quem a abriu.
export default function Janela({ titulo, onFechar, children, rodape, largura = 520, devolverFocoA }: Props) {
  const id = useId();
  const caixa = useRef<HTMLDivElement | null>(null);
  const origem = useRef<HTMLElement | null>(null);

  useEffect(() => {
    origem.current = (document.activeElement as HTMLElement | null) ?? null;
    const primeiro = caixa.current?.querySelector<HTMLElement>("[data-foco-inicial]") || caixa.current?.querySelector<HTMLElement>("input:not([disabled]),select:not([disabled]),textarea:not([disabled])");
    (primeiro || caixa.current)?.focus();
    const rolagem = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = rolagem;
      const alvo = devolverFocoA ?? origem.current;
      window.setTimeout(() => alvo?.focus?.(), 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function aoTeclar(evento: React.KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      onFechar();
      return;
    }
    if (evento.key !== "Tab") return;
    const lista = Array.from(caixa.current?.querySelectorAll<HTMLElement>(FOCAVEIS) || []).filter((item) => item.offsetParent !== null);
    if (lista.length === 0) return;
    const primeiro = lista[0];
    const ultimo = lista[lista.length - 1];
    const atual = document.activeElement;
    if (evento.shiftKey && (atual === primeiro || atual === caixa.current)) {
      evento.preventDefault();
      ultimo.focus();
    } else if (!evento.shiftKey && atual === ultimo) {
      evento.preventDefault();
      primeiro.focus();
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="jan-camada" onMouseDown={(evento) => evento.target === evento.currentTarget && onFechar()}>
      <div ref={caixa} className="jan-caixa" style={{ maxWidth: largura }} role="dialog" aria-modal="true" aria-labelledby={`${id}-t`} tabIndex={-1} onKeyDown={aoTeclar}>
        <div className="jan-cabeca">
          <h2 id={`${id}-t`} className="jan-titulo">{titulo}</h2>
          <button type="button" className="jan-fechar" aria-label="Fechar" onClick={onFechar}>
            <span aria-hidden="true">✕</span>
          </button>
        </div>
        <div className="jan-corpo">{children}</div>
        {rodape ? <div className="jan-rodape">{rodape}</div> : null}
      </div>
    </div>,
    document.body,
  );
}
