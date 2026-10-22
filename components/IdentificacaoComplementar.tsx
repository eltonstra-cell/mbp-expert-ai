"use client";

import { useState } from "react";
import { CAMPOS_DA_IDENTIFICACAO, identificacaoCompleta, resumoDaIdentificacao, type CampoDaIdentificacao } from "@/lib/manualIdentificacao";

type Props = {
  valores: Record<CampoDaIdentificacao, string>;
  rotulos: Record<string, string>;
  /** Campos que vieram do perfil do RT e ainda não foram editados (selo "do perfil do RT"). */
  doPerfil: CampoDaIdentificacao[];
  onChange: (campo: CampoDaIdentificacao, valor: string) => void;
};

// Cartão recolhível: resumo "N de T preenchidos" + selo de pendente; 3 colunas com campos de 40 px; recolhido por padrão quando completo.
export default function IdentificacaoComplementar({ valores, rotulos, doPerfil, onChange }: Props) {
  const completa = identificacaoCompleta(valores);
  const [aberto, setAberto] = useState(!completa);

  return (
    <section className="idc" aria-label="Identificação complementar do Manual">
      <button type="button" className="idc-topo" aria-expanded={aberto} aria-controls="idc-corpo" onClick={() => setAberto((atual) => !atual)}>
        <span className="idc-textos">
          <span className="idc-titulo">Identificação complementar do Manual</span>
          <span className="idc-apoio">Dados técnicos, elaboração, revisão e aprovação.</span>
        </span>
        <span className="idc-resumo">{resumoDaIdentificacao(valores)}</span>
        {!completa && <span className="idc-pendente">Pendente</span>}
        <span className="idc-seta" aria-hidden="true">{aberto ? "▴" : "▾"}</span>
      </button>
      {aberto && (
        <div id="idc-corpo" className="idc-grade">
          {CAMPOS_DA_IDENTIFICACAO.map((campo) => (
            <label key={campo} className="idc-campo">
              <span className="idc-rotulo">
                {rotulos[campo] || campo}
                {doPerfil.includes(campo) && <span className="idc-selo">do perfil do RT</span>}
              </span>
              <input type={campo === "dataElaboracaoManual" ? "date" : "text"} className="idc-input" value={valores[campo]} onChange={(evento) => onChange(campo, evento.target.value)} />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
