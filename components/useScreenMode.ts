"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CHAVE_MODO_TELA,
  PREFERENCIA_PADRAO,
  larguraDoLayout,
  lerPreferencia,
  modoAutomatico,
  modoEmUso,
  serializarPreferencia,
  type ModoTela,
  type PreferenciaDeTela,
} from "@/lib/screenMode";

function lerSalvo(): PreferenciaDeTela {
  try {
    return lerPreferencia(window.localStorage.getItem(CHAVE_MODO_TELA));
  } catch {
    return { ...PREFERENCIA_PADRAO };
  }
}

// Com o layout forçado por <meta viewport> (ex.: Completo no celular), a janela passa a medir a
// largura virtual; o tamanho REAL do aparelho está em screen.width.
function larguraDoAparelho(): number {
  if (document.documentElement.dataset.forcado === "1" && window.screen?.width) return window.screen.width;
  return window.innerWidth;
}

/**
 * Modo de tela do aparelho. Automático acompanha a largura; a escolha manual fica em localStorage
 * (com try/catch) e vale na hora, sem perder o estado da tela aberta.
 */
export function useScreenMode() {
  const [preferencia, setPreferencia] = useState<PreferenciaDeTela>(PREFERENCIA_PADRAO);
  const [largura, setLargura] = useState(1280);
  const [pronto, setPronto] = useState(false);
  const atualRef = useRef<PreferenciaDeTela>(PREFERENCIA_PADRAO);
  atualRef.current = preferencia;

  useEffect(() => {
    setPreferencia(lerSalvo());
    setLargura(larguraDoAparelho());
    setPronto(true);
    const aoRedimensionar = () => setLargura(larguraDoAparelho());
    const aoMudarArmazenamento = (evento: StorageEvent) => {
      if (evento.key === CHAVE_MODO_TELA) setPreferencia(lerSalvo());
    };
    window.addEventListener("resize", aoRedimensionar);
    window.addEventListener("storage", aoMudarArmazenamento);
    return () => {
      window.removeEventListener("resize", aoRedimensionar);
      window.removeEventListener("storage", aoMudarArmazenamento);
    };
  }, []);

  const modo: ModoTela = modoEmUso(preferencia, largura);
  const modoRecomendado: ModoTela = modoAutomatico(largura);

  // Layout do modo: atributo no <html> (o CSS usa) e, se preciso, largura virtual da página.
  useEffect(() => {
    if (!pronto) return;
    document.documentElement.dataset.modo = modo;
    const meta = document.querySelector('meta[name="viewport"]');
    const telaDoAparelho = window.screen?.width || largura;
    const forcada = larguraDoLayout(modo, telaDoAparelho);
    document.documentElement.dataset.forcado = forcada ? "1" : "0";
    if (meta) meta.setAttribute("content", forcada ? `width=${forcada}` : "width=device-width, initial-scale=1");
  }, [modo, pronto, largura]);

  const salvar = useCallback((proxima: PreferenciaDeTela) => {
    atualRef.current = proxima;
    setPreferencia(proxima);
    try {
      window.localStorage.setItem(CHAVE_MODO_TELA, serializarPreferencia(proxima));
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
  }, []);

  const escolherModo = useCallback((novo: ModoTela) => salvar({ ...atualRef.current, automatico: false, modo: novo }), [salvar]);
  const voltarAoAutomatico = useCallback(() => salvar({ ...atualRef.current, automatico: true }), [salvar]);
  const alternarAutomatico = useCallback((automatico: boolean) => salvar({ ...atualRef.current, automatico }), [salvar]);
  const nomearAparelho = useCallback((nome: string) => salvar({ ...atualRef.current, nome: nome.trim().slice(0, 40) }), [salvar]);

  return { modo, modoRecomendado, preferencia, larguraDoAparelho: largura, pronto, salvar, escolherModo, voltarAoAutomatico, alternarAutomatico, nomearAparelho };
}
