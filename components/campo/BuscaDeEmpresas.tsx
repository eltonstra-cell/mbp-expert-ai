"use client";

import { NavIcon } from "@/components/NavIcons";
import { useVoiceCapture } from "@/components/useVoiceCapture";

// Filtro da lista de Empresas (celular e tablet): campo de texto com o microfone dentro, na ponta direita.
// A voz usa a mesma transcrição da busca inteligente; o texto falado só entra no filtro.
export default function BuscaDeEmpresas({
  valor,
  onChange,
  placeholder,
  micDisponivel = true,
  className = "",
}: {
  valor: string;
  onChange: (texto: string) => void;
  placeholder: string;
  micDisponivel?: boolean;
  className?: string;
}) {
  const voz = useVoiceCapture({ contexto: "busca", onTexto: onChange });
  return (
    <div className={`emp-busca ${className}`.trim()}>
      <input
        type="search"
        className="emp-busca-campo"
        placeholder={placeholder}
        aria-label="Buscar empresa"
        autoComplete="off"
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
      />
      {micDisponivel && (
        <button
          type="button"
          className={`emp-busca-mic${voz.estado === "ouvindo" ? " is-listening" : ""}`}
          aria-label={voz.estado === "ouvindo" ? "Parar de ouvir" : "Falar o nome da empresa"}
          disabled={voz.estado === "transcrevendo"}
          onClick={() => (voz.estado === "ouvindo" ? voz.parar() : void voz.iniciar())}
        >
          <NavIcon name="microfone" size={16} />
        </button>
      )}
    </div>
  );
}
