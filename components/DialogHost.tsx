"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { assinarDialogos, dialogoAtual, encerrarDialogoAtual, type Dialogo } from "@/lib/dialogos";

const SEM_DIALOGO = () => null;

// Mostra uma janela por vez para avisar(), confirmar() e perguntar().
export default function DialogHost() {
  const dialogo = useSyncExternalStore(assinarDialogos, dialogoAtual, SEM_DIALOGO);
  if (!dialogo) return null;
  return <Janela key={dialogoId(dialogo)} dialogo={dialogo} />;
}

const ids = new WeakMap<Dialogo, number>();
let contador = 0;
function dialogoId(dialogo: Dialogo) {
  if (!ids.has(dialogo)) ids.set(dialogo, (contador += 1));
  return ids.get(dialogo);
}

function Janela({ dialogo }: { dialogo: Dialogo }) {
  const [texto, setTexto] = useState(dialogo.tipo === "pergunta" ? dialogo.valorInicial : "");
  const principalRef = useRef<HTMLButtonElement | null>(null);
  const campoRef = useRef<HTMLInputElement | null>(null);

  const cancelar = () => {
    if (dialogo.tipo === "confirmacao") dialogo.resolver(false);
    else if (dialogo.tipo === "pergunta") dialogo.resolver(null);
    else dialogo.resolver();
    encerrarDialogoAtual();
  };
  const confirmar = () => {
    if (dialogo.tipo === "confirmacao") dialogo.resolver(true);
    else if (dialogo.tipo === "pergunta") dialogo.resolver(texto);
    else dialogo.resolver();
    encerrarDialogoAtual();
  };

  useEffect(() => {
    (campoRef.current ?? principalRef.current)?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") cancelar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const perigoso = dialogo.tipo !== "aviso" && dialogo.perigoso;
  const rotuloPrincipal = dialogo.tipo === "aviso" ? "Entendi" : dialogo.confirmarRotulo;

  return (
    <div className="voz-revisao-camada dialogo-app" role="alertdialog" aria-modal="true" aria-label={dialogo.titulo}>
      <button type="button" className="voz-revisao-fundo" aria-label="Fechar" onClick={dialogo.tipo === "aviso" ? confirmar : cancelar} />
      <div className="voz-revisao">
        <h2 className="ui-card-title">{dialogo.titulo}</h2>
        <p className="dialogo-texto">{dialogo.mensagem}</p>
        {dialogo.tipo === "pergunta" && (
          <input
            ref={campoRef}
            className="ui-input"
            value={texto}
            autoComplete="off"
            onChange={(evento) => setTexto(evento.target.value)}
            onKeyDown={(evento) => {
              if (evento.key === "Enter") confirmar();
            }}
          />
        )}
        <div className="voz-revisao-acoes">
          {dialogo.tipo !== "aviso" && (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={cancelar}>
              {dialogo.cancelarRotulo}
            </button>
          )}
          <button ref={principalRef} type="button" className={`ui-btn ${perigoso ? "ui-btn--danger-solid" : "ui-btn--primary"}`} onClick={confirmar}>
            {rotuloPrincipal}
          </button>
        </div>
      </div>
    </div>
  );
}
