"use client";

import type { CSSProperties, ReactNode } from "react";
import { iniciaisDaEmpresa } from "@/lib/navigation";
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
  /** Cor da empresa. */
  cor?: string;
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
    divergencia?: string | null;
    naoSeAplica: number;
    pendentes: number;
    onContinuar: () => void;
  } | null;
  novaVisita: { texto: string; botao: string; onClick: () => void };
  indicadores: { emAndamento: number; ncAcompanhamento: number; concluidasMes: number; empresasAtivas: number };
  /** "faltam" lista o que ainda não está preenchido; cada um abre a sub-aba da Central onde se resolve. */
  preparacao: { percentual: number; texto: string; faltam: { id: string; titulo: string; onAbrir: () => void }[]; onAbrir: () => void } | null;
  pendencias: { texto: string; onVer: (() => void) | null };
  filtro: "Em andamento" | "Concluída";
  onFiltro: (filtro: "Em andamento" | "Concluída") => void;
  contagemEmAndamento: number;
  contagemConcluidas: number;
  recentes: VisitaRecenteInicio[];
  onAbrirVisita: (id: string) => void;
  /** Início simples: só continuar visita e visitas recentes. */
  simples?: boolean;
  /** Executor de campo: só continuar a visita; sem visita nova nem lista de visitas. */
  somenteCampo?: boolean;
  /** Aviso para o RT: POPs aprovados com norma alterada. */
  avisoPops?: string | null;
  /** Painel "Hoje precisa de você" (só gestor: Administrador, RT, Gestor, Gerente). */
  painel?: ReactNode;
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
  somenteCampo = false,
  avisoPops = null,
  painel = null,
}: Props) {
  return (
    <section className="ui-screen" aria-label="Início">
      <h1 className="sr-only">Início · olá, {nome}</h1>

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
                {continuar.respondidos} de {continuar.total} itens respondidos · {continuar.percentual}%
              </div>
              {continuar.divergencia && <div className="ui-nota-divergencia">{continuar.divergencia}</div>}
            </div>
            <button type="button" className="ui-btn ui-btn--criar" onClick={continuar.onContinuar}>
              Continuar visita →
            </button>
          </>
        ) : (
          <>
            <div className="pc-continue-text">
              <div className="ui-eyebrow">Nenhuma visita em andamento</div>
              <div className="ui-row-sub">{novaVisita.texto}</div>
            </div>
            {!somenteCampo && (
              <button type="button" className="ui-btn ui-btn--criar" onClick={novaVisita.onClick}>
                {novaVisita.botao}
              </button>
            )}
          </>
        )}
      </div>

      {painel}

      {avisoPops && (
        <div className="ui-nota-divergencia pop-aviso-inicio" role="status">
          <span className="pop-revisar">Revisar</span> {avisoPops}
        </div>
      )}

      {!simples && (
      <StatStrip
        rotulo="Indicadores"
        itens={[
          { rotulo: "Visitas em andamento", valor: indicadores.emAndamento, tom: "pend" },
          { rotulo: "Concluídas este mês", valor: indicadores.concluidasMes, tom: "ok" },
          { rotulo: "Empresas ativas", valor: indicadores.empresasAtivas, tom: "brand" },
        ]}
      />
      )}

      {!simples && (
      <div className="pc-two">
        {preparacao && (
          <div className="ui-card pc-card-btn">
            <div className="pc-card-head">
              <span className="ui-eyebrow">Preparação da empresa</span>
              <Pill tom={preparacao.percentual === 100 ? "ok" : "brand"}>{preparacao.percentual}%</Pill>
            </div>
            <div className="ui-row-sub">{preparacao.texto}</div>
            <ProgressBar percentual={preparacao.percentual} rotulo="Preparação da empresa" />
            {preparacao.faltam.length > 0 && (
              <ul className="prep-faltam" aria-label="O que falta">
                {preparacao.faltam.map((item) => (
                  <li key={item.id}>
                    <button type="button" className="pc-link-btn" onClick={item.onAbrir}>
                      {item.titulo} →
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        <div className="ui-card pc-card-btn">
          <div className="pc-card-head">
            <span className="ui-eyebrow">Pendências técnicas · empresa ativa</span>
          </div>
          <div className="ui-row-sub">{pendencias.texto}</div>
          {pendencias.onVer && (
            <button type="button" className="pc-link-btn" onClick={pendencias.onVer}>
              Ver correções
            </button>
          )}
        </div>
      </div>
      )}

      {!somenteCampo && (
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
        <div className="pc-recent-list">
          {recentes.length === 0 && <div className="ui-empty">Nenhuma visita nesta situação.</div>}
          {recentes.map((visita) => (
            <button key={visita.id} type="button" className="pc-recent-row" onClick={() => onAbrirVisita(visita.id)}>
              <span className="emp-avatar-mini" style={{ "--emp-cor": visita.cor || "#4A5D73" } as CSSProperties} aria-hidden="true">
                {iniciaisDaEmpresa(visita.empresa)}
              </span>
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
      )}
    </section>
  );
}
