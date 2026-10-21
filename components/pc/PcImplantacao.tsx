"use client";

import { resumoDaImplantacao, type DestinoDoPasso, type PassoDeImplantacao } from "@/lib/implantacao";

type Props = {
  passos: PassoDeImplantacao[];
  onContinuar: (destino: DestinoDoPasso) => void;
};

// "Colocar a empresa em dia": 5 passos derivados dos dados. Feito (verde), atual (creme, botão laranja) e pendente (cinza).
export default function PcImplantacao({ passos, onContinuar }: Props) {
  const resumo = resumoDaImplantacao(passos);
  return (
    <section className="impl-cartao" aria-label="Colocar a empresa em dia">
      <div className="impl-topo">
        <h2 className="impl-titulo">Colocar a empresa em dia</h2>
        <span className="impl-conta">
          {resumo.feitos} de {resumo.total} passos
        </span>
      </div>
      <div className="impl-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={resumo.percentual} aria-label="Passos de implantação feitos">
        <div className="impl-barra-cheia" style={{ width: `${resumo.percentual}%` }} />
      </div>
      <ol className="impl-passos">
        {passos.map((passo) => (
          <li key={passo.numero} className={`impl-passo is-${passo.estado}`}>
            <span className="impl-bolinha" aria-hidden="true">
              {passo.estado === "feito" ? "✓" : passo.numero}
            </span>
            <span className="impl-textos">
              <span className="impl-passo-titulo">{passo.titulo}</span>
              <span className="impl-passo-detalhe">{passo.detalhe}</span>
            </span>
            {passo.estado === "atual" && (
              <button type="button" className="ui-btn ui-btn--criar" onClick={() => onContinuar(passo.destino)}>
                Continuar
              </button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
