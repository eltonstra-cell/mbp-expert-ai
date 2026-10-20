"use client";

import { useEffect, useState } from "react";

// Conexão do aparelho, para os recursos que só funcionam com internet (IA, melhorar texto, transcrição).
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const atualizar = () => setOnline(navigator.onLine);
    atualizar();
    window.addEventListener("online", atualizar);
    window.addEventListener("offline", atualizar);
    return () => {
      window.removeEventListener("online", atualizar);
      window.removeEventListener("offline", atualizar);
    };
  }, []);
  return online;
}
