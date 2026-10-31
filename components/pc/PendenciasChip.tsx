"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { rotuloDoChipDePendencias } from "@/lib/companyReadiness";
import { textoDaPreparacao } from "@/lib/listaDeEmpresas";

// Chip âmbar com as pendências da empresa. Com uma só, mostra o nome; com várias, "N pendências ▸" e a lista completa numa janelinha (clique ou mouse em cima).
export default function PendenciasChip({ faltas, onAbrir, texto = false }: { faltas: string[]; /** Abre onde a pendência se resolve; sem isso a lista é só leitura. */ onAbrir?: (falta: string) => void; /** Texto simples cinza (lista de Empresas), sem a pílula âmbar. */ texto?: boolean }) {
  const [aberta, setAberta] = useState(false);
  const [posicao, setPosicao] = useState<{ top: number; left: number } | null>(null);
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const janelaRef = useRef<HTMLDivElement | null>(null);
  const rotulo = texto ? textoDaPreparacao(faltas) : rotuloDoChipDePendencias(faltas);
  const classe = texto ? "pend-texto" : "pend-chip";
  const varias = faltas.length > 1;

  useLayoutEffect(() => {
    if (!aberta || !botaoRef.current) return;
    const caixa = botaoRef.current.getBoundingClientRect();
    const janela = janelaRef.current?.getBoundingClientRect();
    const largura = janela?.width || 280;
    const altura = janela?.height || 160;
    const margem = 8;
    const maxTopo = window.innerHeight - altura - margem;
    const noCentro = Math.max(margem, Math.min(caixa.top + caixa.height / 2 - altura / 2, maxTopo));
    // Ao lado do chip (não cobre a barra de progresso nem a linha vizinha); sem espaço nos lados, acima ou abaixo.
    if (caixa.right + 8 + largura <= window.innerWidth - margem) setPosicao({ top: noCentro, left: caixa.right + 8 });
    else if (caixa.left - 8 - largura >= margem) setPosicao({ top: noCentro, left: caixa.left - 8 - largura });
    else {
      const left = Math.max(margem, Math.min(caixa.left, window.innerWidth - largura - margem));
      const cabeEmCima = caixa.top - 6 - altura >= margem;
      const cabeEmBaixo = caixa.bottom + 6 + altura <= window.innerHeight - margem;
      setPosicao({ top: cabeEmCima && !cabeEmBaixo ? caixa.top - 6 - altura : Math.max(margem, Math.min(caixa.bottom + 6, maxTopo)), left });
    }
  }, [aberta]);

  useEffect(() => {
    if (!aberta) return;
    const fecharFora = (evento: PointerEvent) => {
      const alvo = evento.target as Node;
      if (botaoRef.current?.contains(alvo) || janelaRef.current?.contains(alvo)) return;
      setAberta(false);
    };
    const fecharEsc = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberta(false);
    };
    const fechar = () => setAberta(false);
    window.addEventListener("pointerdown", fecharFora);
    window.addEventListener("keydown", fecharEsc);
    window.addEventListener("scroll", fechar, true);
    return () => {
      window.removeEventListener("pointerdown", fecharFora);
      window.removeEventListener("keydown", fecharEsc);
      window.removeEventListener("scroll", fechar, true);
    };
  }, [aberta]);

  if (faltas.length === 0) return null;
  if (!varias)
    return onAbrir ? (
      <button type="button" className={`${classe} ${classe}--botao`} onClick={() => onAbrir(faltas[0])} title="Abrir onde se resolve">
        {rotulo}
      </button>
    ) : (
      <span className={classe}>{rotulo}</span>
    );
  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className={`${classe} ${classe}--botao`}
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
