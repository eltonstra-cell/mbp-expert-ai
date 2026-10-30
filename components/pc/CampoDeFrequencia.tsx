"use client";

import { useId } from "react";
import { OPCOES_DE_FREQUENCIA, frequenciaDoPop } from "@/lib/popFrequencia";
import type { FrequenciaDoPop, TipoDeFrequencia } from "@/types";

type Props = {
  frequencia?: string;
  estruturada?: FrequenciaDoPop;
  desabilitado?: boolean;
  erro?: string;
  onChange: (frequencia: FrequenciaDoPop | null) => void;
};

// Frequência do POP: diária, semanal, mensal ou outra (texto). Substitui o texto livre; POP antigo aparece já convertido
// quando o texto é reconhecido, e como "Outra" com o texto original quando não é.
export default function CampoDeFrequencia({ frequencia, estruturada, desabilitado, erro, onChange }: Props) {
  const idDoErro = useId();
  const atual = estruturada || frequenciaDoPop({ frequencia });
  const tipo: TipoDeFrequencia | "" = atual?.tipo || "";
  return (
    <div className="freq-campo">
      <div className="pc-field" role="radiogroup" aria-label="Frequência" aria-invalid={Boolean(erro)} aria-describedby={erro ? idDoErro : undefined}>
        <span className="ui-eyebrow">Frequência</span>
        <div className="freq-grade">
          {OPCOES_DE_FREQUENCIA.map((opcao) => (
            <button
              key={opcao.tipo}
              type="button"
              role="radio"
              aria-checked={tipo === opcao.tipo}
              disabled={desabilitado}
              className={`freq-opcao${tipo === opcao.tipo ? " is-escolhida" : ""}${erro && !tipo ? " is-invalid" : ""}`}
              onClick={() => {
                if (tipo === opcao.tipo) return;
                onChange(opcao.tipo === "outra" ? { tipo: "outra", texto: atual?.tipo === "outra" ? atual.texto || "" : "" } : { tipo: opcao.tipo });
              }}
            >
              {opcao.rotulo}
            </button>
          ))}
        </div>
      </div>
      {tipo === "outra" && (
        <label className="pc-field">
          <span className="ui-eyebrow">Qual frequência?</span>
          <input
            className="ui-input"
            value={estruturada?.tipo === "outra" ? estruturada.texto || "" : atual?.texto || ""}
            disabled={desabilitado}
            placeholder="Ex.: a cada turno"
            onChange={(evento) => onChange({ tipo: "outra", texto: evento.target.value })}
          />
        </label>
      )}
      {erro && (
        <span id={idDoErro} className="ui-field-error">
          {erro}
        </span>
      )}
    </div>
  );
}
