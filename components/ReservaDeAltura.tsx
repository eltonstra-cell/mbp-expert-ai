"use client";

import { useEffect, useRef, type ReactNode } from "react";

// Faixas avisos do topo (sem sinal, sessão, armazenamento) empurram a tela para baixo; as telas de altura fixa do celular descontam esta altura
// (--faixas-h) para o rodapé do item nunca ficar escondido atrás da barra de baixo.
export default function ReservaDeAltura({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const alvo = ref.current;
    if (!alvo) return;
    const raiz = document.documentElement;
    const medir = () => raiz.style.setProperty("--faixas-h", `${Math.round(alvo.getBoundingClientRect().height)}px`);
    medir();
    const observador = typeof ResizeObserver !== "undefined" ? new ResizeObserver(medir) : null;
    observador?.observe(alvo);
    window.addEventListener("resize", medir);
    return () => {
      observador?.disconnect();
      window.removeEventListener("resize", medir);
      raiz.style.removeProperty("--faixas-h");
    };
  }, []);
  return (
    <div ref={ref} className="faixas-do-topo">
      {children}
    </div>
  );
}
