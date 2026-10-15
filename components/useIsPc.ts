"use client";

import { useSyncExternalStore } from "react";

const CONSULTA = "(min-width: 1024px)";

function assinar(aviso: () => void) {
  const lista = window.matchMedia(CONSULTA);
  lista.addEventListener("change", aviso);
  return () => lista.removeEventListener("change", aviso);
}

// PC = a partir de 1024px. No servidor assume tablet/celular (as telas atuais).
export function useIsPc(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false
  );
}
