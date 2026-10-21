"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rotuloDoChipDePendencias } from "@/lib/companyReadiness";

// Chip âmbar com as pendências da empresa. Com uma só, mostra o nome; com várias, "N pendências ▸" e a lista completa numa janelinha (clique ou mouse em cima).
export default function PendenciasChip({ faltas, onAbrir }: { faltas: string[]; /** Abre onde a pendência se resolve; sem isso a lista é só leitura. */ onAbrir?: (falta: string) => void }) {
  const [aberta, setAberta] = useState(false);
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const janelaRef = useRef<HTMLDivElement | null>(null);
  const rotulo = rotuloDoChipDePendencias(faltas);
  const varias = faltas.length > 1;

  useLayoutEffect(() => {
    if (!aberta || !botaoRef.current) return;
    const caixa = botaoRef.current.getBoundingClientRect();
    setPosicao({ top: caixa.bottom + 6, left: Math.max(8, Math.min(caixa.left, window.innerWidth - 300)) });
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return;
    const fecharFora = (evento: MouseEvent) => {
      const alvo = evento.target as Node;
      if (botaoRef.current?.contains(alvo) || janelaRef.current?.contains(alvo)) return;
      setAberta(false);
    };
    const fecharEsc = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberta(false);
    };
    const fechar = () => setAberta(false);
    window.addEventListener("mousedown", fecharFora);
    window.addEventListener("keydown", fecharEsc);
    window.addEventListener("scroll", fechar, true);
    return () => {
      window.removeEventListener("mousedown", fecharFora);
      window.removeEventListener("keydown", fecharEsc);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [aberta]);

  if (faltas.length === 0) return null;
  if (!varias)
    return onAbrir ? (
      <button type="button" className="pend-chip pend-chip--botao" onClick={() => onAbrir(faltas[0])} title="Abrir onde se resolve">
        {rotulo}
      </button>
    ) : (
      <span className="pend-chip">{rotulo}</span>
    );
  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className="pend-chip pend-chip--botao"
        aria-haspopup="dialog"
        aria-expanded={aberta}
        onClick={(evento) => {
          evento.stopPropagation();
          setAberta((valor) => !valor);
        }}
        onMouseEnter={() => setAberta(true)}
      >
        {rotulo}
      </button>
      {aberta &&
        createPortal(
          <div className="pend-janela" role="dialog" aria-label="Pendências da empresa" ref={janelaRef} style={posicao ? { top: posicao.top, left: posicao.left } : { visibility: "hidden" }} onMouseLeave={() => setAberta(false)}>
            <strong>Falta preencher</strong>
            <ul>
              {faltas.map((falta) => (
                <li key={falta}>
                  {onAbrir ? (
                    <button
                      type="button"
                      className="pend-link"
                      onClick={() => {
                        setAberta(false);
                        onAbrir(falta);
                      }}
                    >
                      {falta}
                    </button>
                  ) : (
                    falta
                  )}
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </>
  );
}
