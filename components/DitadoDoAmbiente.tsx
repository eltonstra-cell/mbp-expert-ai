"use client";

import { useState } from "react";
import Select from "@/components/Select";
import { useIaPermitida } from "@/components/IaPermissionContext";
import { useOnline } from "@/components/useOnline";
import { useVoiceCapture } from "@/components/useVoiceCapture";
import { LIMITES_DE_TEMPERATURA, limiteDoTipo, textoDoLimite } from "@/lib/limitesDeTemperatura";
import { interpretarDitadoDoAmbiente, propostaCompleta, type PropostaDeVoz } from "@/lib/vozDoAmbiente";
import type { ChecklistItem, ChecklistStatus } from "@/types";

type Props = {
  ambienteRotulo: string;
  /** Itens do ambiente em que o RT está. */
  itens: ChecklistItem[];
  equipamentos: string[];
  /** Recebe só as propostas que o RT confirmou (item e resposta definidos). */
  onGravar: (propostas: PropostaDeVoz[]) => void;
};

const RESPOSTAS: ChecklistStatus[] = ["Conforme", "Não Conforme", "Não se aplica"];

// "Ditar o ambiente": fala ou digita; o app PROPÕE respostas e o RT confere, edita ou remove antes de gravar. Nada grava sozinho.
export default function DitadoDoAmbiente({ ambienteRotulo, itens, equipamentos, onGravar }: Props) {
  const iaPermitida = useIaPermitida();
  const online = useOnline();
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [propostas, setPropostas] = useState<PropostaDeVoz[] | null>(null);
  const [marcadas, setMarcadas] = useState<Record<string, boolean>>({});

  const voz = useVoiceCapture({
    limiteMs: 20000,
    onTexto: (falado) => {
      setTexto(falado);
      conferir(falado);
    },
  });

  function conferir(origem: string) {
    const lista = interpretarDitadoDoAmbiente(origem, itens, equipamentos);
    setPropostas(lista);
    setMarcadas(Object.fromEntries(lista.map((p) => [p.id, propostaCompleta(p)])));
  }

  function mudar(id: string, parte: Partial<PropostaDeVoz>) {
    setPropostas((atual) => (atual || []).map((p) => (p.id === id ? { ...p, ...parte } : p)));
  }

  function fechar() {
    voz.cancelar();
    setAberto(false);
    setPropostas(null);
    setTexto("");
  }

  const prontas = (propostas || []).filter((p) => marcadas[p.id] && propostaCompleta(p));

  return (
    <>
      <button type="button" className="pc-link-btn" onClick={() => setAberto(true)}>
        Ditar o ambiente
      </button>
      {aberto && (
        <div className="voz-revisao-camada" role="dialog" aria-modal="true" aria-label={`Ditar ${ambienteRotulo}`}>
          <button type="button" className="voz-revisao-fundo" aria-label="Fechar" onClick={fechar} />
          <div className="voz-revisao voz-ambiente">
            <h2 className="ui-card-title">Ditar {ambienteRotulo}</h2>
            <p className="ui-row-sub">
              Diga, por exemplo: “câmara fria, sete graus, piso com sujidade”. Não cite nome de pessoas. O app propõe e você confere antes de gravar.
            </p>
            <div className="voz-ambiente-entrada">
              {iaPermitida && (
                <button type="button" className="ui-btn ui-btn--secondary" disabled={!online || voz.estado === "transcrevendo"} onClick={() => (voz.estado === "ouvindo" ? voz.parar() : void voz.iniciar())}>
                  {voz.estado === "ouvindo" ? "Parar" : voz.estado === "transcrevendo" ? "Transcrevendo…" : online ? "Falar" : "Sem sinal: digite"}
                </button>
              )}
              <textarea className="ui-input" rows={2} value={texto} onChange={(evento) => setTexto(evento.target.value)} placeholder="Ou digite aqui" aria-label="Texto do ditado" />
              <button type="button" className="ui-btn ui-btn--secondary" disabled={!texto.trim()} onClick={() => conferir(texto)}>
                Propor respostas
              </button>
            </div>
            {voz.erro && <p className="ui-field-error">{voz.erro}</p>}
            {propostas && propostas.length === 0 && <p className="ui-row-sub">Não entendi nenhum item. Tente de novo ou responda direto no checklist.</p>}
            {propostas && propostas.length > 0 && (
              <ul className="voz-ambiente-lista">
                {propostas.map((p) => {
                  const limite = limiteDoTipo(p.temperatura?.limiteId);
                  return (
                    <li key={p.id} className="voz-ambiente-linha">
                      <label className="voz-ambiente-marca">
                        <input type="checkbox" checked={Boolean(marcadas[p.id])} disabled={!propostaCompleta(p)} onChange={(evento) => setMarcadas((atual) => ({ ...atual, [p.id]: evento.target.checked }))} />
                        <span>“{p.falado}”</span>
                      </label>
                      <div className="voz-ambiente-campos">
                        <Select value={p.itemId || ""} onChange={(evento) => mudar(p.id, { itemId: evento.target.value || null })} aria-label="Item">
                          <option value="">Escolher o item</option>
                          {itens.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.titulo.length > 60 ? `${item.titulo.slice(0, 60)}…` : item.titulo}
                            </option>
                          ))}
                        </Select>
                        <Select value={p.status || ""} onChange={(evento) => mudar(p.id, { status: (evento.target.value || null) as ChecklistStatus | null })} aria-label="Resposta">
                          <option value="">Escolher a resposta</option>
                          {RESPOSTAS.map((resposta) => (
                            <option key={resposta} value={resposta}>
                              {resposta === "Não Conforme" ? "Não conforme" : resposta}
                            </option>
                          ))}
                        </Select>
                      </div>
                      {p.temperatura && limite && (
                        <p className="ui-row-sub">
                          {String(p.temperatura.valor).replace(".", ",")} °C · limite {textoDoLimite(limite)} ({limite.norma}, item {limite.itens})
                        </p>
                      )}
                      {p.temperatura === undefined && p.itemId && LIMITES_DE_TEMPERATURA.length > 0 && /grau|°/i.test(p.falado) && <p className="ui-row-sub">Sem limite para este equipamento: escolha a resposta você mesmo.</p>}
                      {p.status === "Não Conforme" && (
                        <input className="ui-input" value={p.observacao} onChange={(evento) => mudar(p.id, { observacao: evento.target.value })} aria-label="Observação" placeholder="Observação" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="voz-revisao-acoes">
              <button type="button" className="ui-btn ui-btn--secondary" onClick={fechar}>
                Cancelar
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--save"
                disabled={prontas.length === 0}
                onClick={() => {
                  onGravar(prontas);
                  fechar();
                }}
              >
                Gravar {prontas.length > 0 ? prontas.length : ""} {prontas.length === 1 ? "item" : "itens"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
