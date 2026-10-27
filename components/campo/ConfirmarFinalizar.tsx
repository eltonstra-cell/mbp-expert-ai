"use client";

import { useEffect, useRef } from "react";
import { textoSemResposta, tituloFaltam } from "@/lib/ressalvasDeFinalizar";

// Janela ÚNICA do "Finalizar visita" no modo Campo: o ✓ da faixa abre SEMPRE esta janela; nada é encerrado no primeiro toque.
// Três casos (no caso c a janela explica o número do título e separa "Impede finalizar" de "Fica como ressalva"): (a) nada pendente: "Finalizar a visita?" com Cancelar e Finalizar; (b) só ressalvas: "Antes de finalizar" com
// "Voltar e completar" (principal) e "Finalizar com ressalvas"; (c) faltam itens: só "Voltar e completar" (a regra de negócio recusa finalizar).
// Acessível: role=dialog + aria-modal, o foco vai para o botão seguro (Cancelar ou Voltar e completar), Tab fica dentro da janela,
// Esc fecha e o foco volta ao ✓.
export default function ConfirmarFinalizar({
  faltam,
  ressalvas,
  semResposta = [],
  onCancelar,
  onVoltarECompletar,
  onFinalizar,
}: {
  faltam: number;
  ressalvas: string[];
  /** Itens sem resposta, uma linha por ambiente (só nomes de ambiente e contagens). */
  semResposta?: string[];
  onCancelar: () => void;
  onVoltarECompletar: () => void;
  onFinalizar: () => void;
}) {
  const caso: "a" | "b" | "c" = faltam > 0 ? "c" : ressalvas.length > 0 ? "b" : "a";
  const primeiroRef = useRef<HTMLButtonElement | null>(null);
  const segundoRef = useRef<HTMLButtonElement | null>(null);
  const finalizando = useRef(false);
  const devolverFoco = useRef(true);

  const confirmar = () => {
    if (finalizando.current) return;
    finalizando.current = true;
    onFinalizar();
  };

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    primeiroRef.current?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        evento.stopPropagation();
        evento.stopImmediatePropagation();
        onCancelar();
      } else if (evento.key === "Tab") {
        const ordem = [primeiroRef.current, segundoRef.current].filter((botao): botao is HTMLButtonElement => Boolean(botao));
        const posicao = ordem.indexOf(document.activeElement as HTMLButtonElement);
        const proximo = evento.shiftKey ? (posicao <= 0 ? ordem.length - 1 : posicao - 1) : posicao === ordem.length - 1 ? 0 : posicao + 1;
        evento.preventDefault();
        ordem[proximo]?.focus();
      }
    };
    window.addEventListener("keydown", aoTeclar, true);
    return () => {
      window.removeEventListener("keydown", aoTeclar, true);
      if (!devolverFoco.current) return;
      const destino = anterior && anterior !== document.body && anterior.isConnected ? anterior : document.querySelector<HTMLElement>(".fv--campo .fv-finalizar");
      destino?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const titulo = caso === "a" ? "Finalizar a visita?" : caso === "b" ? "Antes de finalizar" : tituloFaltam(faltam);

  return (
    <div className="cf-camada">
      <button type="button" className="cf-fundo" tabIndex={-1} aria-label="Fechar sem finalizar" onClick={onCancelar} />
      <div className="cf-janela" role="dialog" aria-modal="true" aria-labelledby="cf-titulo">
        <h2 id="cf-titulo" className="cf-titulo">
          {titulo}
        </h2>
        {caso === "c" && <p className="cf-resumo">{textoSemResposta(faltam)}</p>}
        {caso !== "a" && (
          <div className="cf-corpo">
            {caso === "c" && (
              <section className="cf-grupo cf-grupo--impede" aria-labelledby="cf-g-impede">
                <h3 id="cf-g-impede" className="cf-sub cf-sub--impede">
                  Impede finalizar
                </h3>
                <ul className="cf-lista">
                  {(semResposta.length > 0 ? semResposta : ["Responda os itens que faltam no checklist"]).map((linha) => (
                    <li key={linha}>
                      <svg className="cf-ico cf-ico--impede" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
                        <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="1.8" />
                        <path d="M7 7l6 6M13 7l-6 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <span>{linha}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {ressalvas.length > 0 && (
              <section className="cf-grupo cf-grupo--ressalva" aria-labelledby="cf-g-ressalva">
                <h3 id="cf-g-ressalva" className="cf-sub cf-sub--ressalva">
                  Fica como ressalva
                </h3>
                <ul className="cf-lista">
                  {ressalvas.map((ressalva) => (
                    <li key={ressalva}>
                      <svg className="cf-ico cf-ico--ressalva" viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" focusable="false">
                        <path d="M10 2.8L18 16.5H2z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                        <path d="M10 8v4M10 14.2v.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      </svg>
                      <span>{ressalva}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        )}
        {caso === "c" && <p className="cf-aviso">Não dá para finalizar enquanto faltam itens</p>}
        {caso === "a" ? (
          <div className="cf-botoes">
            <button ref={primeiroRef} type="button" className="cf-btn cf-btn--cancelar" onClick={onCancelar}>
              Cancelar
            </button>
            <button ref={segundoRef} type="button" className="cf-btn cf-btn--finalizar" onClick={confirmar}>
              Finalizar
            </button>
          </div>
        ) : (
          <div className="cf-botoes cf-botoes--coluna">
            <button ref={primeiroRef} type="button" className="cf-btn cf-btn--acao" onClick={() => {
                devolverFoco.current = false;
                onVoltarECompletar();
              }}>
              Voltar e completar
            </button>
            {caso === "b" && (
              <button ref={segundoRef} type="button" className="cf-btn cf-btn--outline" onClick={confirmar}>
                Finalizar com ressalvas
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
