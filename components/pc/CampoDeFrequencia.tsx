"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
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
  const botoes = useRef<(HTMLButtonElement | null)[]>([]);
  const [outraTocada, setOutraTocada] = useState(false);
  const textoDaOutra = estruturada?.tipo === "outra" ? estruturada.texto || "" : atual?.texto || "";
  const erroDaOutra = tipo === "outra" && outraTocada && !textoDaOutra.trim() ? "Informe qual é a frequência." : "";
  const idDoErroDaOutra = useId();

  function escolher(alvo: TipoDeFrequencia) {
    if (tipo === alvo) return;
    onChange(alvo === "outra" ? { tipo: "outra", texto: atual?.tipo === "outra" ? atual.texto || "" : "" } : { tipo: alvo });
  }

  // Setas, Home e End movem a escolha dentro do grupo (só a opção escolhida entra na ordem do Tab).
  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (desabilitado) return;
    const tipos = OPCOES_DE_FREQUENCIA.map((opcao) => opcao.tipo);
    const posicao = Math.max(0, tipos.indexOf(tipo as TipoDeFrequencia));
    let destino = -1;
    if (evento.key === "ArrowRight" || evento.key === "ArrowDown") destino = (posicao + 1) % tipos.length;
    else if (evento.key === "ArrowLeft" || evento.key === "ArrowUp") destino = (posicao - 1 + tipos.length) % tipos.length;
    else if (evento.key === "Home") destino = 0;
    else if (evento.key === "End") destino = tipos.length - 1;
    if (destino < 0) return;
    evento.preventDefault();
    escolher(tipos[destino]);
    botoes.current[destino]?.focus();
  }

  return (
    <div className="freq-campo">
      <div className="pc-field" role="radiogroup" aria-label="Frequência" aria-invalid={Boolean(erro)} aria-describedby={erro ? idDoErro : undefined}>
        <span className="ui-eyebrow">Frequência</span>
        <div className="freq-grade" onKeyDown={aoTeclar}>
          {OPCOES_DE_FREQUENCIA.map((opcao, posicao) => (
            <button
              key={opcao.tipo}
              ref={(elemento) => {
                botoes.current[posicao] = elemento;
              }}
              tabIndex={tipo === opcao.tipo || (!tipo && posicao === 0) ? 0 : -1}
              type="button"
              role="radio"
              aria-checked={tipo === opcao.tipo}
              disabled={desabilitado}
              className={`freq-opcao${tipo === opcao.tipo ? " is-escolhida" : ""}${erro && !tipo ? " is-invalid" : ""}`}
              onClick={() => escolher(opcao.tipo)}
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
            className={`ui-input${erroDaOutra ? " is-invalid" : ""}`}
            value={textoDaOutra}
            disabled={desabilitado}
            placeholder="Ex.: a cada turno"
            maxLength={120}
            aria-invalid={Boolean(erroDaOutra)}
            aria-describedby={erroDaOutra ? idDoErroDaOutra : undefined}
            onBlur={() => setOutraTocada(true)}
            onChange={(evento) => {
              setOutraTocada(true);
              onChange({ tipo: "outra", texto: evento.target.value });
            }}
          />
          {erroDaOutra && <span id={idDoErroDaOutra} className="ui-field-error" role="alert">{erroDaOutra}</span>}
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
