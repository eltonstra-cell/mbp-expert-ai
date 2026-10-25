"use client";

import { useState } from "react";
import { Pill, type Tom } from "@/components/ui/Pill";
import type { ItemDoPainel, OrigemDoItem, PainelHoje as Painel, SituacaoDoItem } from "@/lib/painelHoje";
import { vencem } from "@/lib/plural";

const ITENS_INICIAIS = 3;
const TOM: Record<SituacaoDoItem, Tom> = { vencido: "nc", "vence-em-breve": "amber", aguardando: "info" };
const ROTULO: Record<SituacaoDoItem, string> = { vencido: "Vencido", "vence-em-breve": "Vence em breve", aguardando: "Aguardando" };
// Tipo de cada item: correção, comprovante, capacitação ou POP.
const TIPO: Record<OrigemDoItem, string> = { correcao: "Correção", comprovante: "Comprovante", capacitacao: "Capacitação", pop: "POP" };

type Props = {
  painel: Painel;
  onAcao: (item: ItemDoPainel) => void;
};

type PropsAtalhos = {
  /** Mapa de risco por ambiente (critério do app). */
  onMapa?: () => void;
  /** Só RT e Administrador: abre a prévia do lembrete ao responsável do estabelecimento. */
  onLembrete?: () => void;
  onResumo: () => void;
  onEvolucao?: () => void;
  /** Dossiê para fiscalização (RT, Administrador, Gestor, Gerente). */
  onDossie?: () => void;
  onEmitidos?: () => void;
};

// "Hoje precisa de você": só o que exige ação (vencidos, vencendo, correções), com a ação ao lado de cada item.
export default function PainelHoje({ painel, onAcao }: Props) {
  const [verTodos, setVerTodos] = useState(false);
  const visiveis = verTodos ? painel.itens : painel.itens.slice(0, ITENS_INICIAIS);
  return (
    <section className="ui-card hoje" aria-label="Hoje precisa de você">
      <div className="pc-card-head">
        <h2 className="ui-card-title">Hoje precisa de você</h2>
        <div className="hoje-contadores" role="group" aria-label="Contadores">
          <Pill tom={painel.vencidos ? "nc" : "ok"}>
            {painel.vencidos} {painel.vencidos === 1 ? "vencido" : "vencidos"}
          </Pill>
          <Pill tom={painel.vencemEm30Dias ? "amber" : "ok"}>{vencem(painel.vencemEm30Dias)} em 30 dias</Pill>
          {painel.aguardando > 0 && <Pill tom="info">{painel.aguardando} aguardando aprovação</Pill>}
        </div>
      </div>
      {painel.itens.length === 0 ? (
        <p className="ui-row-sub">Nada vencido nem vencendo.</p>
      ) : (
        <ul className="hoje-lista">
          {visiveis.map((item) => (
            <li key={item.id} className={`hoje-item hoje-item--${item.situacao}`}>
              <span className={`hoje-tipo hoje-tipo--${item.origem}`}>{TIPO[item.origem]}</span>
              <div className="hoje-textos">
                <span className="hoje-titulo">{item.titulo}</span>
                <span className="ui-row-sub">
                  {item.prazo} · quem age: {item.quem}
                </span>
              </div>
              {/* A faixa colorida e o prazo já dizem "vencido" e "vence em breve"; a etiqueta só entra quando acrescenta algo. */}
              {item.situacao === "aguardando" && <Pill tom={TOM[item.situacao]}>{ROTULO[item.situacao]}</Pill>}
              <button type="button" className={`ui-btn ui-btn--small ${item.acao === "aprovar" || item.acao === "renovar" ? "ui-btn--criar" : "ui-btn--secondary"}`} onClick={() => onAcao(item)}>
                {item.rotuloDaAcao}
              </button>
            </li>
          ))}
        </ul>
      )}
      {painel.itens.length > ITENS_INICIAIS && (
        <button type="button" className="pc-link-btn pc-self-start" onClick={() => setVerTodos((valor) => !valor)}>
          {verTodos ? "Mostrar só os 3 primeiros" : `Ver todos (${painel.itens.length})`}
        </button>
      )}
    </section>
  );
}

// Atalhos de relatório e o lembrete: bloco próprio, fora de "Hoje precisa de você".
export function AtalhosDeRelatorios({ onLembrete, onResumo, onEvolucao, onDossie, onEmitidos, onMapa }: PropsAtalhos) {
  return (
    <section className="ui-card hoje-atalhos" aria-label="Relatórios e avisos">
      <h2 className="ui-card-title">Relatórios e avisos</h2>
      <div className="hoje-rodape">
        <span className="hoje-botoes">
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onResumo}>
            Resumo de uma página
          </button>
          {onEvolucao && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onEvolucao}>
              Evolução
            </button>
          )}
          {onMapa && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onMapa}>
              Mapa de risco
            </button>
          )}
          {onEmitidos && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onEmitidos}>
              Relatórios emitidos
            </button>
          )}
          {onDossie && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onDossie}>
              Dossiê
            </button>
          )}
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
