"use client";

import { useState } from "react";

type Props = {
  dias: number;
  /** Só o Administrador edita; para os demais a tela nem aparece. */
  podeEditar: boolean;
  onDias: (dias: number) => void;
};

// Administração › Visitas: depois de quantos dias a visita em andamento recebe a etiqueta "Aberta há X dias" na lista (uma linha só).
export default function ConfiguracaoDeVisitas({ dias, podeEditar, onDias }: Props) {
  const [texto, setTexto] = useState(String(dias));
  const erro = texto !== "" && (!/^\d+$/.test(texto) || Number(texto) < 1 || Number(texto) > 60) ? "Use de 1 a 60 dias." : "";
  return (
    <div className="adm-visitas-linha" role="group" aria-label="Configuração das visitas">
      <span className="adm-visitas-rotulo">Visitas</span>
      <label className="vis-aviso-config" title="A lista de Visitas marca em terra a visita em andamento que passa deste limite.">
        <span>Avisar visita aberta após</span>
        <input
          className={`ui-input vis-aviso-dias${erro ? " is-invalid" : ""}`}
          inputMode="numeric"
          value={texto}
          disabled={!podeEditar}
          aria-label="Dias para avisar visita aberta"
          aria-invalid={Boolean(erro)}
          onChange={(evento) => {
            const novo = evento.target.value.replace(/\D/g, "").slice(0, 2);
            setTexto(novo);
            const n = Number(novo);
            if (novo && n >= 1 && n <= 60) onDias(n);
          }}
        />
        <span>dias</span>
      </label>
      {erro && <span className="ui-field-error ui-field-error--forte">{erro}</span>}
    </div>
  );
}
