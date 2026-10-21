"use client";

import { useSyncExternalStore } from "react";
import { assinarToast, toastAtual } from "@/lib/toast";

const SEM_TOAST = () => null;

// Mostra o aviso curto de mostrarToast() ("Salvo") e deixa a janela sumir sozinha.
export default function ToastHost() {
  const toast = useSyncExternalStore(assinarToast, toastAtual, SEM_TOAST);
  if (!toast) return null;
  return (
    <div key={toast.id} className={`pc-toast toast-salvo${toast.tipo === "ok" ? " pc-toast--ok" : " toast-aviso"}`} role="status" aria-live="polite">
      <span aria-hidden="true">{toast.tipo === "ok" ? "✓" : "!"}</span> {toast.texto}
    </div>
  );
}
