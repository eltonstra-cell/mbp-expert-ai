"use client";

import { useState } from "react";
import { Pill, type Tom } from "@/components/ui/Pill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { StatStrip } from "@/components/ui/StatStrip";
import { planoPorDefinir, situacaoDoPlano, type SituacaoPlano } from "@/lib/actionPlan";

export type NcPlano = {
  id: string;
  numero: number;
  titulo: string;
  ambiente: string;
  gravidade: "Crítica" | "Importante" | "Rotina";
  status: "Aberta" | "Em tratamento" | "Resolvida";
  acaoCorretiva: string;
  responsavelAcao: string;
  prazo: string;
  realce: boolean;
};

type Props = {
  empresa: string;
  data: string;
  hoje: string;
  ncs: NcPlano[];
  responsaveis: string[];
  podeEditar: boolean;
  resumo: { semAcao: number; emAndamento: number; atrasadas: number; resolvidas: number };
  onAcao: (id: string, valor: string) => void;
  onResponsavel: (id: string, valor: string) => void;
  onPrazo: (id: string, valor: string) => void;
  onIniciar: (id: string) => void;
  onAplicar: (ids: string[], valores: { responsavel: string; prazo: string }) => void;
  onVoltar: () => void;
  onChecklist: () => void;
};

type Aba = "todas" | "definir" | "andamento" | "resolvidas";

const TOM_SITUACAO: Record<SituacaoPlano, Tom> = {
  Resolvida: "ok",
  Atrasada: "nc",
  "Em andamento": "info",
  "A definir": "amber",
  "Pronta para iniciar": "na",
};
const FAIXA: Record<NcPlano["gravidade"], Tom> = { Crítica: "nc", Importante: "amber", Rotina: "na" };

function dataCurta(iso: string) {
  const [ano, mes, dia] = iso.split("-");
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : iso;
}

