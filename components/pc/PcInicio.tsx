"use client";

import { useState } from "react";
import type { ItemDoPainel } from "@/lib/painelHoje";
import { LIMITE_DE_LINHAS_DO_PAINEL, quadradoDoVencimento, textoDoPrazoEm, type ItemDeVencimento } from "@/lib/inicio";

export type CaixaDoInicio = { chave: string; titulo: string; subtitulo: string; tipo: "visita" | "pop" | "comprovantes"; onAbrir: () => void };

type Props = {
  nome: string;
  /** Aviso para o RT (norma alterada nos POPs aprovados): uma linha, só quando existe. Não faz parte do desenho; foi mantido por ser aviso regulatório. */
  avisoPops?: string | null;
  /** Até 3 caixas do "Continuar de onde parei"; vazio = o cartão não aparece. */
  caixas: CaixaDoInicio[];
  /** "Configuração da empresa: X de Y · faltam …": só enquanto estiver incompleta. */
  configuracao: { feitos: number; total: number; faltam: { id: string; titulo: string; onAbrir: () => void }[]; onGuia: () => void } | null;
  /** Só gestor (quem vê o painel Hoje); sem ele, só o cartão. */
  colunas: {
    precisa: ItemDoPainel[];
    vencidos: number;
    aguardando: number;
    vencendo: ItemDeVencimento[];
    onAbrirPendencia: (item: ItemDoPainel) => void;
    onAbrirVencimento: (item: ItemDeVencimento) => void;
    onLembrete?: () => void;
    onTodosVencimentos: () => void;
  } | null;
};

const TIPO: Record<ItemDoPainel["origem"], string> = { correcao: "Correção", comprovante: "Comprovante", capacitacao: "Capacitação", pop: "Aprovação" };

const IconeVisita = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1z" /><rect x="5" y="6" width="14" height="15" rx="2" /><path d="M9 12l2 2 4-4" />
  </svg>
);
const IconePop = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3h9l4 4v14H6z" /><path d="M15 3v5h4M9 13h6M9 17h6" />
  </svg>
);
const IconeComprovante = () => (
  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z" /><path d="M9 12l2 2 4-4" />
  </svg>
);

