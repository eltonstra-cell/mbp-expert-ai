"use client";

import type { ReactNode } from "react";
import Select from "@/components/Select";
import { ROTULO_DA_SUBABA, blocoAtivoDaBarra, grupoDaSubaba, subabasDaBarra, type GrupoCentral, type SubAbaCentral } from "@/lib/centralEmpresa";
import "../../app/cadastro-estrutura.css";

type Props = {
  grupos: { id: GrupoCentral; rotulo: string; subabas: SubAbaCentral[] }[];
  subaba: SubAbaCentral;
  onSubaba: (subaba: SubAbaCentral) => void;
  /** Contagem em texto terra ao lado de uma sub-aba (ex.: pendências dos POPs). Zero não aparece. */
  contagens?: Partial<Record<SubAbaCentral, number>>;
  /** À direita da linha das sub-abas (ex.: o estado de revisão da aba atual). */
  direita?: ReactNode;
  /** Índice vertical à esquerda (PC) ou uma linha rolável (tablet e celular), só com as sub-abas do grupo aberto. */
  indice?: boolean;
  /** Só a linha Empresa | Estrutura | Documentos (as seções do grupo ficam no índice vertical ao lado). */
  soGrupos?: boolean;
};

// Duas linhas, uma sob a outra: 1) Empresa | Estrutura | Documentos; 2) as sub-abas do grupo aberto. As duas em texto com sublinhado:
// a atual com peso 500 e sublinhado azul #264A80 de 3 px; as outras em cinza #526477 (Ambientes, Equipamentos e Fluxos são abas separadas). Sem pílulas.
export default function CentralEmpresaNav({ grupos, subaba, onSubaba, contagens, direita, indice, soGrupos }: Props) {
  const grupoAtual = grupoDaSubaba(subaba);
  const doGrupo = grupos.find((grupo) => grupo.id === grupoAtual);
  if (!doGrupo) return null;
  const blocos = subabasDaBarra(doGrupo.subabas);
  const ativo = blocoAtivoDaBarra(subaba);
  if (indice) {
    return (
      <>
        <nav className="cen-indice" aria-label={`Seções de ${doGrupo.rotulo}`}>
          {blocos.map((id) => (
            <button key={id} type="button" className={`cen-indice-item${id === ativo ? " is-ativa" : ""}`} aria-current={id === ativo ? "page" : undefined} onClick={() => onSubaba(id)}>
              <span>{ROTULO_DA_SUBABA[id]}</span>
              {contagens?.[id] ? <span className="cen-indice-conta">{contagens[id]}</span> : null}
            </button>
          ))}
        </nav>
        <div className="cen-indice-select">
          <Select aria-label={`Seção de ${doGrupo.rotulo}`} value={ativo} className="cen-indice-escolha" onChange={(evento) => onSubaba(evento.target.value as SubAbaCentral)}>
            {blocos.map((id) => (
              <option key={id} value={id}>
                {ROTULO_DA_SUBABA[id]}
                {contagens?.[id] ? ` · ${contagens[id]}` : ""}
              </option>
            ))}
          </Select>
        </div>
      </>
    );
  }
  if (soGrupos) {
    return (
      <nav className="cen-barras cen-barras--grupos" aria-label="Central da Empresa">
        {grupos.length > 1 && (
          <div className="cen-barra cen-barra--grupos" role="tablist" aria-label="Grupos da Central">
            {grupos.map((grupo) => (
              <button key={grupo.id} type="button" role="tab" aria-selected={grupo.id === grupoAtual} className={`cen-bloco${grupo.id === grupoAtual ? " is-ativa" : ""}`} onClick={() => grupo.id !== grupoAtual && onSubaba(grupo.subabas[0])}>
                {grupo.rotulo}
              </button>
            ))}
          </div>
        )}
        <div className="cen-divisor" aria-hidden="true" />
      </nav>
    );
  }
  return (
    <nav className="cen-barras" aria-label="Central da Empresa">
      {grupos.length > 1 && (
        <div className="cen-barra cen-barra--grupos" role="tablist" aria-label="Grupos da Central">
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
      {(blocos.length > 1 || direita) && (
        <div className="cen-subrow">
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
          {direita ? <div className="cen-subdireita">{direita}</div> : null}
        </div>
      )}
      <div className="cen-divisor" aria-hidden="true" />
    </nav>
  );
}
