"use client";

export type AbaDeRelatorios = "emitidos" | "resumo" | "dossie" | "evolucao" | "mapa";

const ROTULO: Record<AbaDeRelatorios, string> = { emitidos: "Emitidos", resumo: "Resumo", dossie: "Dossiê", evolucao: "Evolução", mapa: "Mapa de risco" };

// O subtítulo de cada tela fica na linha das abas, à direita.
export const SUBTITULO: Record<AbaDeRelatorios, string> = {
  emitidos: "Cada versão fica guardada e não muda",
  resumo: "Para imprimir, salvar em PDF ou mandar por WhatsApp",
  dossie: "Um PDF com índice, só desta empresa",
  evolucao: "Conformidade, reincidentes e tempo para resolver",
  mapa: "Uma cor por ambiente; critério do app, o RT decide",
};

type Props = {
  atual: AbaDeRelatorios;
  /** Abas que o perfil pode abrir; o Fiscal só tem as emitidas. */
  disponiveis: AbaDeRelatorios[];
  onIr: (aba: AbaDeRelatorios) => void;
};

// Menu › Relatórios: as quatro telas de relatório lado a lado, sem passar pelo painel Hoje.
export default function RelatoriosAbas({ atual, disponiveis, onIr }: Props) {
  return (
    <div className="rel-abas no-print">
      <div className="rel-abas-lista" role="tablist" aria-label="Relatórios">
        {disponiveis.length >= 2 &&
          disponiveis.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={id === atual} className={`rel-aba${id === atual ? " is-ativa" : ""}`} onClick={() => onIr(id)}>
              {ROTULO[id]}
            </button>
          ))}
      </div>
      <span className="rel-abas-apoio">{SUBTITULO[atual]}</span>
    </div>
  );
}
