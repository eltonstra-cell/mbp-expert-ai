"use client";

import { ROTULO_DA_SUBABA, blocoAtivoDaBarra, grupoDaSubaba, subabasDaBarra, type GrupoCentral, type SubAbaCentral } from "@/lib/centralEmpresa";

type Props = {
  grupos: { id: GrupoCentral; rotulo: string; subabas: SubAbaCentral[] }[];
  subaba: SubAbaCentral;
  onSubaba: (subaba: SubAbaCentral) => void;
  /** Contagem em texto terra ao lado de uma sub-aba (ex.: pendências dos POPs). Zero não aparece. */
  contagens?: Partial<Record<SubAbaCentral, number>>;
};

// Duas barras contínuas de blocos, uma sob a outra: 1) Empresa | Estrutura | Documentos; 2) as seções do grupo aberto.
// Cada bloco tem a largura do texto, separadores finos e o selecionado em azul claro com texto preto. Sem pílulas soltas.
export default function CentralEmpresaNav({ grupos, subaba, onSubaba, contagens }: Props) {
  const grupoAtual = grupoDaSubaba(subaba);
  const doGrupo = grupos.find((grupo) => grupo.id === grupoAtual);
  if (!doGrupo) return null;
  const blocos = subabasDaBarra(doGrupo.subabas);
  const ativo = blocoAtivoDaBarra(subaba);
  return (
    <nav className="cen-barras" aria-label="Central da Empresa">
      {grupos.length > 1 && (
        <div className="cen-barra" role="tablist" aria-label="Grupos da Central">
          {grupos.map((grupo) => (
            <button
              key={grupo.id}
              type="button"
              role="tab"
              aria-selected={grupo.id === grupoAtual}
              className={`cen-bloco${grupo.id === grupoAtual ? " is-ativa" : ""}`}
              onClick={() => {
                if (grupo.id !== grupoAtual) onSubaba(grupo.subabas[0]);
              }}
            >
              {grupo.rotulo}
            </button>
          ))}
        </div>
      )}
      {blocos.length > 1 && (
        <div className="cen-barra cen-barra--sub" role="tablist" aria-label={`Seções de ${doGrupo.rotulo}`}>
          {blocos.map((id) => (
            <button key={id} type="button" role="tab" aria-selected={id === ativo} className={`cen-bloco${id === ativo ? " is-ativa" : ""}`} onClick={() => onSubaba(id)}>
              {ROTULO_DA_SUBABA[id]}
              {contagens?.[id] ? <span className="cen-bloco-conta"> {contagens[id]}</span> : null}
            </button>
          ))}
        </div>
      )}
      <div className="cen-divisor" aria-hidden="true" />
    </nav>
  );
}
