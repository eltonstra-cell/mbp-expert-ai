"use client";

import { ROTULO_DA_SUBABA, grupoDaSubaba, type GrupoCentral, type SubAbaCentral } from "@/lib/centralEmpresa";

type Props = {
  grupos: { id: GrupoCentral; rotulo: string; subabas: SubAbaCentral[] }[];
  subaba: SubAbaCentral;
  onSubaba: (subaba: SubAbaCentral) => void;
  /** Contagem pequena ao lado de uma sub-aba (ex.: pendências). */
  contagens?: Partial<Record<SubAbaCentral, number>>;
};

// Abas da seção aberta da Central da Empresa: texto com sublinhado laranja na ativa e uma linha cinza fina embaixo.
// A troca entre Empresa, Cadastros e Documentos fica no menu da barra do topo (AppTopbar), não aqui.
export default function CentralEmpresaNav({ grupos, subaba, onSubaba, contagens }: Props) {
  const grupoAtual = grupoDaSubaba(subaba);
  const doGrupo = grupos.find((grupo) => grupo.id === grupoAtual);
  if (!doGrupo || doGrupo.subabas.length < 2) return null;
  return (
    <nav className="cen-nav" aria-label={`Seções de ${doGrupo.rotulo}`}>
      <div className="cen-subabas" role="tablist" aria-label={`Seções de ${doGrupo.rotulo}`}>
        {doGrupo.subabas.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={id === subaba} className={`cen-sub${id === subaba ? " is-ativa" : ""}`} onClick={() => onSubaba(id)}>
            {ROTULO_DA_SUBABA[id]}
            {contagens?.[id] ? ` · ${contagens[id]}` : ""}
          </button>
        ))}
      </div>
    </nav>
  );
}
