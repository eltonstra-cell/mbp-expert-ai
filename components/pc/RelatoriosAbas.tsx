"use client";

export type AbaDeRelatorios = "emitidos" | "resumo" | "dossie" | "evolucao";

const ROTULO: Record<AbaDeRelatorios, string> = { emitidos: "Emitidos", resumo: "Resumo", dossie: "Dossiê", evolucao: "Evolução" };

type Props = {
  atual: AbaDeRelatorios;
  /** Abas que o perfil pode abrir; o Fiscal só tem as emitidas. */
  disponiveis: AbaDeRelatorios[];
  onIr: (aba: AbaDeRelatorios) => void;
};

// Menu › Relatórios: as quatro telas de relatório lado a lado, sem passar pelo painel Hoje.
export default function RelatoriosAbas({ atual, disponiveis, onIr }: Props) {
  if (disponiveis.length < 2) return null;
  return (
    <div className="rel-abas no-print" role="tablist" aria-label="Relatórios">
      {disponiveis.map((id) => (
        <button key={id} type="button" role="tab" aria-selected={id === atual} className={`rel-aba${id === atual ? " is-ativa" : ""}`} onClick={() => onIr(id)}>
          {ROTULO[id]}
        </button>
      ))}
    </div>
  );
}
