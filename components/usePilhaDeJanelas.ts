"use client";

import { useEffect, useId, useSyncExternalStore } from "react";
import { assinarPilha, desempilhar, empilhar, noTopo, temJanelaPorCima } from "@/lib/pilhaDeJanelas";

/**
 * Registra a janela na pilha única enquanto `ativa`. `ehTopo()` serve para os ouvintes de Esc (leem a pilha na hora do evento);
 * `coberta` fica verdadeira quando outra janela abriu por cima (a de baixo vira inerte).
 */
export function usePilhaDeJanelas(ativa = true) {
  const id = useId();
  useEffect(() => {
    if (!ativa) return;
    empilhar(id);
    return () => desempilhar(id);
  }, [ativa, id]);
  const coberta = useSyncExternalStore(assinarPilha, () => temJanelaPorCima(id), () => false);
  return { id, coberta, ehTopo: () => noTopo(id) };
}