export default function PcPlano({
  empresa,
  data,
  hoje,
  ncs,
  responsaveis,
  podeEditar,
  resumo,
  onAcao,
  onResponsavel,
  onPrazo,
  onIniciar,
  onAplicar,
  onVoltar,
  onChecklist,
}: Props) {
  const [aba, setAba] = useState<Aba>("todas");
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [respLote, setRespLote] = useState("");
  const [prazoLote, setPrazoLote] = useState("");

  const abertas = ncs.filter((nc) => nc.status !== "Resolvida");
  const visiveis = ncs.filter((nc) =>
    aba === "todas" ? true : aba === "definir" ? planoPorDefinir(nc) : aba === "andamento" ? nc.status === "Em tratamento" : nc.status === "Resolvida"
  );
  const idsSelecionaveis = abertas.map((nc) => nc.id);
  const ativas = selecionadas.filter((id) => idsSelecionaveis.includes(id));
  const todasMarcadas = idsSelecionaveis.length > 0 && ativas.length === idsSelecionaveis.length;
  const semValores = !respLote.trim() && !prazoLote;

  function alternar(id: string) {
    setSelecionadas((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));
  }

  function aplicar() {
    if (ativas.length === 0 || semValores) return;
    if (!window.confirm(`Aplicar a ${ativas.length} ${ativas.length === 1 ? "não conformidade" : "não conformidades"}?`)) return;
    onAplicar(ativas, { responsavel: respLote, prazo: prazoLote });
    setRespLote("");
    setPrazoLote("");
    setSelecionadas([]);
  }

  return (
    <section className="ui-screen" aria-label="Plano de ação">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Plano de ação</h1>
          <p className="ui-subtitle">
            Quem corrige cada não conformidade, e até quando · {empresa} · {data}
          </p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Central
          </button>
        </div>
      </div>

      <StatStrip
        rotulo="Resumo do plano"
        itens={[
          { rotulo: "Sem ação definida", valor: resumo.semAcao, tom: "amber" },
          { rotulo: "Em andamento", valor: resumo.emAndamento, tom: "brand" },
          { rotulo: "Atrasadas", valor: resumo.atrasadas, tom: "nc" },
          { rotulo: "Resolvidas", valor: resumo.resolvidas, tom: "ok" },
        ]}
      />

      {ncs.length === 0 ? (
        <div className="ui-empty">
          Nenhuma ação necessária. O plano é formado pelas não conformidades da visita.{" "}
          <button type="button" className="pc-link-btn" onClick={onChecklist}>
            Abrir checklist →
          </button>
        </div>
      ) : (
        <>
          {podeEditar && (
            <div className="pc-bulk" role="group" aria-label="Definir para todas as selecionadas">
              <span className="pc-bulk-count">
                {ativas.length} {ativas.length === 1 ? "selecionada" : "selecionadas"}
              </span>
              <span className="pc-bulk-sep" aria-hidden="true">|</span>
              <span className="ui-row-sub">Definir para todas:</span>
              <input
                className="ui-input pc-bulk-input"
                list="pc-plano-responsaveis"
                placeholder="Responsável"
                aria-label="Responsável para todas as selecionadas"
                value={respLote}
                onChange={(evento) => setRespLote(evento.target.value)}
              />
              <datalist id="pc-plano-responsaveis">
                {responsaveis.map((nome) => (
                  <option key={nome} value={nome} />
                ))}
              </datalist>
              <input
                type="date"
                className="ui-input pc-bulk-input"
                aria-label="Prazo para todas as selecionadas"
                value={prazoLote}
                onChange={(evento) => setPrazoLote(evento.target.value)}
              />
              <button type="button" className="ui-btn ui-btn--primary ui-btn--small" disabled={ativas.length === 0 || semValores} onClick={aplicar}>
                Aplicar
              </button>
              <button type="button" className="pc-link-btn pc-bulk-all" onClick={() => setSelecionadas(todasMarcadas ? [] : idsSelecionaveis)}>
                {todasMarcadas ? "Limpar seleção" : "Selecionar todas"}
              </button>
            </div>
          )}

          <div className="ui-toolbar">
            <SegmentedTabs<Aba>
              rotulo="Filtrar plano de ação"
              valor={aba}
              onChange={setAba}
              abas={[
                { id: "todas", rotulo: "Todas", contagem: ncs.length },
                { id: "definir", rotulo: "A definir", contagem: ncs.filter(planoPorDefinir).length, acao: true },
                { id: "andamento", rotulo: "Em andamento", contagem: ncs.filter((nc) => nc.status === "Em tratamento").length },
                { id: "resolvidas", rotulo: "Resolvidas", contagem: ncs.filter((nc) => nc.status === "Resolvida").length },
              ]}
            />
          </div>

          <div className="ui-scroll">
            {visiveis.length === 0 ? (
              <div className="ui-empty">Nenhuma não conformidade neste filtro.</div>
            ) : (
              <div className="ui-list">
                {visiveis.map((nc) => {
                  const resolvida = nc.status === "Resolvida";
                  const situacao = situacaoDoPlano(nc, hoje);
                  const bloqueado = resolvida || !podeEditar;
                  const numero = String(nc.numero).padStart(2, "0");
                  return (
                    <div key={nc.id} className={`ui-row has-strip ui-row--${FAIXA[nc.gravidade]} pc-plan-row${nc.realce ? " is-selected" : ""}${resolvida ? " is-dim" : ""}`}>
                      {podeEditar ? (
                        <input
                          type="checkbox"
                          className="pc-plan-check"
                          aria-label={`Selecionar NC ${numero}`}
                          checked={ativas.includes(nc.id)}
                          disabled={resolvida}
                          onChange={() => alternar(nc.id)}
                        />
                      ) : (
                        <span />
                      )}
                      <div className="pc-plan-id">
                        <div className="ui-row-title">
                          <Pill tom="na">{`NC ${numero}`}</Pill> {nc.titulo}
                        </div>
                        <div className="ui-row-sub">{nc.ambiente}</div>
                      </div>
                      <input
                        className={`pc-plan-field${!nc.acaoCorretiva.trim() ? " is-empty" : ""}`}
                        placeholder="+ Definir ação"
                        aria-label={`Ação corretiva da NC ${numero}`}
                        value={nc.acaoCorretiva}
                        disabled={bloqueado}
                        onChange={(evento) => onAcao(nc.id, evento.target.value)}
                      />
                      <input
                        className={`pc-plan-field${!nc.responsavelAcao.trim() ? " is-empty" : ""}`}
                        list="pc-plano-responsaveis"
                        placeholder="+ Responsável"
                        aria-label={`Responsável da NC ${numero}`}
                        value={nc.responsavelAcao}
                        disabled={bloqueado}
                        onChange={(evento) => onResponsavel(nc.id, evento.target.value)}
                      />
                      <input
                        type="date"
                        className={`pc-plan-field${!nc.prazo ? " is-empty" : ""}`}
                        aria-label={`Prazo da NC ${numero}`}
                        title={nc.prazo ? dataCurta(nc.prazo) : "+ Prazo"}
                        value={nc.prazo}
                        disabled={bloqueado}
                        onChange={(evento) => onPrazo(nc.id, evento.target.value)}
                      />
                      <div className="pc-plan-status">
                        <Pill tom={TOM_SITUACAO[situacao]}>{situacao}</Pill>
                        {podeEditar && situacao === "Pronta para iniciar" && (
                          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onIniciar(nc.id)}>
                            Iniciar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
