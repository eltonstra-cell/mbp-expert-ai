"use client";

import { useState } from "react";
import { Pill, type Tom } from "@/components/ui/Pill";
import type { ItemDoPainel, PainelHoje as Painel, SituacaoDoItem } from "@/lib/painelHoje";

const TOM: Record<SituacaoDoItem, Tom> = { vencido: "nc", "vence-em-breve": "amber", aguardando: "info" };
const ROTULO: Record<SituacaoDoItem, string> = { vencido: "Vencido", "vence-em-breve": "Vence em breve", aguardando: "Aguardando" };
const POR_PAGINA = 3;

type Props = {
  painel: Painel;
  onAcao: (item: ItemDoPainel) => void;
  /** Só RT e Administrador: abre a prévia do lembrete ao responsável do estabelecimento. */
  onLembrete?: () => void;
  onResumo: () => void;
};

// "Hoje precisa de você": contadores e lista por urgência, com a ação ao lado de cada item.
export default function PainelHoje({ painel, onAcao, onLembrete, onResumo }: Props) {
  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(painel.itens.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  return (
    <section className="ui-card hoje" aria-label="Hoje precisa de você">
      <div className="pc-card-head">
        <h2 className="ui-card-title">Hoje precisa de você</h2>
        <div className="hoje-contadores" role="group" aria-label="Contadores">
          <Pill tom={painel.vencidos ? "nc" : "ok"}>
            {painel.vencidos} {painel.vencidos === 1 ? "vencido" : "vencidos"}
          </Pill>
          <Pill tom={painel.vencemEm7Dias ? "amber" : "ok"}>{painel.vencemEm7Dias} vencem em 7 dias</Pill>
          {painel.aguardando > 0 && <Pill tom="info">{painel.aguardando} aguardando aprovação</Pill>}
        </div>
      </div>
      {painel.itens.length === 0 ? (
        <p className="ui-row-sub">Nada vencido nem vencendo.</p>
      ) : (
        <ul className="hoje-lista">
          {painel.itens.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA).map((item) => (
            <li key={item.id} className={`hoje-item hoje-item--${item.situacao}`}>
              <div className="hoje-textos">
                <span className="hoje-titulo">{item.titulo}</span>
                <span className="ui-row-sub">
                  {item.prazo} · quem age: {item.quem}
                </span>
              </div>
              <Pill tom={TOM[item.situacao]}>{ROTULO[item.situacao]}</Pill>
              <button type="button" className={`ui-btn ui-btn--small ${item.acao === "aprovar" || item.acao === "renovar" ? "ui-btn--primary" : "ui-btn--secondary"}`} onClick={() => onAcao(item)}>
                {item.rotuloDaAcao}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="hoje-rodape">
        {totalPaginas > 1 && (
          <span className="hoje-paginas">
            <button type="button" className="ui-btn ui-btn--soft ui-btn--small" disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)} aria-label="Itens anteriores">
              ‹
            </button>
            <span className="ui-row-sub">
              {paginaAtual + 1} de {totalPaginas}
            </span>
            <button type="button" className="ui-btn ui-btn--soft ui-btn--small" disabled={paginaAtual >= totalPaginas - 1} onClick={() => setPagina(paginaAtual + 1)} aria-label="Próximos itens">
              ›
            </button>
          </span>
        )}
        <span className="hoje-botoes">
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onResumo}>
            Resumo de uma página
          </button>
          {onLembrete && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onLembrete}>
              Lembrete ao responsável
            </button>
          )}
        </span>
      </div>
    </section>
  );
}
