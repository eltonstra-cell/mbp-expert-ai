"use client";

import { nomeDeExibicaoDoAmbiente } from "@/lib/checklistEnvs";

import { useState } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { Pill, type Tom } from "@/components/ui/Pill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { StatStrip } from "@/components/ui/StatStrip";

type StatusNc = "Aberta" | "Em tratamento" | "Resolvida";

export type NcAcompanhamento = {
  id: string;
  numero: number;
  titulo: string;
  ambiente: string;
  gravidade: "Crítica" | "Importante" | "Rotina";
  status: StatusNc;
  vencida: boolean;
  acaoCorretiva: string;
  responsavel: string;
  prazo: string;
  resolvidaEm: string;
  evidencias: { id: string; tipo: string; nome: string; quando: string; url: string }[];
  historico: { id: string; quando: string; status: StatusNc; observacao: string }[];
  texto: string;
  statusEscolhido: StatusNc;
};

type Props = {
  empresa: string;
  data: string;
  ncs: NcAcompanhamento[];
  podeAcompanhar: boolean;
  podeEvidenciar: boolean;
  onTexto: (id: string, valor: string) => void;
  onStatus: (id: string, status: StatusNc) => void;
  onRegistrar: (id: string) => void;
  onAdicionarEvidencia: (id: string) => void;
  onPlano: (id: string) => void;
  onVoltar: () => void;
};

type Aba = "todas" | "abertas" | "tratamento" | "resolvidas" | "vencidas";

const FAIXA: Record<NcAcompanhamento["gravidade"], Tom> = { Crítica: "nc", Importante: "amber", Rotina: "na" };
const TOM_STATUS: Record<StatusNc, Tom> = { Aberta: "nc", "Em tratamento": "pend", Resolvida: "ok" };
const PASSOS: StatusNc[] = ["Aberta", "Em tratamento", "Resolvida"];

function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

function Pontos({ status }: { status: StatusNc }) {
  const atual = PASSOS.indexOf(status);
  return (
    <span className="pc-dots" role="img" aria-label={`Etapa: ${status}`}>
      {PASSOS.map((passo, indice) => (
        <span key={passo} className={`pc-dot${indice <= atual ? " is-on" : ""}`} />
      ))}
    </span>
  );
}

