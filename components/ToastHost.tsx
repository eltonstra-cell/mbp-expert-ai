"use client";

import { useSyncExternalStore } from "react";
import { assinarToast, fecharToast, toastAtual } from "@/lib/toast";

const SEM_TOAST = () => null;

// Mostra o aviso curto de mostrarToast() ("Salvo") e deixa a janela sumir sozinha.
export default function ToastHost() {
  const toast = useSyncExternalStore(assinarToast, toastAtual, SEM_TOAST);
  if (!toast) return null;
  // Aviso que acompanha uma resposta do checklist (tem "tom") sempre usa o ✓; só a cor muda. "!" fica para avisos comuns.
  const ehOk = toast.tipo === "ok" || Boolean(toast.tom);
  return (
    <div key={toast.id} className={`pc-toast toast-salvo${ehOk ? " pc-toast--ok" : " toast-aviso"}${toast.tom ? ` toast-tom--${toast.tom}` : ""}`} role="status" aria-live="polite">
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
