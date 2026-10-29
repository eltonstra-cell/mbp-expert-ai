"use client";

import { useSyncExternalStore } from "react";

const CONSULTA = "(max-width: 599.98px)";

function assinar(aviso: () => void) {
  const lista = window.matchMedia(CONSULTA);
  lista.addEventListener("change", aviso);
  return () => lista.removeEventListener("change", aviso);
}

// Celular = abaixo de 600px (o tablet, de 600px até o PC, usa o mesmo layout do Campo com mais espaço). No servidor assume tablet.
export function useIsCelular(): boolean {
  return useSyncExternalStore(
    assinar,
    () => window.matchMedia(CONSULTA).matches,
    () => false
  );
}
