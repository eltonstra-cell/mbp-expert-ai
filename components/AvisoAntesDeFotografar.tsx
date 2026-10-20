"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { chaveDoAvisoDeFoto } from "@/lib/avisoDeFoto";

type Pedir = (acao: () => void) => void;

// Sem o provedor (testes, telas isoladas) a câmera abre direto.
const AvisoFotoContext = createContext<Pedir>((acao) => acao());

/** Pede o aviso "Antes de fotografar" e, depois do "Entendi", executa a ação que abre a câmera. */
export function useAvisoAntesDeFotografar(): Pedir {
  return useContext(AvisoFotoContext);
}

function jaEntendeu(visitaId: string | null): boolean {
  if (!visitaId) return false;
  try {
    return window.localStorage.getItem(chaveDoAvisoDeFoto(visitaId)) === "1";
  } catch {
    return false;
  }
}

// Folha de baixo antes de abrir a câmera. "Não mostrar de novo" vale só para a visita aberta.
export function AvisoFotoProvider({ visitaId, children }: { visitaId: string | null; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const [naoMostrar, setNaoMostrar] = useState(false);
  const acaoRef = useRef<(() => void) | null>(null);

  const pedir = useCallback<Pedir>(
    (acao) => {
      if (jaEntendeu(visitaId)) {
        acao();
        return;
      }
      acaoRef.current = acao;
      setNaoMostrar(false);
      setAberto(true);
    },
    [visitaId]
  );

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  function entendi() {
    if (naoMostrar && visitaId) {
      try {
        window.localStorage.setItem(chaveDoAvisoDeFoto(visitaId), "1");
      } catch {
        // sem armazenamento local: o aviso volta na próxima foto
      }
    }
    const acao = acaoRef.current;
    acaoRef.current = null;
    setAberto(false);
    acao?.();
  }

  return (
    <AvisoFotoContext.Provider value={pedir}>
      {children}
      {aberto && (
        <div className="aviso-foto-camada" role="dialog" aria-modal="true" aria-label="Antes de fotografar">
          <button type="button" className="aviso-foto-fundo" aria-label="Fechar" onClick={() => setAberto(false)} />
          <div className="aviso-foto-folha">
            <span className="aviso-foto-alca" aria-hidden="true" />
            <h2 className="aviso-foto-titulo">Antes de fotografar</h2>
            <div className="aviso-foto-linha aviso-foto-linha--sim">
              <span aria-hidden="true">✓</span>
              <span>Mostre o ambiente, o equipamento ou o produto.</span>
            </div>
            <div className="aviso-foto-linha aviso-foto-linha--nao">
              <span aria-hidden="true">✕</span>
              <span>Evite rostos, crachás e documentos pessoais.</span>
            </div>
            <label className="aviso-foto-check">
              <input type="checkbox" checked={naoMostrar} onChange={(evento) => setNaoMostrar(evento.target.checked)} />
              <span>Não mostrar de novo nesta visita</span>
            </label>
            <button type="button" className="aviso-foto-botao" onClick={entendi} autoFocus>
              Entendi, abrir câmera
            </button>
          </div>
        </div>
      )}
    </AvisoFotoContext.Provider>
  );
}
