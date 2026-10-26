"use client";

import { useCallback, useLayoutEffect, useRef, type ComponentPropsWithRef } from "react";

type Props = Omit<ComponentPropsWithRef<"textarea">, "rows"> & {
  /** Altura mínima, em linhas. */
  linhasMinimas?: number;
  /** Altura máxima, em px: acima dela a caixa para de crescer e passa a rolar por dentro. Sem valor, cresce sempre. */
  alturaMaxima?: number;
};

/** Caixa de texto que cresce com o conteúdo: sem barra de rolagem interna e sem corte (a altura segue o texto, até o limite opcional). */
export default function CaixaQueCresce({ linhasMinimas = 1, alturaMaxima, className = "", value, onChange, ref: refDeFora, ...resto }: Props) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const guardarRef = useCallback(
    (caixa: HTMLTextAreaElement | null) => {
      ref.current = caixa;
      if (typeof refDeFora === "function") refDeFora(caixa);
      else if (refDeFora) refDeFora.current = caixa;
    },
    [refDeFora]
  );

  function ajustar() {
    const caixa = ref.current;
    if (!caixa) return;
    caixa.style.height = "auto";
    const altura = caixa.scrollHeight;
    const passou = alturaMaxima !== undefined && altura > alturaMaxima;
    caixa.style.height = `${passou ? alturaMaxima : altura}px`;
    // O CSS da caixa força overflow:hidden; só passando do limite a rolagem interna volta.
    if (passou) caixa.style.setProperty("overflow-y", "auto", "important");
    else caixa.style.removeProperty("overflow-y");
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

  return <textarea {...resto} ref={guardarRef} rows={linhasMinimas} className={`${className} caixa-cresce`} value={value} onChange={onChange} />;
}
