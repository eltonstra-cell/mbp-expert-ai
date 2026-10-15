"use client";

import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { SegmentedProgress } from "@/components/ui/ProgressBar";
import { StatStrip } from "@/components/ui/StatStrip";

export type NcAbertaCentral = {
  id: string;
  titulo: string;
  detalhe: string;
  status: string;
  onAbrir: () => void;
};

type Props = {
  empresa: string;
  detalhe: string;
  proxima: {
    titulo: string;
    respondidos: number;
    total: number;
    percentual: number;
    conformes: number;
    naoConformes: number;
    naoSeAplica: number;
    pendentes: number;
    botao: string;
    desabilitado: boolean;
    onContinuar: () => void;
  };
  indicadores: { conformes: number; naoConformidades: number; evidencias: number; pendencias: number };
  equipamentos: { texto: string; desabilitado: boolean; onAbrir: () => void };
  programas: { texto: string; onAbrir: () => void } | null;
  atividade: { texto: string; onAcompanhar: (() => void) | null };
  ncsAbertas: NcAbertaCentral[] | null;
  onVerNcs: () => void;
  onEditarAmbientes: (() => void) | null;
  onTodasVisitas: () => void;
};

export default function PcCentral({
  empresa,
  detalhe,
  proxima,
  indicadores,
  equipamentos,
  programas,
  atividade,
  ncsAbertas,
  onVerNcs,
  onEditarAmbientes,
  onTodasVisitas,
}: Props) {
  return (
    <section className="ui-screen" aria-label="Central da visita">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">{empresa}</h1>
          <p className="ui-subtitle">{detalhe}</p>
        </div>
        <div className="ui-head-actions">
          {onEditarAmbientes && (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onEditarAmbientes}>
              Editar ambientes
            </button>
          )}
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onTodasVisitas}>
            ← Todas as visitas
          </button>
        </div>
      </div>

      <div className="ui-card pc-continue">
        <div className="pc-continue-text">
          <div className="ui-eyebrow">Próxima etapa</div>
          <div className="pc-next-title">{proxima.titulo}</div>
        </div>
        <div className="pc-continue-progress">
          <SegmentedProgress
            conformes={proxima.conformes}
            naoConformes={proxima.naoConformes}
            naoSeAplica={proxima.naoSeAplica}
            pendentes={proxima.pendentes}
          />
          <div className="ui-row-sub">
            {proxima.respondidos} de {proxima.total} respondidos · {proxima.percentual}%
          </div>
        </div>
        <button type="button" className="ui-btn ui-btn--primary" disabled={proxima.desabilitado} onClick={proxima.onContinuar}>
          {proxima.botao}
        </button>
      </div>

      <StatStrip
        rotulo="Resumo da visita"
        itens={[
          { rotulo: "Conformes", valor: indicadores.conformes, tom: "ok" },
          { rotulo: "Não conformidades", valor: indicadores.naoConformidades, tom: "nc" },
          { rotulo: "Evidências", valor: indicadores.evidencias, tom: "info" },
          { rotulo: "Pendências", valor: indicadores.pendencias, tom: "pend" },
        ]}
      />

      <div className="pc-three">
        <button type="button" className="ui-card pc-card-btn" disabled={equipamentos.desabilitado} onClick={equipamentos.onAbrir}>
          <span className="ui-eyebrow">Equipamentos e móveis</span>
          <span className="ui-row-sub">{equipamentos.texto}</span>
        </button>
        {programas ? (
          <button type="button" className="ui-card pc-card-btn" onClick={programas.onAbrir}>
            <span className="ui-eyebrow">Programas de Controle</span>
            <span className="ui-row-sub">{programas.texto}</span>
          </button>
        ) : (
          <div className="ui-card pc-card-btn">
            <span className="ui-eyebrow">Programas de Controle</span>
            <span className="ui-row-sub">Nenhum programa ativo para esta visita.</span>
          </div>
        )}
        <div className="ui-card pc-card-btn">
          <span className="ui-eyebrow">Atividade da visita</span>
          <span className="ui-row-sub">{atividade.texto}</span>
          {atividade.onAcompanhar && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small pc-self-start" onClick={atividade.onAcompanhar}>
              Acompanhar →
            </button>
          )}
        </div>
      </div>

      {ncsAbertas && ncsAbertas.length > 0 && (
        <div className="pc-open-block">
          <div className="ui-head">
            <h2 className="ui-card-title">Não conformidades em aberto</h2>
            <button type="button" className="pc-link-btn" onClick={onVerNcs}>
              Ver todas →
            </button>
          </div>
          <div className="ui-list">
            {ncsAbertas.map((nc) => (
              <ListRow
                key={nc.id}
                faixa="nc"
                titulo={nc.titulo}
                secundario={nc.detalhe}
                pilulas={<Pill tom="nc">{nc.status}</Pill>}
                acao={
                  <button type="button" className="ui-btn ui-btn--secondary" onClick={nc.onAbrir}>
                    Acompanhar →
                  </button>
                }
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
