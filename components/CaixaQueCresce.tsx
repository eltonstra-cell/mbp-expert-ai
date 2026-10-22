"use client";

import { useLayoutEffect, useRef, type TextareaHTMLAttributes } from "react";

type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> & {
  /** Altura mínima, em linhas. */
  linhasMinimas?: number;
};

/** Caixa de texto que cresce com o conteúdo: sem barra de rolagem interna e sem corte (a altura segue o texto). */
export default function CaixaQueCresce({ linhasMinimas = 1, className = "", value, onChange, ...resto }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  function ajustar() {
    const caixa = ref.current;
    if (!caixa) return;
    caixa.style.height = "auto";
    caixa.style.height = `${caixa.scrollHeight}px`;
  }

  useLayoutEffect(() => {
    ajustar();
  }, [value]);

  // A largura muda com a janela (a quebra de linha muda): reajusta.
  useLayoutEffect(() => {
    const caixa = ref.current;
    if (!caixa || typeof ResizeObserver === "undefined") return;
    let larguraAntes = caixa.clientWidth;
    const observador = new ResizeObserver(() => {
      if (caixa.clientWidth !== larguraAntes) {
        larguraAntes = caixa.clientWidth;
        ajustar();
      }
    });
    observador.observe(caixa);
    return () => observador.disconnect();
  }, []);

  return <textarea {...resto} ref={ref} rows={linhasMinimas} className={`${className} caixa-cresce`} value={value} onChange={onChange} />;
}
