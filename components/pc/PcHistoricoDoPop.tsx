"use client";

import type { ProcedimentoOperacionalPadronizado } from "@/types";
import { formatarData } from "@/lib/dataLocal";
import { atividadeDoPop, versoesDoHistorico } from "@/lib/popHistorico";

// Aba Histórico: dois blocos, Versões e Atividade (linha do tempo). Só mostra o que o POP já guarda.
export default function PcHistoricoDoPop({ pop, onBaixarPdf, ocultarNomes = false }: { pop: ProcedimentoOperacionalPadronizado; onBaixarPdf?: () => void; ocultarNomes?: boolean }) {
  const versoes = versoesDoHistorico(pop, { ocultarNomes });
  const atividade = atividadeDoPop(pop, { ocultarNomes });
  return (
    <div className="hist">
      <section className="hist-bloco" aria-label="Versões">
        <header className="reg-bloco-topo">
          <h3 className="reg-bloco-titulo">Versões</h3>
          {onBaixarPdf && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onBaixarPdf}>
              Baixar PDF da vigente
            </button>
          )}
        </header>
        <ul className="hist-versoes">
          {versoes.map((versao) => (
            <li key={versao.versao} className={`hist-versao hist-versao--${versao.estado}`}>
              <span className="hist-versao-n">v{versao.versao}</span>
              <span className="hist-versao-textos">
                <span className="hist-versao-estado">{versao.rotulo}</span>
                <span className="hist-versao-detalhe">
                  {versao.aprovadaPor && versao.aprovadaEm ? `Aprovada por ${versao.aprovadaPor} em ${formatarData(versao.aprovadaEm)}` : "Ainda não aprovada"}
                  {versao.motivo ? ` · ${versao.motivo}` : ""}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="hist-bloco" aria-label="Atividade">
        <header className="reg-bloco-topo">
          <h3 className="reg-bloco-titulo">Atividade</h3>
        </header>
        {atividade.length === 0 ? (
          <p className="ui-row-sub">Nenhuma atividade registrada ainda.</p>
        ) : (
          <ol className="hist-linha-do-tempo scroll-fino">
            {atividade.map((evento) => (
              <li key={evento.chave} className="hist-evento">
                <i className={`hist-ponto hist-ponto--${evento.tom}`} aria-hidden="true" />
                <span className="hist-evento-texto">{evento.texto}</span>
                <span className="hist-evento-data">{formatarData(evento.em)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}
