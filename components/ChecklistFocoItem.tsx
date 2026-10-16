"use client";

import { useEffect, useRef, useState } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { NavIcon } from "@/components/NavIcons";
import type { ChecklistCriticidade, ChecklistItem, ChecklistStatus } from "@/types";

type Props = {
  item: ChecklistItem;
  posicao: number;
  total: number;
  /** Cabeçalho do ambiente: nome, posição do item dentro dele e progresso. */
  ambienteRotulo: string;
  posAmbiente: number;
  totalAmbiente: number;
  respondidosAmbiente: number;
  podeEditar: boolean;
  temAnterior: boolean;
  temProximo: boolean;
  onStatus: (status: ChecklistStatus) => void;
  onObservacao: (texto: string) => void;
  onGravidade: (gravidade: ChecklistCriticidade) => void;
  onFoto: () => void;
  onAnterior: () => void;
  onProximo: () => void;
};

const NOME_GRAVIDADE: Record<string, string> = { Crítica: "Crítica", Importante: "Importante", Rotina: "Leve" };

// Um item por vez, com botões grandes (Campo e Equilibrado). Usa as mesmas regras do checklist de sempre.
export default function ChecklistFocoItem({ item, posicao, total, ambienteRotulo, posAmbiente, totalAmbiente, respondidosAmbiente, onGravidade, podeEditar, temAnterior, temProximo, onStatus, onObservacao, onFoto, onAnterior, onProximo }: Props) {
  const [texto, setTexto] = useState(item.observacao || "");
  const areaRef = useRef<HTMLTextAreaElement | null>(null);
  const caixaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setTexto(item.observacao || "");
  }, [item.id, item.observacao]);

  const salvarTexto = () => {
    if (podeEditar && texto !== (item.observacao || "")) onObservacao(texto);
  };
  const naoConforme = item.status === "Não Conforme";
  const gravidade = item.criticidade || "Rotina";

  return (
    <div className="chk-foco">
      <div className="chk-foco-amb">
        <div className="chk-foco-amb-top">
          <span className="chk-foco-amb-nome">{ambienteRotulo}</span>
          <span className="chk-foco-amb-pos" aria-label={`Item ${posAmbiente} de ${totalAmbiente} neste ambiente`}>
            {posAmbiente}/{totalAmbiente}
          </span>
        </div>
        <div className="chk-foco-bar" role="img" aria-label={`${respondidosAmbiente} de ${totalAmbiente} respondidos`}>
          <span style={{ width: `${totalAmbiente ? Math.round((respondidosAmbiente / totalAmbiente) * 100) : 0}%` }} />
        </div>
        <span className="chk-foco-count">
          {respondidosAmbiente} de {totalAmbiente} respondidos · item {posicao} de {total} na visita
        </span>
      </div>
      <div className="chk-foco-card">
        <h2 className="chk-foco-title">{item.titulo}</h2>
        {item.orientacao && <p className="chk-foco-hint">{item.orientacao}</p>}
      </div>

      <div className="chk-foco-botoes" role="group" aria-label="Resposta do item">
        <button type="button" disabled={!podeEditar} aria-pressed={item.status === "Conforme"} className={`chk-resp chk-resp--ok${item.status === "Conforme" ? " is-on" : ""}`} onClick={() => onStatus("Conforme")}>
          <span aria-hidden="true">✓</span> Conforme
        </button>
        <button type="button" disabled={!podeEditar} aria-pressed={naoConforme} className={`chk-resp chk-resp--nc${naoConforme ? " is-on" : ""}`} onClick={() => onStatus("Não Conforme")}>
          <span aria-hidden="true">×</span> Não conforme
        </button>
        <button type="button" disabled={!podeEditar} aria-pressed={item.status === "Não se aplica"} className={`chk-resp chk-resp--na${item.status === "Não se aplica" ? " is-on" : ""}`} onClick={() => onStatus("Não se aplica")}>
          <span aria-hidden="true">—</span> Não se aplica
        </button>
      </div>

      <div className="chk-foco-obs" ref={caixaRef}>
        <span className="ui-eyebrow">{naoConforme ? "Registrar a não conformidade" : "Observação (opcional)"}</span>
        <div className="chk-foco-tools">
          <button type="button" className="chk-tool chk-tool--foto" onClick={onFoto}>
            <NavIcon name="registrar" size={20} strokeWidth={1.9} /> Foto
          </button>
          <button
            type="button"
            className="chk-tool chk-tool--ditar"
            disabled={!podeEditar}
            onClick={() => {
              areaRef.current?.focus();
              caixaRef.current?.querySelector<HTMLButtonElement>(".field-assist-voice")?.click();
            }}
          >
            <NavIcon name="microfone" size={20} strokeWidth={1.9} /> Ditar
          </button>
          <button type="button" className="chk-tool chk-tool--digitar" disabled={!podeEditar} onClick={() => areaRef.current?.focus()}>
            <span aria-hidden="true">✎</span> Digitar
          </button>
        </div>
        <span className="ui-field-wrap ui-field-wrap--area">
          <textarea
            ref={areaRef}
            className="ui-input pc-input-tools"
            rows={3}
            value={texto}
            disabled={!podeEditar}
            placeholder="Ex.: termômetro a 9 °C"
            aria-label="Observação do item"
            onChange={(evento) => setTexto(evento.target.value)}
            onBlur={salvarTexto}
          />
          {podeEditar && (
            <span className="ui-field-tools">
              <FieldVoiceTools fieldKey={`checklist-${item.id}`} value={texto} onChange={setTexto} contexto="Observação de um item de checklist de boas práticas em segurança dos alimentos." />
            </span>
          )}
        </span>
        <div className="chk-grav-linha" role="group" aria-label="Gravidade do item">
          <span className="ui-row-sub">Gravidade</span>
          {(["Rotina", "Importante", "Crítica"] as const).map((nivel) => (
            <button
              key={nivel}
              type="button"
              disabled={!podeEditar}
              aria-pressed={gravidade === nivel}
              className={`chk-grav chk-grav--${nivel === "Crítica" ? "nc" : nivel === "Importante" ? "amber" : "na"}${gravidade === nivel ? " is-on" : ""}`}
              onClick={() => onGravidade(nivel)}
            >
              {NOME_GRAVIDADE[nivel]}
            </button>
          ))}
        </div>
      </div>

      <div className="chk-foco-rodape">
        <button type="button" className="ui-btn ui-btn--secondary" disabled={!temAnterior} onClick={() => { salvarTexto(); onAnterior(); }}>
          ← Anterior
        </button>
        <button
          type="button"
          className="ui-btn ui-btn--save"
          disabled={!temProximo}
          onClick={() => {
            salvarTexto();
            onProximo();
          }}
        >
          Salvar e próximo →
        </button>
      </div>
    </div>
  );
}
