"use client";

import { useState } from "react";

import { mensagemDoRelatorio, pendenciasDoRelatorio, type DestinoConferencia, type LinhaConferencia } from "@/lib/reportCheck";
import { TEXTO_DO_RASCUNHO, type EstadoDoRelatorio } from "@/lib/relatorioDaVisita";

export type SecaoRelatorio = "resumo" | "ambientes" | "ncs" | "evidencias" | "pops";

export const SECOES_RELATORIO: { chave: SecaoRelatorio; rotulo: string; texto: string }[] = [
  { chave: "resumo", rotulo: "Resumo e indicadores", texto: "Panorama da inspeção e números principais" },
  { chave: "ambientes", rotulo: "Resultado por ambiente", texto: "Resumo do checklist por ambiente" },
  { chave: "ncs", rotulo: "Correções", texto: "Achados com ação, responsável e prazo" },
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
  concluida: boolean;
  podeConcluir: boolean;
  onIr: (destino: DestinoConferencia) => void;
  /** PDF pela impressão do navegador (texto selecionável). */
  onSelecionavel: (tipo: "previa" | "parcial" | "oficial") => void;
  onFinalizar: () => void;
  /** Aviso na hora, no botão: texto vazio = pode finalizar / emitir. */
  avisoFinalizar?: string;
  avisoEmitir?: string;
  onReabrir: () => void;
  /** RT e Administrador emitem o relatório assinado (número e data atribuídos pelo servidor). */
  podeEmitir?: boolean;
  emitido?: { numero: string; versao: number };
  /** Rascunho até o RT emitir; depois Emitido. */
  estado?: EstadoDoRelatorio;
  /** Abre a janela "Revisar" (relatório já montado, parecer do RT, "Confirmar e emitir"). */
  onRevisar?: () => void;
  onEmitir?: () => void;
  onVerEmitidos?: () => void;
};

export default function PcRelatorio({
  empresa,
  data,
  linhas,
  secoes,
  onSecao,
  podeGerar,
  podeOficial,
  concluida,
  podeConcluir,
  onIr,
  onSelecionavel,
  onFinalizar,
  avisoFinalizar = "",
  avisoEmitir = "",
  onReabrir,
  podeEmitir = false,
  emitido,
  estado,
  onRevisar,
  onEmitir,
  onVerEmitidos,
}: Props) {
  const [menuSel, setMenuSel] = useState(false);
  const pendencias = pendenciasDoRelatorio(linhas);
  const mensagem = mensagemDoRelatorio(pendencias);

  return (
    <section className="ui-screen" aria-label="Relatório da visita">
      <div className="ui-head">
        <h1 className="sr-only">Relatório da visita de {data}</h1>
        <div className="ui-head-actions">
          {podeGerar && (
            <div className="pc-sel-pdf">
              <button type="button" className="ui-btn ui-btn--soft" aria-haspopup="menu" aria-expanded={menuSel} onClick={() => setMenuSel((valor) => !valor)}>
                Gerar PDF ▾
              </button>
              {menuSel && (
                <div className="pc-sel-pdf-menu" role="menu">
                  {(
                    [
                      ["previa", "Prévia"],
                      ["parcial", "Parcial"],
                      ["oficial", "Oficial"],
                    ] as ["previa" | "parcial" | "oficial", string][]
                  ).map(([tipo, rotulo]) => (
                    <button
                      key={tipo}
                      type="button"
                      role="menuitem"
                      className="ui-menu-item"
                      disabled={tipo === "oficial" && (!podeOficial || pendencias > 0)}
                      title={tipo === "oficial" && (!podeOficial || pendencias > 0) ? "Resolva as pendências para emitir a versão oficial" : undefined}
                      onClick={() => {
                        setMenuSel(false);
                        onSelecionavel(tipo);
                      }}
                    >
                      {rotulo}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {onRevisar && (
            <button type="button" className="ui-btn ui-btn--secondary rev-botao" onClick={onRevisar}>
              Revisar
            </button>
          )}
          {onVerEmitidos && (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onVerEmitidos}>
              Relatórios emitidos
            </button>
          )}
          {podeEmitir && onEmitir && (
            <span className="rel-acao-com-aviso">
              <button type="button" className={`ui-btn ui-btn--primary${avisoEmitir ? " is-apagado" : ""}`} aria-disabled={Boolean(avisoEmitir)} aria-describedby={avisoEmitir ? "aviso-emitir" : undefined} onClick={avisoEmitir ? undefined : onEmitir}>
                {emitido ? `Confirmar e emitir versão ${emitido.versao + 1}` : "Confirmar e emitir"}
              </button>
              {avisoEmitir && <span id="aviso-emitir" className="ui-field-error" role="status">{avisoEmitir}</span>}
            </span>
          )}
          {podeConcluir &&
            (concluida ? (
              <button type="button" className="ui-btn ui-btn--secondary" onClick={onReabrir}>
                Reabrir inspeção
              </button>
            ) : (
              <span className="rel-acao-com-aviso">
                <button type="button" className={`ui-btn ui-btn--secondary${avisoFinalizar ? " is-apagado" : ""}`} aria-disabled={Boolean(avisoFinalizar)} aria-describedby={avisoFinalizar ? "aviso-finalizar" : undefined} onClick={avisoFinalizar ? undefined : onFinalizar}>
                  Finalizar inspeção
                </button>
                {avisoFinalizar && <span id="aviso-finalizar" className="ui-field-error" role="status">{avisoFinalizar}</span>}
              </span>
            ))}
        </div>
      </div>

      {estado && (
        <div className="rev-faixa" role="status">
          <span className={`rev-estado rev-estado--${estado.estado === "Emitido" ? "emitido" : "rascunho"}`}>{estado.estado === "Emitido" ? `Emitido · ${estado.numero} versão ${estado.versao}` : "Rascunho"}</span>
          <span>{estado.estado === "Emitido" ? "Alterar o parecer gera uma nova versão; a anterior fica guardada." : TEXTO_DO_RASCUNHO}</span>
        </div>
      )}
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
                  {!linha.ok && linha.acao && (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onIr(linha.chave)}>
                      {linha.acao}
                    </button>
                  )}
                  {!linha.ok && !linha.acao && linha.semAcao && <span className="ui-row-sub">{linha.semAcao}</span>}
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
                  <label className="pc-content-row" title={secao.texto}>
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
          {podeGerar ? "Use \"Gerar PDF\" para a prévia, o parcial ou a versão oficial (texto selecionável)." : "Seu perfil não pode gerar o PDF."}
        </span>
      </div>
    </section>
  );
}