// Início (PC), desenho aprovado: cartão "Continuar de onde parei" (até 3 caixas azuis + linha de configuração) e duas colunas de mesma altura:
// "Hoje precisa de você" (vencidos e aprovações) e "Vencendo em 30 dias". A barra do topo é a do app (AppTopbar, variante "inicio").
export default function PcInicio({ nome, avisoPops = null, caixas, configuracao, colunas }: Props) {
  const [verTodas, setVerTodas] = useState(false);
  const linhas = colunas ? colunas.precisa : [];
  const mostrar = verTodas ? linhas : linhas.slice(0, LIMITE_DE_LINHAS_DO_PAINEL);
  const faltaMostrar = linhas.length > mostrar.length;

  const linhaDeConfiguracao = configuracao && (
    <p className="ini2-config" role="status">
      Configuração da empresa: {configuracao.feitos} de {configuracao.total} · faltam{" "}
      {configuracao.faltam.map((item, indice) => (
        <span key={item.id}>
          {indice > 0 ? (indice === configuracao.faltam.length - 1 ? " e " : ", ") : ""}
          <button type="button" className="ini2-link" onClick={item.onAbrir}>{item.titulo}</button>
        </span>
      ))}{" "}
      · <button type="button" className="ini2-link" onClick={configuracao.onGuia}>Guia de uso em Ajuda e guias</button>
    </p>
  );

  return (
    <section className="ui-screen ini2" aria-label="Início">
      <h1 className="sr-only">Início · olá, {nome}</h1>

      {avisoPops && (
        <p className="ini2-aviso" role="status">
          <span className="ini2-aviso-marca">Revisar</span> {avisoPops}
        </p>
      )}

      {caixas.length > 0 ? (
        <div className="ini2-cartao">
          <div className="ini2-cartao-topo">
            <h2 className="ini2-titulo">Continuar de onde parei</h2>
            {linhaDeConfiguracao}
          </div>
          <div className="ini2-caixas">
            {caixas.map((caixa) => (
              <button key={caixa.chave} type="button" className="ini2-caixa" onClick={caixa.onAbrir}>
                {caixa.tipo === "visita" ? <IconeVisita /> : caixa.tipo === "pop" ? <IconePop /> : <IconeComprovante />}
                <span className="ini2-caixa-textos">
                  <span className="ini2-caixa-titulo">{caixa.titulo}</span>
                  {caixa.subtitulo && <span className="ini2-caixa-sub">{caixa.subtitulo}</span>}
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        linhaDeConfiguracao && <div className="ini2-cartao-topo ini2-so-config">{linhaDeConfiguracao}</div>
      )}

      {colunas && (
        <div className="ini2-colunas">
          <section className="ini2-painel ini2-painel--precisa" aria-label="Hoje precisa de você">
            <div className="ini2-painel-topo">
              <h2 className="ini2-titulo">Hoje precisa de você</h2>
              <span className="ini2-resumo">{colunas.vencidos} {colunas.vencidos === 1 ? "vencido" : "vencidos"} · {colunas.aguardando} aguardando aprovação</span>
            </div>
            <div className={`ini2-lista${verTodas ? " is-rolagem" : ""}`}>
              {linhas.length === 0 && <p className="ini2-vazio">Nada vencido nem esperando aprovação.</p>}
              {mostrar.map((item) => (
                <button key={item.id} type="button" className={`ini2-linha ini2-linha--${item.origem}`} onClick={() => colunas.onAbrirPendencia(item)}>
                  <span className="ini2-barra" aria-hidden="true" />
                  <span className="ini2-linha-textos">
                    <span className="ini2-linha-titulo">{item.titulo}</span>
                    <span className="ini2-linha-sub">{TIPO[item.origem]} · {item.prazo} · {item.quem}</span>
                  </span>
                  <span className="ini2-seta" aria-hidden="true">›</span>
                </button>
              ))}
            </div>
            <div className="ini2-rodape">
              {faltaMostrar ? (
                <button type="button" className="ini2-link" onClick={() => setVerTodas(true)}>Ver todas ({linhas.length})</button>
              ) : (
                <span />
              )}
              {colunas.onLembrete && <button type="button" className="ini2-link" onClick={colunas.onLembrete}>Lembrete ao responsável</button>}
            </div>
          </section>

          <section className="ini2-painel ini2-painel--vencendo" aria-label="Vencendo em 30 dias">
            <div className="ini2-painel-topo">
              <h2 className="ini2-titulo">Vencendo em 30 dias</h2>
              <span className="ini2-resumo">{colunas.vencendo.length} {colunas.vencendo.length === 1 ? "item" : "itens"}</span>
            </div>
            <div className="ini2-lista">
              {colunas.vencendo.length === 0 && <p className="ini2-vazio">Nada vence nos próximos 30 dias.</p>}
              {colunas.vencendo.slice(0, LIMITE_DE_LINHAS_DO_PAINEL).map((item) => {
                const quadrado = quadradoDoVencimento(item.validade, item.dias);
                return (
                  <button key={item.id} type="button" className="ini2-linha ini2-linha--vence" onClick={() => colunas.onAbrirVencimento(item)}>
                    <span className={`ini2-data ini2-data--${quadrado.tom}`} aria-hidden="true">
                      <span className="ini2-data-dia">{quadrado.dia}</span>
                      <span className="ini2-data-mes">{quadrado.mes}</span>
                    </span>
                    <span className="ini2-linha-textos">
                      <span className="ini2-linha-titulo">{item.titulo}</span>
                      <span className="ini2-linha-sub ini2-sub-vence"><span className="ini2-sub-quem">{item.quem}</span><span className="ini2-sub-dias"> · {textoDoPrazoEm(item.dias)}</span></span>
                    </span>
                    <span className="ini2-seta" aria-hidden="true">›</span>
                  </button>
                );
              })}
            </div>
            <div className="ini2-rodape">
              <span />
              <button type="button" className="ini2-link" onClick={colunas.onTodosVencimentos}>Ver todos os vencimentos →</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
