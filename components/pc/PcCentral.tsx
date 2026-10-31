"use client";

import { NavIcon, type NavIconName } from "@/components/NavIcons";
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
  /** Tablet e celular (modo Campo): o título "Visita N" já está no cabeçalho; a tela tem altura fixa, sem rolagem da página. */
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
  /** Sem equipamento: o cartão diz "Nenhum cadastrado" e leva a Estrutura › Equipamentos; `onCadastrar` nulo = sem permissão, só o texto. */
  equipamentos: { vazio: boolean; textoVazio: string; onCadastrar: (() => void) | null; texto: string; desabilitado: boolean; onAbrir: () => void };
  programas: { texto: string; onAbrir: () => void } | null;
  ncsAbertas: NcAbertaCentral[] | null;
  onVerNcs: () => void;
  onEditarAmbientes: (() => void) | null;
  onTodasVisitas: () => void;
  /** Total de não conformidades abertas da visita (a lista mostra só as primeiras). */
  totalNcsAbertas: number;
  /** "Finalizar visita"; nulo = sem permissão ou visita já concluída. Quem chama escolhe o fluxo de cada modo. */
  onFinalizar: (() => void) | null;
};

// Cor forte de cada cartão (círculo com ícone branco).
const COR_DO_CARTAO: Record<string, string> = {
  checklist: "#21805B",
  evidencias: "#2874DB",
  correcoes: "#C83F45",
  pops: "#168080",
  relatorio: "#526477",
  equipamentos: "#B4491C",
};

export default function PcCentral({
  campo = false,
  dataDaVisita = "",
  passos,
  onIrPasso,
  detalhe,
  proxima,
  equipamentos,
  programas,
  ncsAbertas,
  onVerNcs,
  totalNcsAbertas,
  onFinalizar,
}: Props) {
  const finalizar = () => {
    if (!onFinalizar) return;
    if (campo && proxima.respondidos === 0) {
      void confirmar("Nenhum item do checklist foi respondido nesta visita. Quer finalizar mesmo assim?", { titulo: "Finalizar sem respostas?", confirmarRotulo: "Finalizar", cancelarRotulo: "Voltar" }).then((sim) => { if (sim) onFinalizar(); });
      return;
    }
    onFinalizar();
  };

  const cartaoDoPasso = (passo: PassoCentral) => (
    <button
      key={passo.chave}
      type="button"
      data-chave={passo.chave}
      className="cc2-cartao"
      title={passo.titulo ?? passo.resumo}
      aria-label={passo.titulo ? `${passo.rotulo}, ${passo.resumo}. ${passo.titulo}` : undefined}
      onClick={() => onIrPasso(passo.chave)}
    >
      <span className="cc2-icone" style={{ background: COR_DO_CARTAO[passo.chave] || "#526477" }}><NavIcon name={passo.icone} size={22} strokeWidth={1.9} /></span>
      <span className="cc2-textos">
        <span className="cc2-nome">{passo.rotulo}</span>
        <span className="cc2-resumo">{passo.resumo}</span>
      </span>
      <span className="cc2-seta" aria-hidden="true">›</span>
    </button>
  );

  const cartaoDeEquipamentos = equipamentos.vazio ? (
    <button key="equipamentos" type="button" data-chave="equipamentos" className="cc2-cartao" disabled={!equipamentos.onCadastrar} title={equipamentos.textoVazio} onClick={() => equipamentos.onCadastrar?.()}>
      <span className="cc2-icone" style={{ background: COR_DO_CARTAO.equipamentos }}><NavIcon name="ambientes" size={22} strokeWidth={1.9} /></span>
      <span className="cc2-textos">
        <span className="cc2-nome">Equipamentos e móveis</span>
        <span className="cc2-resumo">Nenhum cadastrado</span>
      </span>
      <span className="cc2-seta" aria-hidden="true">›</span>
    </button>
  ) : (
    <button key="equipamentos" type="button" data-chave="equipamentos" className="cc2-cartao" disabled={equipamentos.desabilitado} onClick={equipamentos.onAbrir}>
      <span className="cc2-icone" style={{ background: COR_DO_CARTAO.equipamentos }}><NavIcon name="ambientes" size={22} strokeWidth={1.9} /></span>
      <span className="cc2-textos">
        <span className="cc2-nome">Equipamentos e móveis</span>
        <span className="cc2-resumo">{equipamentos.texto}</span>
      </span>
      <span className="cc2-seta" aria-hidden="true">›</span>
    </button>
  );

  const corpo = (
    <>
      <div className="cc2-proxima">
        <span className="cc2-proxima-icone" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
        </span>
        <div className="cc2-proxima-textos">
          <div className="cc2-eyebrow">Próxima etapa{dataDaVisita ? ` · ${dataDaVisita}` : ""}</div>
          <div className="cc2-ambiente">{proxima.titulo}</div>
          <div className="cc2-barra" role="progressbar" aria-label="Progresso do checklist" aria-valuemin={0} aria-valuemax={100} aria-valuenow={proxima.percentual}>
            <span style={{ width: `${Math.max(0, Math.min(100, proxima.percentual))}%` }} />
          </div>
          <div className="cc2-resp">
            {proxima.respondidos} de {proxima.total} respondidos · {proxima.percentual}%
          </div>
        </div>
        <button type="button" className="cc2-continuar" disabled={proxima.desabilitado} onClick={proxima.onContinuar}>
          {proxima.botao}
        </button>
      </div>

      <div className="cc2-grade" role="group" aria-label="Assuntos da visita">
        {passos.map(cartaoDoPasso)}
        {cartaoDeEquipamentos}
      </div>

      {programas && (
        <button type="button" className="cc2-programas" onClick={programas.onAbrir}>
          Programas de Controle · {programas.texto} ›
        </button>
      )}

      {ncsAbertas && ncsAbertas.length > 0 && (
        <div className="cc2-ncs">
          <div className="cc2-ncs-cab">
            <h2 className="cc2-ncs-titulo">Não conformidades em aberto</h2>
            <button type="button" className="cc2-ver-todas" onClick={onVerNcs}>Ver todas ({totalNcsAbertas}) →</button>
          </div>
          <div className="cc2-ncs-lista">
            {ncsAbertas.map((nc) => (
              <button key={nc.id} type="button" className="cc2-nc" onClick={nc.onAbrir}>
                <span className="cc2-nc-icone" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v6M12 17h.01" /></svg>
                </span>
                <span className="cc2-nc-textos">
                  <span className="cc2-nc-titulo">{nc.titulo}</span>
                  <span className="cc2-nc-sub">{nc.detalhe}{nc.status !== "Aberta" ? ` · ${nc.status}` : ""}</span>
                </span>
                <span className="cc2-seta" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {campo && onFinalizar && (
        <button type="button" className="cc2-finalizar" onClick={finalizar}>
          Finalizar visita
        </button>
      )}
    </>
  );

  if (campo) {
    return (
      <CampoTelaFixa className="ui-screen cc2" rotulo="Central da visita">
        {corpo}
      </CampoTelaFixa>
    );
  }
  return (
    <section className="ui-screen cc2" aria-label="Central da visita">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Central da visita</h1>
          <p className="ui-subtitle">{detalhe}</p>
        </div>
        <div className="ui-head-actions">
          {onFinalizar && (
            <button type="button" className="cc2-finalizar" onClick={finalizar}>
              Finalizar visita
            </button>
          )}
        </div>
      </div>
      {corpo}
    </section>
  );
}
