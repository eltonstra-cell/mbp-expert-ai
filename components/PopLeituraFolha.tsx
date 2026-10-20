"use client";

import { useEffect } from "react";
import { linhasDoConteudo, popVigente } from "@/lib/popsNorma";
import type { ProcedimentoOperacionalPadronizado } from "@/types";

type Props = {
  pop: ProcedimentoOperacionalPadronizado;
  onFechar: () => void;
};

// Folha de leitura do POP vigente (aprovado). Só leitura: nada aqui altera o POP.
export default function PopLeituraFolha({ pop, onFechar }: Props) {
  const vigente = popVigente(pop);

  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [onFechar]);

  const linhas = vigente ? linhasDoConteudo(vigente.conteudo).filter((linha) => linha.valor.trim()) : [];

  return (
    <div className="pc-modal-layer pop-leitura-camada" role="presentation">
      <div className="pc-modal-backdrop" onClick={onFechar} />
      <section className="pc-modal pop-leitura" role="dialog" aria-modal="true" aria-label={`POP ${pop.codigo} ${pop.titulo}`}>
        <header className="pop-leitura-topo">
          <div>
            <h2 className="pc-modal-title">
              {pop.codigo ? `${pop.codigo} · ` : ""}
              {pop.titulo}
            </h2>
            {vigente && (
              <p className="ui-row-sub">
                Versão {vigente.versao} aprovada
                {vigente.aprovacao ? ` por ${vigente.aprovacao.nome}${vigente.aprovacao.cargo ? ` (${vigente.aprovacao.cargo})` : ""} em ${new Date(vigente.aprovacao.em).toLocaleDateString("pt-BR")}` : ""} · somente leitura
              </p>
            )}
          </div>
        </header>
        <div className="pop-leitura-corpo">
          {!vigente ? (
            <p className="ui-row-sub">Este POP ainda não tem versão aprovada.</p>
          ) : linhas.length === 0 ? (
            <p className="ui-row-sub">A versão aprovada não tem campos preenchidos.</p>
          ) : (
            <dl className="pop-leitura-lista">
              {linhas.map((linha, indice) => (
                <div key={`${linha.campo}-${indice}`} className="pop-leitura-linha">
                  <dt className="ui-eyebrow">{linha.campo}</dt>
                  <dd>{linha.valor}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
        <div className="pc-modal-foot">
          <span />
          <div className="ui-footer-actions">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onFechar} autoFocus>
              Fechar
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
