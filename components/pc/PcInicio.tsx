"use client";

import { useCabem } from "@/components/useFit";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar, SegmentedProgress } from "@/components/ui/ProgressBar";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { StatStrip } from "@/components/ui/StatStrip";

export type VisitaRecenteInicio = {
  id: string;
  empresa: string;
  data: string;
  responsavel: string;
  status: "Em andamento" | "Concluída";
  percentual: number;
};

type Props = {
  nome: string;
  continuar: {
    empresa: string;
    proximaEtapa: string;
    respondidos: number;
    total: number;
    percentual: number;
    conformes: number;
    naoConformes: number;
    naoSeAplica: number;
    pendentes: number;
    onContinuar: () => void;
  } | null;
  novaVisita: { texto: string; botao: string; onClick: () => void };
  indicadores: { emAndamento: number; ncAcompanhamento: number; concluidasMes: number; empresasAtivas: number };
  preparacao: { percentual: number; texto: string; onAbrir: () => void } | null;
  pendencias: { texto: string; onVer: (() => void) | null };
  filtro: "Em andamento" | "Concluída";
  onFiltro: (filtro: "Em andamento" | "Concluída") => void;
  contagemEmAndamento: number;
  contagemConcluidas: number;
  recentes: VisitaRecenteInicio[];
  onAbrirVisita: (id: string) => void;
  /** Início simples: só continuar visita e visitas recentes. */
  simples?: boolean;
  onVerTodas: () => void;
};

export default function PcInicio({
  nome,
  continuar,
  novaVisita,
  indicadores,
  preparacao,
  pendencias,
  filtro,
  onFiltro,
  contagemEmAndamento,
  contagemConcluidas,
  recentes,
  onAbrirVisita,
  onVerTodas,
  simples = false,
}: Props) {
  const recentesFit = useCabem<HTMLDivElement>(48, 4, 1);
  return (
    <section className="ui-screen" aria-label="Início">
      <div className="ui-head">
        <h1 className="ui-title pc-hello">Olá, {nome}</h1>
      </div>

      <div className="ui-card pc-continue">
        {continuar ? (
          <>
            <div className="pc-continue-text">
              <div className="ui-eyebrow">Continue de onde parou</div>
              <div className="pc-continue-company">{continuar.empresa}</div>
              <div className="ui-row-sub">Próxima etapa: {continuar.proximaEtapa}</div>
            </div>
            <div className="pc-continue-progress">
              <SegmentedProgress
                conformes={continuar.conformes}
                naoConformes={continuar.naoConformes}
                naoSeAplica={continuar.naoSeAplica}
                pendentes={continuar.pendentes}
              />
              <div className="ui-row-sub">
                {continuar.respondidos} de {continuar.total} itens · {continuar.percentual}%
              </div>
            </div>
            <button type="button" className="ui-btn ui-btn--primary" onClick={continuar.onContinuar}>
              Continuar visita →
            </button>
          </>
        ) : (
          <>
            <div className="pc-continue-text">
              <div className="ui-eyebrow">Nenhuma visita em andamento</div>
              <div className="ui-row-sub">{novaVisita.texto}</div>
            </div>
            <button type="button" className="ui-btn ui-btn--primary" onClick={novaVisita.onClick}>
              {novaVisita.botao}
            </button>
          </>
        )}
      </div>

      {!simples && (
      <StatStrip
        rotulo="Indicadores"
        itens={[
          { rotulo: "Em andamento", valor: indicadores.emAndamento, tom: "pend" },
          { rotulo: "Não conformidades em acompanhamento", valor: indicadores.ncAcompanhamento, tom: "nc", detalhe: "em todas as empresas" },
          { rotulo: "Concluídas este mês", valor: indicadores.concluidasMes, tom: "ok" },
          { rotulo: "Empresas ativas", valor: indicadores.empresasAtivas, tom: "brand" },
        ]}
      />
      )}

      {!simples && (
      <div className="pc-two">
        {preparacao && (
          <button type="button" className="ui-card pc-card-btn" onClick={preparacao.onAbrir}>
            <div className="pc-card-head">
              <span className="ui-eyebrow">Preparação da empresa</span>
              <Pill tom={preparacao.percentual === 100 ? "ok" : "brand"}>{preparacao.percentual}%</Pill>
            </div>
            <div className="ui-row-sub">{preparacao.texto}</div>
            <ProgressBar percentual={preparacao.percentual} rotulo="Preparação da empresa" />
          </button>
        )}
        <div className="ui-card pc-card-btn">
          <div className="pc-card-head">
            <span className="ui-eyebrow">Pendências técnicas · empresa ativa</span>
          </div>
          <div className="ui-row-sub">{pendencias.texto}</div>
          {pendencias.onVer && (
            <button type="button" className="pc-link-btn" onClick={pendencias.onVer}>
              Ver não conformidades →
            </button>
          )}
        </div>
      </div>
      )}

      <div className="ui-card pc-recent">
        <div className="ui-head">
          <div>
            <div className="ui-eyebrow">Acompanhamento</div>
            <h2 className="ui-card-title">Visitas recentes</h2>
          </div>
          <SegmentedTabs
            rotulo="Situação das visitas"
            valor={filtro}
            onChange={onFiltro}
            abas={[
              { id: "Em andamento", rotulo: "Em andamento", contagem: contagemEmAndamento },
              { id: "Concluída", rotulo: "Concluídas", contagem: contagemConcluidas },
            ]}
          />
        </div>
        <div className="pc-recent-list" ref={recentesFit.ref}>
          {recentes.length === 0 && <div className="ui-empty">Nenhuma visita nesta situação.</div>}
          {recentes.slice(0, recentesFit.quantos).map((visita) => (
            <button key={visita.id} type="button" className="pc-recent-row" onClick={() => onAbrirVisita(visita.id)}>
              <span className="pc-recent-main">
                <span className="pc-recent-title">{visita.empresa}</span>
                <span className="ui-row-sub">
                  {visita.data} · {visita.responsavel}
                </span>
              </span>
              <ProgressBar percentual={visita.percentual} largura={110} rotulo={`${visita.percentual}% concluída`} />
              <Pill tom={visita.status === "Concluída" ? "ok" : "pend"}>{visita.status}</Pill>
              <span aria-hidden="true">›</span>
            </button>
          ))}
        </div>
        <button type="button" className="pc-link-btn" onClick={onVerTodas}>
          Ver todas as visitas →
        </button>
      </div>
    </section>
  );
}