export default function PcAcompanhamento({
  empresa,
  data,
  ncs,
  podeAcompanhar,
  podeEvidenciar,
  onTexto,
  onStatus,
  onRegistrar,
  onAdicionarEvidencia,
  onPlano,
  onVoltar,
}: Props) {
  const [aba, setAba] = useState<Aba>("todas");
  const [escolhidaId, setEscolhidaId] = useState("");

  const abertas = ncs.filter((nc) => nc.status === "Aberta").length;
  const tratamento = ncs.filter((nc) => nc.status === "Em tratamento").length;
  const resolvidas = ncs.filter((nc) => nc.status === "Resolvida").length;
  const vencidas = ncs.filter((nc) => nc.vencida).length;

  const visiveis = ncs
    .filter((nc) =>
      aba === "todas" ? true : aba === "abertas" ? nc.status === "Aberta" : aba === "tratamento" ? nc.status === "Em tratamento" : aba === "resolvidas" ? nc.status === "Resolvida" : nc.vencida
    )
    .sort((a, b) => {
      if (a.status === "Resolvida" && b.status !== "Resolvida") return 1;
      if (a.status !== "Resolvida" && b.status === "Resolvida") return -1;
      return (a.prazo || "9999-12-31").localeCompare(b.prazo || "9999-12-31");
    });
  const selecionada = visiveis.find((nc) => nc.id === escolhidaId) || visiveis[0];

  return (
    <section className="ui-screen" aria-label="Acompanhamento das correções">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Acompanhamento</h1>
          <p className="ui-subtitle">
            Depois da visita: como andam as correções · {empresa} · {data}
          </p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Central
          </button>
        </div>
      </div>

      <StatStrip
        rotulo="Resumo do acompanhamento"
        itens={[
          { rotulo: "Abertas", valor: abertas, tom: "nc" },
          { rotulo: "Em tratamento", valor: tratamento, tom: "pend" },
          { rotulo: "Resolvidas", valor: resolvidas, tom: "ok" },
          { rotulo: "Vencidas", valor: vencidas, tom: "nc" },
        ]}
      />

      {ncs.length === 0 ? (
        <div className="ui-empty">Nenhuma ação para acompanhar. As não conformidades da visita aparecerão aqui.</div>
      ) : (
        <div className="pc-master">
          <div className="pc-master-list">
            <SegmentedTabs<Aba>
              rotulo="Filtrar acompanhamento"
              valor={aba}
              onChange={setAba}
              abas={[
                { id: "todas", rotulo: "Todas", contagem: ncs.length },
                { id: "abertas", rotulo: "Abertas", contagem: abertas },
                { id: "tratamento", rotulo: "Em tratamento", contagem: tratamento },
                { id: "resolvidas", rotulo: "Resolvidas", contagem: resolvidas },
                { id: "vencidas", rotulo: "Vencidas", contagem: vencidas, acao: true },
              ]}
            />
            <div className="ui-scroll">
              {visiveis.length === 0 ? (
                <div className="ui-empty">Nenhuma não conformidade neste filtro.</div>
              ) : (
                <div className="ui-list">
                  {visiveis.map((nc) => (
                    <button
                      key={nc.id}
                      type="button"
                      className={`ui-row has-strip ui-row--${FAIXA[nc.gravidade]} pc-master-row${selecionada?.id === nc.id ? " is-selected" : ""}`}
                      aria-pressed={selecionada?.id === nc.id}
                      onClick={() => setEscolhidaId(nc.id)}
                    >
                      <span className="pc-master-text">
                        <span className="ui-row-title-text">
                          NC {String(nc.numero).padStart(2, "0")} · {nc.titulo}
                        </span>
                        <span className="ui-row-sub">{nomeDeExibicaoDoAmbiente(nc.ambiente)}</span>
                      </span>
                      <Pontos status={nc.status} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="ui-card pc-detail">
            {selecionada ? (
              <div className="ui-scroll pc-detail-scroll">
                <div className="pc-ev-pills">
                  <Pill tom="na">{`NC ${String(selecionada.numero).padStart(2, "0")}`}</Pill>
                  <Pill tom={FAIXA[selecionada.gravidade]}>{selecionada.gravidade}</Pill>
                  <Pill tom={TOM_STATUS[selecionada.status]}>{selecionada.status}</Pill>
                  {selecionada.vencida && <Pill tom="nc">Vencida</Pill>}
                </div>
                <h2 className="pc-detail-title">{selecionada.titulo}</h2>
                <p className="ui-row-sub">{nomeDeExibicaoDoAmbiente(selecionada.ambiente)}</p>

                <div className="pc-detail-fields">
                  <div className={`pc-detail-field${selecionada.responsavel ? "" : " is-empty"}`}>
                    <span className="ui-eyebrow">Responsável</span>
                    <span>{selecionada.responsavel || "Não definido"}</span>
                  </div>
                  <div className={`pc-detail-field${selecionada.prazo ? "" : " is-empty"}`}>
                    <span className="ui-eyebrow">Prazo</span>
                    <span>{selecionada.prazo ? dataCurta(selecionada.prazo) : "Sem prazo"}</span>
                  </div>
                  <div className={`pc-detail-field pc-detail-field--wide${selecionada.acaoCorretiva ? "" : " is-empty"}`}>
                    <span className="ui-eyebrow">Ação corretiva</span>
                    <span>{selecionada.acaoCorretiva || "Ainda não definida."}</span>
                    {(!selecionada.acaoCorretiva || !selecionada.responsavel || !selecionada.prazo) && podeAcompanhar && selecionada.status !== "Resolvida" && (
                      <button type="button" className="pc-link-btn" onClick={() => onPlano(selecionada.id)}>
                        Definir no Plano de ação →
                      </button>
                    )}
                  </div>
                </div>

                <div className="ui-head">
                  <div className="ui-eyebrow">Evidências da correção</div>
                  {podeEvidenciar && (
                    <button type="button" className="pc-orange-btn" onClick={() => onAdicionarEvidencia(selecionada.id)}>
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z" />
                        <circle cx="12" cy="13" r="3.4" />
                      </svg>
                      Adicionar
                    </button>
                  )}
                </div>
                {selecionada.evidencias.length === 0 ? (
                  <p className="ui-row-sub">Nenhuma evidência vinculada a esta não conformidade.</p>
                ) : (
                  <div className="pc-detail-evs">
                    {selecionada.evidencias.slice(0, 6).map((ev) => (
                      <a key={ev.id} href={ev.url} target="_blank" rel="noreferrer" className="pc-detail-ev">
                        {ev.tipo === "Foto" ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={ev.url} alt={ev.nome} />
                        ) : (
                          <span className="pc-detail-ev-audio">Áudio</span>
                        )}
                        <span className="ui-row-sub">{ev.quando}</span>
                      </a>
                    ))}
                  </div>
                )}

                {podeAcompanhar && (
                  <div className="pc-update">
                    <div className="ui-eyebrow">{selecionada.status === "Resolvida" ? "Registrar nova atualização / reabrir" : "Registrar atualização"}</div>
                    <span className="ui-field-wrap ui-field-wrap--area">
                      <textarea
                        className="ui-input pc-input-tools"
                        rows={3}
                        value={selecionada.texto}
                        onChange={(evento) => onTexto(selecionada.id, evento.target.value)}
                        placeholder="Ex.: piso comprado; aguardando instalação; correção concluída..."
                        aria-label="Texto da atualização"
                      />
                      <span className="ui-field-tools">
                        <FieldVoiceTools
                          fieldKey={`atualizacao-${selecionada.id}`}
                          value={selecionada.texto}
                          onChange={(valor) => onTexto(selecionada.id, valor)}
                          contexto="Atualização de acompanhamento de uma não conformidade em segurança dos alimentos."
                        />
                      </span>
                    </span>
                    <div className="pc-status-buttons" role="group" aria-label="Situação da não conformidade">
                      {PASSOS.map((passo) => (
                        <button
                          key={passo}
                          type="button"
                          aria-pressed={selecionada.statusEscolhido === passo}
                          className={`pc-status-btn${selecionada.statusEscolhido === passo ? " is-on" : ""}`}
                          onClick={() => onStatus(selecionada.id, passo)}
                        >
                          {passo}
                        </button>
                      ))}
                    </div>
                    {selecionada.statusEscolhido === "Resolvida" && selecionada.status !== "Resolvida" && (
                      <div className="ui-note">Para concluir, é necessário ter pelo menos uma evidência vinculada.</div>
                    )}
                    <button type="button" className="ui-btn ui-btn--save pc-self-start" onClick={() => onRegistrar(selecionada.id)}>
                      {selecionada.statusEscolhido === "Resolvida" && selecionada.status !== "Resolvida" ? "Concluir e registrar" : "Registrar atualização"}
                    </button>
                  </div>
                )}

                {selecionada.historico.length > 0 && (
                  <div className="pc-history">
                    <div className="ui-eyebrow">Histórico · {selecionada.historico.length} {selecionada.historico.length === 1 ? "registro" : "registros"}</div>
                    {selecionada.historico.map((item) => (
                      <div key={item.id} className="pc-history-item">
                        <div className="pc-ev-pills">
                          <Pill tom={TOM_STATUS[item.status]}>{item.status}</Pill>
                          <span className="ui-row-sub">{item.quando}</span>
                        </div>
                        <div className="pc-history-text">{item.observacao}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="ui-empty">Selecione uma não conformidade.</div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
