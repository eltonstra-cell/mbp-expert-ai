"use client";

import { useState } from "react";
import { ListRow } from "@/components/ui/ListRow";
import { Pill, type Tom } from "@/components/ui/Pill";
import { StatStrip } from "@/components/ui/StatStrip";
import type { LinhaPopVisita, SituacaoPopVisita } from "@/lib/pops";

type Props = {
  empresa: string;
  data: string;
  resumo: { totalNcs: number; ncsComPop: number; rascunho: number; aCriar: number; aprovados: number; semPop: number[] };
  linhas: LinhaPopVisita[];
  podeCriar: boolean;
  onCriar: (codigo: string) => void;
  onAbrir: () => void;
  onCriarTodos: () => void;
  onContinuar: () => void;
  onTodosPops: () => void;
  onVoltar: () => void;
};

const ROTULO: Record<SituacaoPopVisita, string> = {
  "a-criar": "A criar",
  rascunho: "Em rascunho",
  "em-revisao": "Em revisão",
  aprovado: "Aprovado",
  inativo: "Inativo",
};
const TOM: Record<SituacaoPopVisita, Tom> = { "a-criar": "nc", rascunho: "pend", "em-revisao": "info", aprovado: "ok", inativo: "na" };

const codigoNc = (n: number) => `NC${String(n).padStart(2, "0")}`;

function faixaDeNcs(ncs: number[]) {
  return ncs.length > 3 ? `${codigoNc(ncs[0])}–${ncs[ncs.length - 1]}` : ncs.map(codigoNc).join(", ");
}

export default function PcPopsVisita({ empresa, data, resumo, linhas, podeCriar, onCriar, onAbrir, onCriarTodos, onContinuar, onTodosPops, onVoltar }: Props) {
  const [confirmando, setConfirmando] = useState(false);
  const faltantes = linhas.filter((linha) => linha.situacao === "a-criar");

  return (
    <section className="ui-screen" aria-label="POPs da visita">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">POPs da visita</h1>
          <p className="ui-subtitle">
            Procedimentos sugeridos para as não conformidades · {empresa} · {data}
          </p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="pc-link-btn" onClick={onTodosPops}>
            Ver todos os POPs da empresa →
          </button>
          {podeCriar && (
            <button type="button" className="ui-btn ui-btn--primary" disabled={faltantes.length === 0} onClick={() => setConfirmando(true)}>
              {faltantes.length === 0 ? "Criar POPs de uma vez" : faltantes.length === 1 ? "Criar 1 POP de uma vez" : `Criar os ${faltantes.length} POPs de uma vez`}
            </button>
          )}
        </div>
      </div>

      <StatStrip
        rotulo="Resumo dos POPs da visita"
        itens={[
          { rotulo: `NCs com POP sugerido ${resumo.ncsComPop} de ${resumo.totalNcs}`, valor: resumo.ncsComPop, tom: "info" },
          { rotulo: "Em rascunho", valor: resumo.rascunho, tom: "amber" },
          { rotulo: "A criar", valor: resumo.aCriar, tom: "nc" },
          { rotulo: "Aprovados", valor: resumo.aprovados, tom: "ok" },
        ]}
      />

      <div className="ui-scroll">
        {linhas.length === 0 ? (
          <div className="ui-empty">
            {resumo.totalNcs === 0 ? "Esta visita não tem não conformidades; não há POPs a sugerir." : "Nenhuma das não conformidades tem POP sugerido no Manual."}
          </div>
        ) : (
          <div className="ui-list">
            {linhas.map((linha) => (
              <ListRow
                key={linha.sugestao.codigo}
                faixa={TOM[linha.situacao]}
                icone={<span aria-hidden="true">≡</span>}
                titulo={linha.sugestao.titulo}
                secundario={`${linha.sugestao.codigo} · NCs: ${faixaDeNcs(linha.ncs)}`}
                pilulas={<Pill tom={TOM[linha.situacao]}>{ROTULO[linha.situacao]}</Pill>}
                acao={
                  linha.situacao === "a-criar" ? (
                    podeCriar ? (
                      <button type="button" className="ui-btn ui-btn--primary" onClick={() => onCriar(linha.sugestao.codigo)}>
                        Criar POP
                      </button>
                    ) : null
                  ) : (
                    <button type="button" className="ui-btn ui-btn--secondary" onClick={onAbrir}>
                      Abrir
                    </button>
                  )
                }
              />
            ))}
          </div>
        )}
        {resumo.semPop.length > 0 && (
          <p className="ui-row-sub pc-sem-pop">
            Sem POP sugerido: {resumo.semPop.map(codigoNc).join(", ")}. O Manual só relaciona POPs a programas de controle.
          </p>
        )}
      </div>

      <div className="ui-footer">
        <span className="ui-row-sub">Os POPs ficam na biblioteca da empresa e podem ser editados lá.</span>
        <div className="ui-footer-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Central
          </button>
          <button type="button" className="ui-btn ui-btn--save" onClick={onContinuar}>
            Continuar para o Relatório →
          </button>
        </div>
      </div>

      {confirmando && (
        <div className="pc-modal-layer" role="presentation">
          <div className="pc-modal-backdrop" onClick={() => setConfirmando(false)} />
          <section className="pc-modal" role="dialog" aria-modal="true" aria-label="Criar os POPs de uma vez">
            <h2 className="pc-modal-title">Criar {faltantes.length} {faltantes.length === 1 ? "POP" : "POPs"} como rascunho?</h2>
            <p className="ui-row-sub">Só serão criados rascunhos dos POPs que ainda não existem. Nenhum POP existente é alterado.</p>
            <ul className="pc-modal-ul">
              {faltantes.map((linha) => (
                <li key={linha.sugestao.codigo}>
                  {linha.sugestao.codigo} · {linha.sugestao.titulo}
                </li>
              ))}
            </ul>
            <div className="pc-modal-foot">
              <span />
              <div className="ui-footer-actions">
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setConfirmando(false)}>
                  Cancelar
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn--primary"
                  onClick={() => {
                    onCriarTodos();
                    setConfirmando(false);
                  }}
                >
                  Criar rascunhos
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
