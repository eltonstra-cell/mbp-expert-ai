"use client";

import { useEffect, useRef } from "react";
import type { PassoTrilha, PassoVisita } from "@/lib/visitTrail";

type Props = {
  /** Assuntos da visita que a pessoa pode abrir (a Central da visita não entra: o topo já diz "Visita N"). */
  passos: PassoTrilha[];
  atual: PassoVisita | null;
  /** Correções abertas DA VISITA, vencidas ou não (número vermelho do segmento Correções). A barra lateral conta outra coisa: só as vencidas da empresa toda. */
  ncsAbertas: number;
  onIrPasso: (passo: PassoVisita) => void;
  /** "Finalizar visita" chama finalizarInspecao (valida e abre a janela Revisar). */
  onFinalizar: () => void;
  podeFinalizar: boolean;
  /** No celular a faixa reserva a própria altura para as telas de altura fixa não ganharem rolagem. */
  reservarAltura?: boolean;
  /** Modo Campo (celular): botão só com o ✓ (nome acessível "Finalizar visita"); com "comRotulo" mostra "✓ Finalizar". Sem isto, o PC fica como era. */
  campo?: boolean;
  comRotulo?: boolean;
};

const ROTULO: Record<PassoVisita, string> = { central: "Visita", checklist: "Checklist", evidencias: "Evidências", correcoes: "Correções", pops: "POPs", relatorio: "Relatório" };

// Faixa que aparece só dentro da visita: troca de assunto (Checklist, Evidências, Correções, POPs, Relatório) e "Finalizar visita".
export default function FaixaDaVisita({ passos, atual, ncsAbertas, onIrPasso, onFinalizar, podeFinalizar, reservarAltura = false, campo = false, comRotulo = false }: Props) {
  const raiz = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!reservarAltura) return;
    const alvo = raiz.current;
    if (!alvo) return;
    const medir = () => document.documentElement.style.setProperty("--faixa-visita-h", `${Math.round(alvo.getBoundingClientRect().height + (parseFloat(getComputedStyle(alvo).marginTop) || 0)) + 8}px`);
    medir();
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("resize", medir);
      document.documentElement.style.removeProperty("--faixa-visita-h");
    };
  }, [reservarAltura]);

  const itens = passos.filter((passo) => passo.chave !== "central");
  return (
    <div ref={raiz} className={`fv${campo ? " fv--campo" : ""}`} role="navigation" aria-label="Assuntos da visita">
      <div className="fv-seg" role="group" aria-label="Assunto da visita">
        {itens.map((passo) => {
          const ehAtual = atual === passo.chave;
          const badge = passo.chave === "correcoes" ? ncsAbertas : 0;
          return (
            <button
              key={passo.chave}
              type="button"
              data-chave={passo.chave}
              className={`fv-item${ehAtual ? " is-atual" : ""}`}
              aria-current={ehAtual ? "page" : undefined}
              aria-label={badge > 0 ? `${ROTULO[passo.chave]}, ${badge} ${badge === 1 ? "correção aberta" : "correções abertas"} nesta visita` : undefined}
              title={badge > 0 ? `${badge} ${badge === 1 ? "correção aberta" : "correções abertas"} nesta visita (a barra lateral conta só as vencidas da empresa toda)` : undefined}
              onClick={() => onIrPasso(passo.chave)}
            >
              {ROTULO[passo.chave]}
              {badge > 0 && (
                <span className="fv-badge" aria-hidden="true">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {podeFinalizar && (
        <button type="button" className="fv-finalizar" aria-label="Finalizar visita" title={campo ? "Finalizar visita" : undefined} onClick={onFinalizar}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
          {(!campo || comRotulo) && <span>{campo ? "Finalizar" : "Finalizar visita"}</span>}
        </button>
      )}
    </div>
  );
}
