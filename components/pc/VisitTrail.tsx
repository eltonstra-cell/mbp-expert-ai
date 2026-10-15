"use client";

import { passosDaTrilha, type DadosTrilha, type PassoVisita } from "@/lib/visitTrail";

type Props = {
  empresa: string;
  percentual: number;
  dados: DadosTrilha;
  atual: PassoVisita | null;
  onIr: (passo: PassoVisita) => void;
};

// Trilha da visita: 6 passos numa linha, no topo das telas da visita (só PC).
export default function VisitTrail({ empresa, percentual, dados, atual, onIr }: Props) {
  const passos = passosDaTrilha(dados);
  return (
    <nav className="pc-trail" aria-label="Passos da visita">
      <div className="pc-trail-id">
        <span className="pc-trail-company">{empresa}</span>
        <span className="pc-trail-state">Visita em andamento · {percentual}%</span>
      </div>
      <ol className="pc-trail-steps">
        {passos.map((passo, indice) => (
          <li key={passo.chave} className="pc-trail-li">
            {indice > 0 && (
              <span className="pc-trail-sep" aria-hidden="true">
                ›
              </span>
            )}
            <button
              type="button"
              className={`pc-trail-step${atual === passo.chave ? " is-current" : ""}`}
              aria-current={atual === passo.chave ? "step" : undefined}
              onClick={() => onIr(passo.chave)}
            >
              <span className="pc-trail-num">{passo.numero}</span>
              <span className="pc-trail-name">{passo.rotulo}</span>
              {passo.contador && <span className="pc-trail-count">{passo.contador}</span>}
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
