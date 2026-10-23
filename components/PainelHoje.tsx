"use client";

import { useState } from "react";
import type { ItemDoPainel, OrigemDoItem, PainelHoje as Painel } from "@/lib/painelHoje";
import { vencem } from "@/lib/plural";

const ITENS_INICIAIS = 3;
// Tipo de cada item: correção, comprovante, capacitação ou POP.
const TIPO: Record<OrigemDoItem, string> = { correcao: "Correção", comprovante: "Comprovante", capacitacao: "Capacitação", pop: "POP" };

type Props = {
  painel: Painel;
  onAcao: (item: ItemDoPainel) => void;
  /** Só RT e Administrador: abre a prévia do lembrete ao responsável do estabelecimento (link no rodapé do cartão). */
  onLembrete?: () => void;
  /** Outras correções abertas (prazo além de 30 dias ou sem prazo): não entram na lista; leva a Correções. */
  outras?: { quantidade: number; onVer: () => void };
};

// "Hoje precisa de você": contadores em texto e lista por urgência (bolinha de situação + chip do tipo + ação), tudo do mesmo cálculo.
export default function PainelHoje({ painel, onAcao, onLembrete, outras }: Props) {
  const [verTodos, setVerTodos] = useState(false);
  const total = painel.itens.length;
  const visiveis = verTodos ? painel.itens : painel.itens.slice(0, ITENS_INICIAIS);
  return (
    <section className="ui-card hoje" aria-label="Hoje precisa de você">
      <div className="pc-card-head">
        <h2 className="hoje-titulo-card">Hoje precisa de você</h2>
        <div className="hoje-contadores" role="group" aria-label="Contadores">
          <span className={`hoje-conta${painel.vencidos ? " is-nc" : ""}`}>{painel.vencidos} {painel.vencidos === 1 ? "vencido" : "vencidos"}</span>
          <span className={`hoje-conta${painel.vencemEm30Dias ? " is-aviso" : ""}`}>{vencem(painel.vencemEm30Dias)} em 30 dias</span>
          {painel.aguardando > 0 && <span className="hoje-conta is-info">{painel.aguardando} aguardando aprovação</span>}
        </div>
      </div>
      {total === 0 ? (
        <p className="ui-row-sub">Nada vencido nem vencendo.</p>
      ) : (
        <ul className="hoje-lista">
          {visiveis.map((item) => (
            <li key={item.id} className="hoje-item">
              <span className={`hoje-bolinha hoje-bolinha--${item.situacao}`} aria-hidden="true" />
              <span className={`hoje-tipo hoje-tipo--${item.origem}`}>{TIPO[item.origem]}</span>
              <div className="hoje-textos">
                <span className="hoje-titulo">{item.titulo}</span>
                <span className="hoje-apoio">
                  {item.prazo} · quem age: {item.quem}
                </span>
              </div>
              <button type="button" className={`ui-btn ${item.acao === "aprovar" || item.acao === "renovar" ? "ui-btn--criar" : "ui-btn--secondary"}`} onClick={() => onAcao(item)}>
                {item.rotuloDaAcao}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="hoje-rodape">
        <span className="hoje-links">
          {total > ITENS_INICIAIS && (
            <button type="button" className="pc-link-btn" aria-expanded={verTodos} onClick={() => setVerTodos((valor) => !valor)}>
              {verTodos ? `Mostrar só os ${ITENS_INICIAIS} primeiros` : `Ver todas (${total})`}
            </button>
          )}
          {outras && outras.quantidade > 0 && (
            <button type="button" className="pc-link-btn" onClick={outras.onVer}>
              {outras.quantidade === 1 ? "1 outra correção aberta" : `${outras.quantidade} outras correções abertas`} →
            </button>
          )}
        </span>
        {onLembrete && (
          <button type="button" className="pc-link-btn" onClick={onLembrete}>
            Lembrete ao responsável
          </button>
        )}
      </div>
    </section>
  );
}
