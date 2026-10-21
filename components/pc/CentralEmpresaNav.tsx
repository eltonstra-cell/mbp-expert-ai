"use client";

import { ROTULO_DA_SUBABA, grupoDaSubaba, type GrupoCentral, type SubAbaCentral } from "@/lib/centralEmpresa";

type Props = {
  grupos: { id: GrupoCentral; rotulo: string; subabas: SubAbaCentral[] }[];
  subaba: SubAbaCentral;
  onSubaba: (subaba: SubAbaCentral) => void;
  /** Contagem pequena ao lado de uma sub-aba (ex.: pendências). */
  contagens?: Partial<Record<SubAbaCentral, number>>;
};

// Central da Empresa: 3 grupos no topo e as sub-abas do grupo escolhido. Selecionado em creme com borda dourada.
export default function CentralEmpresaNav({ grupos, subaba, onSubaba, contagens }: Props) {
  const grupoAtual = grupoDaSubaba(subaba);
  const doGrupo = grupos.find((grupo) => grupo.id === grupoAtual);
  return (
    <nav className="cen-nav" aria-label="Central da Empresa">
      <div className="cen-grupos" role="tablist" aria-label="Grupos">
        {grupos.map((grupo) => (
          <button
            key={grupo.id}
            type="button"
            role="tab"
            aria-selected={grupo.id === grupoAtual}
            className={`cen-grupo${grupo.id === grupoAtual ? " is-ativo" : ""}`}
            onClick={() => (grupo.id === grupoAtual ? undefined : onSubaba(grupo.subabas[0]))}
          >
            {grupo.rotulo}
          </button>
        ))}
      </div>
      {doGrupo && doGrupo.subabas.length > 1 && <span className="cen-separador" aria-hidden="true" />}
      {doGrupo && doGrupo.subabas.length > 1 && (
        <div className="cen-subabas" role="tablist" aria-label={`Seções de ${doGrupo.rotulo}`}>
          {doGrupo.subabas.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={id === subaba} className={`cen-sub${id === subaba ? " is-ativa" : ""}`} onClick={() => onSubaba(id)}>
              {ROTULO_DA_SUBABA[id]}
              {contagens?.[id] ? <span className="cen-sub-conta">{contagens[id]}</span> : null}
            </button>
          ))}
        </div>
      )}
    </nav>
  );
}
