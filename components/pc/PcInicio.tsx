"use client";

import type { ReactNode } from "react";
import { SegmentedProgress } from "@/components/ui/ProgressBar";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { linhaDaVisita, resumoDeVisitasRecentes, textoDasParadas, textoDeProgresso } from "@/lib/inicio";

export type VisitaRecenteInicio = {
  id: string;
  numero?: number;
  data: string;
  responsavel: string;
  /** Só aparece com "Todas as empresas" ligada. */
  empresa?: string;
  percentual: number;
  respondidos: number;
  total: number;
};

type Props = {
  nome: string;
  continuar: {
    numero?: number;
    data: string;
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
  /** Linha discreta "Configuração da empresa: X de Y · faltam …"; some quando tudo está completo. */
  configuracao: { feitos: number; total: number; faltam: { id: string; titulo: string; onAbrir: () => void }[]; onGuia: () => void } | null;
  /** "Continuar de onde parei": as últimas telas abertas (só rótulo e destino; sem nome de pessoa). */
  retomar?: { chave: string; rotulo: string; onAbrir: () => void }[];
  /** Painel "Hoje precisa de você" (só gestor). */
  painel?: ReactNode;
  /** Aviso para o RT: POPs aprovados com norma alterada. */
  avisoPops?: string | null;
  visitasRecentes: {
    aberto: boolean;
    onAlternar: () => void;
    filtro: "Em andamento" | "Concluída";
    onFiltro: (filtro: "Em andamento" | "Concluída") => void;
    contagemEmAndamento: number;
    contagemConcluidas: number;
    linhas: VisitaRecenteInicio[];
    paradas: number;
    onEncerrarOuArquivar: () => void;
    /** Só quando há mais de uma empresa visível. */
    podeTodasAsEmpresas: boolean;
    todasAsEmpresas: boolean;
    onTodasAsEmpresas: (ligada: boolean) => void;
    onAbrirVisita: (id: string) => void;
    onVerTodas: () => void;
  };
  /** Início simples: só continuar visita e visitas recentes. */
  simples?: boolean;
  /** Executor de campo: só continuar a visita; sem visita nova nem lista de visitas. */
  somenteCampo?: boolean;
};

const LINHAS_RECENTES = 5;

// Início (PC) em 4 blocos: barra do topo (fora daqui), cartão único "Continuar visita", "Hoje precisa de você" e "Visitas recentes" recolhível.
export default function PcInicio({ nome, continuar, novaVisita, configuracao, retomar = [], painel = null, avisoPops = null, visitasRecentes, simples = false, somenteCampo = false }: Props) {
  const recentes = visitasRecentes;
  return (
    <section className="ui-screen ini" aria-label="Início">
      <h1 className="sr-only">Início · olá, {nome}</h1>

      <div className="ui-card ini-continuar">
        <div className="ini-continuar-linha">
          {continuar ? (
            <>
              <div className="ini-continuar-texto">
                <div className="ini-continuar-titulo">{linhaDaVisita(continuar.numero, continuar.data)}</div>
                <div className="ui-row-sub">Próxima etapa: {continuar.proximaEtapa}</div>
              </div>
              <div className="ini-continuar-progresso">
                {continuar.total > 0 && (
                  <SegmentedProgress conformes={continuar.conformes} naoConformes={continuar.naoConformes} naoSeAplica={continuar.naoSeAplica} pendentes={continuar.pendentes} />
                )}
                <div className="ui-row-sub">
                  {textoDeProgresso(continuar.respondidos, continuar.total)}
                  {continuar.total > 0 ? ` · ${continuar.percentual}%` : ""}
                </div>
                {continuar.divergencia && <div className="ui-nota-divergencia">{continuar.divergencia}</div>}
              </div>
              <button type="button" className="ui-btn ui-btn--primary" onClick={continuar.onContinuar}>
                Continuar visita →
              </button>
            </>
          ) : (
            <>
              <div className="ini-continuar-texto">
                <div className="ini-continuar-titulo">Nenhuma visita em andamento</div>
                <div className="ui-row-sub">{novaVisita.texto}</div>
              </div>
              {!somenteCampo && (
                <button type="button" className="ui-btn ui-btn--primary" onClick={novaVisita.onClick}>
                  {novaVisita.botao}
                </button>
              )}
            </>
          )}
        </div>

        {retomar.length > 0 && (
          <div className="ini-retomar" aria-label="Continuar de onde parei">
            <span className="ini-linha-rotulo">Também parou em</span>
            {retomar.map((tela) => (
              <button key={tela.chave} type="button" className="pc-link-btn" onClick={tela.onAbrir}>
                {tela.rotulo}
              </button>
            ))}
          </div>
        )}

        {configuracao && !somenteCampo && !simples && (
          <div className="ini-config" role="status">
            <span className="ini-linha-rotulo">Configuração da empresa: {configuracao.feitos} de {configuracao.total}</span>
            <span className="ini-config-faltam">
              faltam{" "}
              {configuracao.faltam.map((item, indice) => (
                <span key={item.id}>
                  {indice > 0 ? ", " : ""}
                  <button type="button" className="pc-link-btn" onClick={item.onAbrir}>{item.titulo}</button>
                </span>
              ))}
            </span>
            <span className="ini-linha-rotulo">·</span>
            <button type="button" className="pc-link-btn" onClick={configuracao.onGuia}>guia de uso em Ajuda e guias</button>
          </div>
        )}
      </div>

      {painel}

      {avisoPops && (
        <div className="ui-nota-divergencia pop-aviso-inicio" role="status">
          <span className="pop-revisar">Revisar</span> {avisoPops}
        </div>
      )}

      {!somenteCampo && (
        <section className="ui-card ini-recentes" aria-label="Visitas recentes">
          <div className="ini-recentes-cabeca">
            <button type="button" className="ini-recentes-alternar" aria-expanded={recentes.aberto} onClick={recentes.onAlternar}>
              <span className="ini-recentes-titulo">Visitas recentes</span>
              {!recentes.aberto && <span className="ini-recentes-resumo">{resumoDeVisitasRecentes(recentes.contagemEmAndamento, recentes.paradas)}</span>}
            </button>
            {recentes.aberto && (
              <div className="ini-abas" role="tablist" aria-label="Situação das visitas">
                {([["Em andamento", "Em andamento", recentes.contagemEmAndamento], ["Concluída", "Concluídas", recentes.contagemConcluidas]] as const).map(([id, rotulo, contagem]) => (
                  <button key={id} type="button" role="tab" aria-selected={recentes.filtro === id} className={`ini-aba${recentes.filtro === id ? " is-ativa" : ""}`} onClick={() => recentes.onFiltro(id)}>
                    {rotulo} · {contagem}
                  </button>
                ))}
              </div>
            )}
            {recentes.aberto && recentes.podeTodasAsEmpresas && (
              <label className="ini-todas">
                <input type="checkbox" role="switch" checked={recentes.todasAsEmpresas} onChange={(evento) => recentes.onTodasAsEmpresas(evento.target.checked)} />
                <span>Todas as empresas</span>
              </label>
            )}
            {recentes.aberto && (
              <button type="button" className="pc-link-btn ini-recentes-todas" onClick={recentes.onVerTodas}>
                Ver todas as visitas →
              </button>
            )}
            <button type="button" className="ini-recentes-acao" aria-expanded={recentes.aberto} onClick={recentes.onAlternar}>
              {recentes.aberto ? "Recolher" : "Abrir"} <span aria-hidden="true">{recentes.aberto ? "▴" : "▾"}</span>
            </button>
          </div>
          {recentes.aberto && (
            <>
              {recentes.paradas > 0 && (
                <div className="ini-paradas" role="status">
                  <span>{textoDasParadas(recentes.paradas)}</span>
                  <button type="button" className="pc-link-btn" onClick={recentes.onEncerrarOuArquivar}>Encerrar ou arquivar →</button>
                </div>
              )}
              <ul className="ini-lista">
                {recentes.linhas.length === 0 && <li className="ui-empty">Nenhuma visita nesta situação.</li>}
                {recentes.linhas.slice(0, LINHAS_RECENTES).map((visita) => (
                  <li key={visita.id}>
                    <button type="button" className="ini-linha-visita" onClick={() => recentes.onAbrirVisita(visita.id)}>
                      <span className="ini-linha-textos">
                        <span className="ini-linha-titulo">{linhaDaVisita(visita.numero, visita.data)}{visita.empresa ? ` · ${visita.empresa}` : ""}</span>
                        <span className="ini-linha-resp">{visita.responsavel}</span>
                      </span>
                      {visita.total > 0 && (
                        <span className="ini-linha-progresso">
                          <ProgressBar percentual={visita.percentual} largura={110} rotulo={`${visita.respondidos} de ${visita.total}`} />
                          <span className="ini-linha-resp">{visita.respondidos} de {visita.total}</span>
                        </span>
                      )}
                      <span aria-hidden="true">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}
    </section>
  );
}
