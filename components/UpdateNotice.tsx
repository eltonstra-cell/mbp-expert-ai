"use client";

import { useEffect, useRef, useState } from "react";

// Avisa quando há uma nova versão do app pronta (service worker em espera).
// "Atualizar" ativa a nova versão e recarrega uma única vez.
export default function UpdateNotice() {
  const [espera, setEspera] = useState<ServiceWorker | null>(null);
  const recarregando = useRef(false);
  const pediuAtualizar = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let cancelado = false;
    const limpezas: Array<() => void> = [];

    function observar(registro: ServiceWorkerRegistration) {
      const verificar = () => {
        // Sem controlador é a primeira instalação: não há nada a atualizar.
        if (registro.waiting && navigator.serviceWorker.controller && !cancelado) setEspera(registro.waiting);
      };
      verificar();
      const aoEncontrar = () => {
        const novo = registro.installing;
        if (!novo) return;
        const aoMudar = () => {
          if (novo.state === "installed") verificar();
        };
        novo.addEventListener("statechange", aoMudar);
        limpezas.push(() => novo.removeEventListener("statechange", aoMudar));
      };
      registro.addEventListener("updatefound", aoEncontrar);
      limpezas.push(() => registro.removeEventListener("updatefound", aoEncontrar));

      const aoVoltar = () => {
        if (document.visibilityState === "visible") void registro.update().catch(() => undefined);
      };
      document.addEventListener("visibilitychange", aoVoltar);
      limpezas.push(() => document.removeEventListener("visibilitychange", aoVoltar));
    }

    void navigator.serviceWorker
      .ready.then((registro) => {
        if (!cancelado) observar(registro);
      })
      .catch(() => undefined);

    const aoTrocar = () => {
      // Só recarrega depois do clique: na primeira instalação o controlador também muda.
      if (!pediuAtualizar.current || recarregando.current) return;
      recarregando.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", aoTrocar);
    limpezas.push(() => navigator.serviceWorker.removeEventListener("controllerchange", aoTrocar));

    return () => {
      cancelado = true;
      limpezas.forEach((limpar) => limpar());
    };
  }, []);

  if (!espera) return null;

  return (
    <div className="pc-update-notice" role="status">
      <span>Nova versão disponível</span>
      <button
        type="button"
        className="ui-btn ui-btn--primary ui-btn--small"
        onClick={() => {
          pediuAtualizar.current = true;
          espera.postMessage({ type: "SKIP_WAITING" });
        }}
      >
        Atualizar
      </button>
    </div>
  );
}
