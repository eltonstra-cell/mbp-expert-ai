"use client";

import { useState } from "react";
import { ListRow } from "@/components/ui/ListRow";
import { Pill, type Tom } from "@/components/ui/Pill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { StatStrip } from "@/components/ui/StatStrip";

export type NcLinha = {
  id: string;
  numero: number;
  titulo: string;
  ambiente: string;
  item: string;
  referencia: string;
  gravidade: "Crítica" | "Importante" | "Rotina";
  status: "Aberta" | "Em tratamento" | "Resolvida";
  onAcompanhar: () => void;
};

type Props = {
  empresa: string;
  data: string;
  ncs: NcLinha[];
  onPlano: (() => void) | null;
  onVoltar: () => void;
  onChecklist: () => void;
};

type Aba = "todas" | "abertas" | "resolvidas";
type Agrupar = "gravidade" | "ambiente";

const TOM_STATUS: Record<NcLinha["status"], Tom> = { Aberta: "nc", "Em tratamento": "pend", Resolvida: "ok" };
const TOM_GRAVIDADE: Record<NcLinha["gravidade"], Tom> = { Crítica: "nc", Importante: "amber", Rotina: "na" };
const GRUPOS_GRAVIDADE: { chave: NcLinha["gravidade"]; rotulo: string; faixa: Tom }[] = [
  { chave: "Crítica", rotulo: "CRÍTICAS", faixa: "nc" },
  { chave: "Importante", rotulo: "IMPORTANTES", faixa: "amber" },
  { chave: "Rotina", rotulo: "ROTINA", faixa: "na" },
];

export default function PcNcs({ empresa, data, ncs, onPlano, onVoltar, onChecklist }: Props) {
  const [aba, setAba] = useState<Aba>("todas");
  const [agrupar, setAgrupar] = useState<Agrupar>("gravidade");

  const abertas = ncs.filter((nc) => nc.status !== "Resolvida").length;
  const resolvidas = ncs.length - abertas;
  const visiveis = ncs.filter((nc) => (aba === "todas" ? true : aba === "abertas" ? nc.status !== "Resolvida" : nc.status === "Resolvida"));

  const grupos: { rotulo: string; faixa: Tom; itens: NcLinha[] }[] =
    agrupar === "gravidade"
      ? GRUPOS_GRAVIDADE.map((grupo) => ({ rotulo: grupo.rotulo, faixa: grupo.faixa, itens: visiveis.filter((nc) => nc.gravidade === grupo.chave) }))
      : Array.from(new Set(visiveis.map((nc) => nc.ambiente || "Sem ambiente"))).map((ambiente) => ({
          rotulo: ambiente.toLocaleUpperCase("pt-BR"),
          faixa: "info" as Tom,
          itens: visiveis.filter((nc) => (nc.ambiente || "Sem ambiente") === ambiente),
        }));

  return (
    <section className="ui-screen" aria-label="Não conformidades">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Não conformidades</h1>
          <p className="ui-subtitle">
            {empresa} · {data}
          </p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Central
          </button>
          {onPlano && (
            <button type="button" className="ui-btn ui-btn--primary" onClick={onPlano}>
              Ir para o Plano de ação →
            </button>
          )}
        </div>
      </div>

      <StatStrip
        rotulo="Resumo das não conformidades"
        itens={[
          { rotulo: "Total", valor: ncs.length, tom: "na" },
          { rotulo: "Abertas", valor: abertas, tom: "nc" },
          { rotulo: "Resolvidas", valor: resolvidas, tom: "ok" },
        ]}
      />

      {ncs.length === 0 ? (
        <div className="ui-empty">
          Nenhuma não conformidade registrada. Itens marcados como Não Conforme no checklist aparecem aqui automaticamente.{" "}
          <button type="button" className="pc-link-btn" onClick={onChecklist}>
            Abrir checklist →
          </button>
        </div>
      ) : (
        <>
          <div className="ui-toolbar">
            <SegmentedTabs<Aba>
              rotulo="Filtrar não conformidades"
              valor={aba}
              onChange={setAba}
              abas={[
                { id: "todas", rotulo: "Todas", contagem: ncs.length },
                { id: "abertas", rotulo: "Abertas", contagem: abertas },
                { id: "resolvidas", rotulo: "Resolvidas", contagem: resolvidas },
              ]}
            />
            <div className="pc-group-by">
              <span className="ui-row-sub">Agrupar por:</span>
              <SegmentedTabs<Agrupar>
                rotulo="Agrupar por"
                valor={agrupar}
                onChange={setAgrupar}
                abas={[
                  { id: "gravidade", rotulo: "Gravidade" },
                  { id: "ambiente", rotulo: "Ambiente" },
                ]}
              />
            </div>
          </div>

          <div className="ui-scroll">
            {visiveis.length === 0 ? (
              <div className="ui-empty">Nenhuma não conformidade neste filtro.</div>
            ) : (
              grupos
                .filter((grupo) => grupo.itens.length > 0)
                .map((grupo) => (
                  <div key={grupo.rotulo} className="ui-list">
                    <div className="ui-group-title">
                      {grupo.rotulo} · {grupo.itens.length}
                    </div>
                    {grupo.itens.map((nc) => (
                      <ListRow
                        key={nc.id}
                        faixa={grupo.faixa}
                        chip={<Pill tom="na">{`NC ${String(nc.numero).padStart(2, "0")}`}</Pill>}
                        titulo={nc.titulo}
                        secundario={[nc.ambiente, nc.item, nc.referencia].filter(Boolean).join(" · ")}
                        pilulas={
                          <>
                            <Pill tom={TOM_GRAVIDADE[nc.gravidade]}>{nc.gravidade}</Pill>
                            <Pill tom={TOM_STATUS[nc.status]}>{nc.status}</Pill>
                          </>
                        }
                        acao={
                          <button type="button" className="ui-btn ui-btn--secondary" onClick={nc.onAcompanhar}>
                            {nc.status === "Resolvida" ? "Consultar →" : "Acompanhar →"}
                          </button>
                        }
                      />
                    ))}
                  </div>
                ))
            )}
          </div>
        </>
      )}
    </section>
  );
}
