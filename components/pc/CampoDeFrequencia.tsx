"use client";

import { useId } from "react";
import Select from "@/components/Select";
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
      <label className="pc-field">
        <span className="ui-eyebrow">Frequência</span>
        <Select
          className={`ui-input ui-input--lista${erro ? " is-invalid" : ""}`}
          value={tipo}
          disabled={desabilitado}
          aria-invalid={Boolean(erro)}
          aria-describedby={erro ? idDoErro : undefined}
          onChange={(evento) => {
            const novo = evento.target.value as TipoDeFrequencia | "";
            if (!novo) onChange(null);
            else onChange(novo === "outra" ? { tipo: "outra", texto: atual?.tipo === "outra" ? atual.texto || "" : "" } : { tipo: novo });
          }}
        >
          <option value="">Escolha a frequência</option>
          {OPCOES_DE_FREQUENCIA.map((opcao) => (
            <option key={opcao.tipo} value={opcao.tipo}>
              {opcao.rotulo}
            </option>
          ))}
        </Select>
      </label>
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
