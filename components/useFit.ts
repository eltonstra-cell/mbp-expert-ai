"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Quantos itens INTEIROS cabem na altura do contêiner (sem rolagem e sem cortar cartão).
 * Use no contêiner da lista (flex:1; min-height:0; overflow:hidden).
 */
export function useCabem<T extends HTMLElement>(alturaDoItem: number, maximo: number, minimo = 0) {
  const [quantos, setQuantos] = useState(maximo);
  const elementoRef = useRef<T | null>(null);
  const observadorRef = useRef<ResizeObserver | null>(null);

  const medir = useCallback(() => {
    const el = elementoRef.current;
    if (!el) return;
    const n = Math.floor(el.clientHeight / alturaDoItem);
    setQuantos(Math.max(minimo, Math.min(maximo, n)));
  }, [alturaDoItem, maximo, minimo]);

  const ref = useCallback(
    (el: T | null) => {
      observadorRef.current?.disconnect();
      elementoRef.current = el;
      if (el && typeof ResizeObserver !== "undefined") {
        observadorRef.current = new ResizeObserver(medir);
        observadorRef.current.observe(el);
      }
      medir();
    },
    [medir]
  );

  useEffect(() => () => observadorRef.current?.disconnect(), []);
  return { ref, quantos };
}
