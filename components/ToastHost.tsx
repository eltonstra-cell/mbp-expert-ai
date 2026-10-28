"use client";

import { useSyncExternalStore } from "react";
import { assinarToast, fecharToast, toastAtual } from "@/lib/toast";

const SEM_TOAST = () => null;

// Mostra o aviso curto de mostrarToast() ("Salvo") e deixa a janela sumir sozinha.
export default function ToastHost() {
  const toast = useSyncExternalStore(assinarToast, toastAtual, SEM_TOAST);
  if (!toast) return null;
  const ehOk = toast.tipo === "ok";
  return (
    <div key={toast.id} className={`pc-toast toast-salvo${ehOk ? " pc-toast--ok" : " toast-aviso"}`} role="status" aria-live="polite">
      <span aria-hidden="true">{ehOk ? "✓" : "!"}</span> {toast.texto}
      {toast.acao && (
        <button
          type="button"
          className="toast-acao"
          onClick={() => {
            toast.acao?.aoClicar();
            fecharToast();
          }}
        >
          {toast.acao.rotulo}
        </button>
      )}
    </div>
  );
}
