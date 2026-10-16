"use client";

import { mensagemDoRelatorio, pendenciasDoRelatorio, type DestinoConferencia, type LinhaConferencia } from "@/lib/reportCheck";

export type SecaoRelatorio = "resumo" | "ambientes" | "ncs" | "evidencias" | "pops";

export const SECOES_RELATORIO: { chave: SecaoRelatorio; rotulo: string; texto: string }[] = [
  { chave: "resumo", rotulo: "Resumo e indicadores", texto: "Panorama da inspeção e números principais" },
  { chave: "ambientes", rotulo: "Resultado por ambiente", texto: "Resumo do checklist por ambiente" },
  { chave: "ncs", rotulo: "Não conformidades e plano de ação", texto: "Achados com ação, responsável e prazo" },
  { chave: "evidencias", rotulo: "Evidências", texto: "Fotos e registros de campo" },
  { chave: "pops", rotulo: "POPs relacionados", texto: "Programas de controle e POPs" },
];

type Props = {
  empresa: string;
  data: string;
  linhas: LinhaConferencia[];
  secoes: Record<SecaoRelatorio, boolean>;
  onSecao: (chave: SecaoRelatorio, valor: boolean) => void;
  podeGerar: boolean;
  podeOficial: boolean;
  gerando: boolean;
  concluida: boolean;
  podeConcluir: boolean;
  onIr: (destino: DestinoConferencia) => void;
  onPrevia: () => void;
  onParcial: () => void;
  onOficial: () => void;
  onFinalizar: () => void;
  onReabrir: () => void;
  onVoltar: () => void;
};

export default function PcRelatorio({
  empresa,
  data,
  linhas,
  secoes,
  onSecao,
  podeGerar,
  podeOficial,
  gerando,
  concluida,
  podeConcluir,
  onIr,
  onPrevia,
  onParcial,
  onOficial,
  onFinalizar,
  onReabrir,
  onVoltar,
}: Props) {
  const pendencias = pendenciasDoRelatorio(linhas);
  const mensagem = mensagemDoRelatorio(pendencias);

  return (
    <section className="ui-screen" aria-label="Relatório da visita">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Relatório</h1>
          <p className="ui-subtitle">
            {empresa} · {data} · {concluida ? "inspeção concluída" : "inspeção em andamento"}
          </p>
        </div>
        <div className="ui-head-actions">
          {podeConcluir &&
            (concluida ? (
              <button type="button" className="ui-btn ui-btn--secondary" onClick={onReabrir}>
                Reabrir inspeção
              </button>
            ) : (
              <button type="button" className="ui-btn ui-btn--secondary" onClick={onFinalizar}>
                Finalizar inspeção
              </button>
            ))}
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Central
          </button>
        </div>
      </div>

      <div className={`pc-rep-banner ${mensagem.pronto ? "is-ok" : "is-warn"}`} role="status">
        {mensagem.texto}
      </div>

      <div className="pc-rep-cols">
        <div className="ui-card pc-rep-card">
          <h2 className="ui-card-title">Conferência antes de emitir</h2>
          <div>
            <ul className="pc-check-list">
              {linhas.map((linha) => (
                <li key={linha.chave} className="pc-check-row">
                  <span className={`pc-check-icon ${linha.ok ? "is-ok" : "is-warn"}`} aria-label={linha.ok ? "Conferido" : "Pendente"}>
                    {linha.ok ? "✓" : "!"}
                  </span>
                  <span className="pc-check-text">
                    <span className="pc-rep-item-title">{linha.rotulo}</span>
                    <span className="ui-row-sub">{linha.resumo}</span>
                  </span>
                  {!linha.ok && (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onIr(linha.chave)}>
                      {linha.acao}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="ui-card pc-rep-card">
          <h2 className="ui-card-title">Conteúdo do relatório</h2>
          <p className="ui-row-sub">As caixas desmarcadas não entram no PDF.</p>
          <div>
            <ul className="pc-check-list">
              {SECOES_RELATORIO.map((secao) => (
                <li key={secao.chave}>
                  <label className="pc-content-row">
                    <input type="checkbox" checked={secoes[secao.chave]} onChange={(evento) => onSecao(secao.chave, evento.target.checked)} />
                    <span className="pc-check-text">
                      <span className="pc-rep-item-title">{secao.rotulo}</span>
                      <span className="ui-row-sub">{secao.texto}</span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <div className="ui-footer">
        <span className="ui-row-sub">
          {podeGerar ? "O PDF é gerado a partir do relatório completo da visita." : "Seu perfil não pode gerar o PDF."}
        </span>
        <div className="ui-footer-actions">
          {podeGerar && (
            <>
              <button type="button" className="ui-btn ui-btn--secondary" disabled={gerando} onClick={onPrevia}>
                {gerando ? "Gerando PDF..." : "Gerar prévia em PDF"}
              </button>
              <button type="button" className="ui-btn ui-btn--secondary" disabled={gerando} onClick={onParcial}>
                Emitir como parcial
              </button>
              {podeOficial && (
                <button
                  type="button"
                  className="ui-btn ui-btn--save"
                  disabled={gerando || pendencias > 0}
                  title={pendencias > 0 ? "Resolva as pendências para emitir a versão oficial" : undefined}
                  onClick={onOficial}
                >
                  Emitir versão oficial
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
