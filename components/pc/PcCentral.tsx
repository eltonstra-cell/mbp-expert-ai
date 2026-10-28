"use client";

import { NavIcon, type NavIconName } from "@/components/NavIcons";
import { useCabem } from "@/components/useFit";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { SegmentedProgress } from "@/components/ui/ProgressBar";

export type NcAbertaCentral = {
  id: string;
  titulo: string;
  detalhe: string;
  status: string;
  onAbrir: () => void;
};

export type PassoCentral = { chave: string; rotulo: string; resumo: string; /** Explica o escopo do número (title e nome acessível). */ titulo?: string; icone: NavIconName; tom: "ok" | "info" | "nc" | "pend" | "lilas" };

type Props = {
  passos: PassoCentral[];
  onIrPasso: (chave: string) => void;
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
  /** Sem equipamento: linha compacta ("Nenhum equipamento cadastrado · Cadastrar ›", leva a Estrutura › Equipamentos); `onCadastrar` nulo = sem permissão, só o texto. */
  equipamentos: { vazio: boolean; textoVazio: string; onCadastrar: (() => void) | null; texto: string; desabilitado: boolean; onAbrir: () => void };
  programas: { texto: string; onAbrir: () => void } | null;
  ncsAbertas: NcAbertaCentral[] | null;
  onVerNcs: () => void;
  onEditarAmbientes: (() => void) | null;
  onTodasVisitas: () => void;
  /** Total de não conformidades abertas da visita (a lista mostra só as primeiras que cabem). */
  totalNcsAbertas: number;
  /** "Finalizar visita" no topo; nulo = sem permissão ou visita já concluída. Quem chama escolhe o fluxo de cada modo. */
  onFinalizar: (() => void) | null;
};

export default function PcCentral({
  passos,
  onIrPasso,
  empresa,
  detalhe,
  proxima,
  equipamentos,
  programas,
  ncsAbertas,
  onVerNcs,
  onEditarAmbientes,
  onTodasVisitas,
  totalNcsAbertas,
  onFinalizar,
}: Props) {
  const ncsFit = useCabem<HTMLDivElement>(72, 4, 0);
  return (
    <section className="ui-screen" aria-label="Central da visita">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Central da visita</h1>
          <p className="ui-subtitle">{detalhe}</p>
        </div>
        <div className="ui-head-actions">
          {onFinalizar && (
            <button type="button" className="ui-btn pc-central-finalizar" onClick={onFinalizar}>
              Finalizar visita
            </button>
          )}
          {onEditarAmbientes && (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onEditarAmbientes}>
              Editar ambientes
            </button>
          )}
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

      <div className="pc-steps-row" role="group" aria-label="Próximos passos da visita">
        {passos.map((passo) => (
          <button
            key={passo.chave}
            type="button"
            data-chave={passo.chave}
            className={`pc-step-card pc-step-card--${passo.tom}`}
            title={passo.titulo ?? passo.resumo}
            aria-label={passo.titulo ? `${passo.rotulo}, ${passo.resumo}. ${passo.titulo}` : undefined}
            onClick={() => onIrPasso(passo.chave)}
          >
            <span className="pc-step-tile">
              <NavIcon name={passo.icone} size={20} strokeWidth={1.9} />
            </span>
            <span className="pc-step-text">
              <span className="pc-step-name">{passo.rotulo}</span>
              <span className="pc-step-sum">{passo.resumo}</span>
            </span>
            <span className="pc-step-arrow" aria-hidden="true">›</span>
          </button>
        ))}
      </div>

      {(equipamentos.vazio || !programas) && (
        <div className="pc-vazios">
          {equipamentos.vazio && (
            <p className="pc-vazio-linha">
              <span>{equipamentos.textoVazio}</span>
              {equipamentos.onCadastrar && (
                <>
                  <span aria-hidden="true"> · </span>
                  <button type="button" className="pc-link-btn" onClick={equipamentos.onCadastrar}>
                    Cadastrar ›
                  </button>
                </>
              )}
            </p>
          )}
          {!programas && <p className="pc-vazio-linha">Nenhum programa ativo</p>}
        </div>
      )}

      {(!equipamentos.vazio || programas) && (
        <div className="pc-three">
          {!equipamentos.vazio && (
            <button type="button" className="ui-card pc-card-btn" disabled={equipamentos.desabilitado} onClick={equipamentos.onAbrir}>
              <span className="ui-eyebrow">Equipamentos e móveis</span>
              <span className="ui-row-sub">{equipamentos.texto}</span>
            </button>
          )}
          {programas && (
            <button type="button" className="ui-card pc-card-btn" onClick={programas.onAbrir}>
              <span className="ui-eyebrow">Programas de Controle</span>
              <span className="ui-row-sub">{programas.texto}</span>
            </button>
          )}
        </div>
      )}

      {ncsAbertas && ncsAbertas.length > 0 && (
        <div className="pc-open-block">
          <div className="ui-head">
            <h2 className="ui-card-title">Não conformidades em aberto</h2>
            <button type="button" className="pc-link-btn" onClick={onVerNcs}>
              Ver todas ({totalNcsAbertas}) →
            </button>
          </div>
          <div className="ui-list pc-open-list" ref={ncsFit.ref}>
            {ncsAbertas.slice(0, ncsFit.quantos).map((nc) => (
              <ListRow
                key={nc.id}
                faixa="nc"
                titulo={nc.titulo}
                secundario={nc.detalhe}
                pilulas={nc.status !== "Aberta" ? <Pill tom="nc">{nc.status}</Pill> : undefined}
                onClick={nc.onAbrir}
                seta
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
