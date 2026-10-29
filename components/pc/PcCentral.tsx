"use client";

import { NavIcon, type NavIconName } from "@/components/NavIcons";
import { useCabem } from "@/components/useFit";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar, SegmentedProgress } from "@/components/ui/ProgressBar";
import { confirmar } from "@/lib/dialogos";
import { CampoTelaFixa } from "@/components/campo/CampoTelas";

export type NcAbertaCentral = {
  id: string;
  titulo: string;
  detalhe: string;
  status: string;
  onAbrir: () => void;
};

export type PassoCentral = { chave: string; rotulo: string; resumo: string; /** Explica o escopo do número (title e nome acessível). */ titulo?: string; icone: NavIconName; tom: "ok" | "info" | "nc" | "pend" | "lilas" };

type Props = {
  /** Tablet e celular (modo Campo): o título "Visita N" já está no cabeçalho; lista única, Finalizar no fim. */
  campo?: boolean;
  /** Data da visita, no cartão "Próxima etapa · data". */
  dataDaVisita?: string;
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
  campo = false,
  dataDaVisita = "",
  passos,
  onIrPasso,
  empresa,
  detalhe,
  proxima,
  equipamentos,
  programas,
  ncsAbertas,
  onVerNcs,
  onTodasVisitas,
  totalNcsAbertas,
  onFinalizar,
}: Props) {
  const ncsFit = useCabem<HTMLDivElement>(72, 4, 0);
  if (campo) {
    const linhaDoPasso = (passo: PassoCentral) => (
      <button key={passo.chave} type="button" data-chave={passo.chave} className={`cc-linha cc-linha--${passo.tom}`} title={passo.titulo ?? passo.resumo} aria-label={passo.titulo ? `${passo.rotulo}, ${passo.resumo}. ${passo.titulo}` : undefined} onClick={() => onIrPasso(passo.chave)}>
        <span className="cc-icone"><NavIcon name={passo.icone} size={20} strokeWidth={1.9} /></span>
        <span className="cc-nome">{passo.rotulo}</span>
        <span className="cc-valor">{passo.resumo}</span>
        <span className="cc-seta" aria-hidden="true">›</span>
      </button>
    );
    const antes = passos.filter((passo) => passo.chave !== "relatorio");
    const relatorio = passos.filter((passo) => passo.chave === "relatorio");
    const completa = proxima.total > 0 && proxima.respondidos >= proxima.total;
    const finalizar = () => {
      if (!onFinalizar) return;
      if (proxima.respondidos === 0) {
        void confirmar("Nenhum item do checklist foi respondido nesta visita. Quer finalizar mesmo assim?", { titulo: "Finalizar sem respostas?", confirmarRotulo: "Finalizar", cancelarRotulo: "Voltar" }).then((sim) => { if (sim) onFinalizar(); });
        return;
      }
      onFinalizar();
    };
    return (
      <CampoTelaFixa className="ui-screen cc" rotulo="Central da visita">
        <div className="cc-proxima">
          <div className="cc-proxima-topo">
            <div className="cc-proxima-textos">
              <div className="cc-eyebrow">Próxima etapa{dataDaVisita ? ` · ${dataDaVisita}` : ""}</div>
              <div className="cc-ambiente">{proxima.titulo}</div>
            </div>
            <button type="button" className="cc-continuar" disabled={proxima.desabilitado} onClick={proxima.onContinuar}>
              {proxima.botao}
            </button>
          </div>
          <ProgressBar percentual={proxima.percentual} rotulo="Progresso do checklist" />
          <div className="cc-resp">
            {proxima.respondidos} de {proxima.total} respondidas · {proxima.percentual}%
          </div>
        </div>

        <div className="cc-lista" role="group" aria-label="Assuntos da visita">
          {antes.map(linhaDoPasso)}
          {equipamentos.vazio ? (
            <button type="button" className="cc-linha cc-linha--equip" disabled={!equipamentos.onCadastrar} onClick={() => equipamentos.onCadastrar?.()}>
              <span className="cc-icone"><NavIcon name="ambientes" size={20} strokeWidth={1.9} /></span>
              <span className="cc-nome">Equipamentos<span className="cc-nome-resto"> e móveis</span></span>
              <span className="cc-valor">Nenhum cadastrado</span>
              <span className="cc-seta" aria-hidden="true">›</span>
            </button>
          ) : (
            <button type="button" className="cc-linha cc-linha--equip" disabled={equipamentos.desabilitado} onClick={equipamentos.onAbrir}>
              <span className="cc-icone"><NavIcon name="ambientes" size={20} strokeWidth={1.9} /></span>
              <span className="cc-nome">Equipamentos<span className="cc-nome-resto"> e móveis</span></span>
              <span className="cc-valor">{equipamentos.texto}</span>
              <span className="cc-seta" aria-hidden="true">›</span>
            </button>
          )}
          {relatorio.map(linhaDoPasso)}
        </div>

        {ncsAbertas && ncsAbertas.length > 0 && (
          <div className="cc-ncs">
            <div className="cc-ncs-cab">
              <h2 className="cc-ncs-titulo">Não conformidades em aberto</h2>
              <button type="button" className="pc-link-btn" onClick={onVerNcs}>Ver todas ({totalNcsAbertas}) →</button>
            </div>
            {ncsAbertas.slice(0, 2).map((nc, indice) => (
              <button key={nc.id} type="button" className={`cc-nc${indice > 0 ? " cc-nc--tablet" : ""}`} onClick={nc.onAbrir}>
                <span className="cc-nc-textos">
                  <span className="cc-nc-titulo">{nc.titulo}</span>
                  <span className="cc-nc-sub">{nc.detalhe}</span>
                </span>
                <span className="cc-seta" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        )}

        {onFinalizar && (
          <button type="button" className={`cc-finalizar${completa ? " is-completa" : ""}`} onClick={finalizar}>
            Finalizar visita
          </button>
        )}
      </CampoTelaFixa>
    );
  }
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

      {(!equipamentos.vazio || programas || equipamentos.onCadastrar) && (
        <div className="pc-three">
          {!equipamentos.vazio ? (
            <button type="button" className="ui-card pc-card-btn" disabled={equipamentos.desabilitado} onClick={equipamentos.onAbrir}>
              <span className="ui-eyebrow">Equipamentos e móveis</span>
              <span className="ui-row-sub">{equipamentos.texto}</span>
            </button>
          ) : equipamentos.onCadastrar ? (
            <button type="button" className="ui-card pc-card-btn" onClick={equipamentos.onCadastrar}>
              <span className="ui-eyebrow">Equipamentos e móveis</span>
              <span className="ui-row-sub">Nenhum cadastrado</span>
            </button>
          ) : null}
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
