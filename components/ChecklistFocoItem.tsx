"use client";

import { useEffect, useRef, useState } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { NavIcon } from "@/components/NavIcons";
import { estadosDosBotoes, gravidadeSugerida } from "@/lib/checklistUi";
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
  /** No PC o ambiente aparece nas abas, então o cabeçalho do ambiente não se repete aqui. */
  semCabecalhoDeAmbiente?: boolean;
  /** Mostra "O que verificar" e "Base legal" abaixo da observação (no PC eles ficam no painel de apoio). */
  mostrarApoio?: boolean;
  /** Destaque rápido do item (ao chegar por "Ver no checklist"). */
  destaque?: boolean;
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
const CLASSE_GRAVIDADE: Record<string, string> = { Crítica: "nc", Importante: "amber", Rotina: "leve" };

// Um item por vez, com botões de resposta, gravidade (só se não conforme) e observação.
export default function ChecklistFocoItem({
  item,
  posicao,
  total,
  ambienteRotulo,
  posAmbiente,
  totalAmbiente,
  respondidosAmbiente,
  semCabecalhoDeAmbiente = false,
  mostrarApoio = true,
  destaque = false,
  podeEditar,
  temAnterior,
  temProximo,
  onStatus,
  onObservacao,
  onGravidade,
  onFoto,
  onAnterior,
  onProximo,
}: Props) {
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
  const sugerida = gravidadeSugerida(item);
  const estados = estadosDosBotoes(item.status);

  return (
    <div className="chk-foco">
      {!semCabecalhoDeAmbiente && (
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
      )}
      <div className={`chk-foco-card${destaque ? " is-destaque" : ""}`}>
        <h2 className="chk-foco-title">{item.titulo}</h2>
      </div>

      <div className="chk-foco-botoes" role="group" aria-label="Resposta do item">
        {(
          [
            ["Conforme", "ok", "Conforme", "✓"],
            ["Não Conforme", "nc", "Não conforme", "×"],
            ["Não se aplica", "na", "Não se aplica", "—"],
          ] as [ChecklistStatus, string, string, string][]
        ).map(([resposta, tom, rotulo, simbolo]) => {
          const estado = estados[resposta as "Conforme" | "Não Conforme" | "Não se aplica"];
          return (
            <button
              key={resposta}
              type="button"
              disabled={!podeEditar}
              aria-pressed={estado === "marcado"}
              className={`chk-resp chk-resp--${tom} is-${estado}`}
              onClick={() => onStatus(resposta)}
            >
              <span aria-hidden="true">{estado === "marcado" ? "✓" : simbolo}</span>
              <span>{rotulo}</span>
            </button>
          );
        })}
      </div>

      {naoConforme && (
        <div className="chk-grav-bloco" role="group" aria-label="Quão grave é?">
          <span className="chk-grav-titulo">Quão grave é?</span>
          <div className="chk-grav-linha">
            {(["Rotina", "Importante", "Crítica"] as const).map((nivel) => (
              <button
                key={nivel}
                type="button"
                disabled={!podeEditar}
                aria-pressed={gravidade === nivel}
                className={`chk-grav chk-grav--${CLASSE_GRAVIDADE[nivel]}${gravidade === nivel ? " is-on" : ""}`}
                onClick={() => onGravidade(nivel)}
              >
                {NOME_GRAVIDADE[nivel]}
                {sugerida === nivel && <span className="chk-grav-sug">sugerida</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="chk-foco-obs" ref={caixaRef}>
        <span className="ui-eyebrow">{naoConforme ? "Registrar a não conformidade" : "Observação (opcional)"}</span>
        <div className="chk-foco-tools">
          <button type="button" className="chk-tool chk-tool--foto" onClick={onFoto}>
            <NavIcon name="registrar" size={18} strokeWidth={1.9} /> Foto
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
            <NavIcon name="microfone" size={18} strokeWidth={1.9} /> Ditar
          </button>
          <button type="button" className="chk-tool chk-tool--digitar" disabled={!podeEditar} onClick={() => areaRef.current?.focus()}>
            <span aria-hidden="true">✎</span> Digitar
          </button>
        </div>
        <textarea
          ref={areaRef}
          className="ui-input chk-obs-area"
          value={texto}
          disabled={!podeEditar}
          placeholder="Ex.: termômetro a 9 °C"
          aria-label="Observação do item"
          onChange={(evento) => setTexto(evento.target.value)}
          onBlur={salvarTexto}
        />
        {podeEditar && (
          <div className="chk-obs-voz">
            <FieldVoiceTools fieldKey={`checklist-${item.id}`} value={texto} onChange={setTexto} contexto="Observação de um item de checklist de boas práticas em segurança dos alimentos." />
          </div>
        )}
      </div>

      {mostrarApoio && (item.orientacao || item.referencia) && (
        <div className="chk-foco-apoio">
          {item.orientacao && (
            <section className="chk-foco-apoio-card chk-foco-apoio-card--azul">
              <h3 className="chk-apoio-titulo">O que verificar</h3>
              <p className="chk-apoio-texto">{item.orientacao}</p>
            </section>
          )}
          {item.referencia && (
            <section className="chk-foco-apoio-card chk-foco-apoio-card--ambar">
              <h3 className="chk-apoio-titulo">Base legal</h3>
              <p className="chk-apoio-texto">{item.referencia}</p>
            </section>
          )}
        </div>
      )}

      <div className="chk-foco-rodape">
        <button
          type="button"
          className="ui-btn ui-btn--secondary"
          disabled={!temAnterior}
          onClick={() => {
            salvarTexto();
            onAnterior();
          }}
        >
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
