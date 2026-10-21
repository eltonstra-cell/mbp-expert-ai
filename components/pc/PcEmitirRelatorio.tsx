"use client";

import { useState } from "react";
import { AVISO_CRN_VAZIO, AVISO_SEM_ICP, ROTULO_EMITIR_SEM_CRN, emissaoLiberada, motivoDoBotaoDesabilitado } from "@/lib/relatorioEmitido";
import { confirmar } from "@/lib/dialogos";

type Props = {
  /** Já existe relatório emitido desta visita: a emissão é a próxima versão. */
  versaoAnterior?: { numero: string; versao: number };
  assinante: string;
  /** Cargo que sai na assinatura (não o perfil de acesso). */
  cargo?: string;
  crn: string;
  /** Leva a Acessos para preencher o CRN (só quem gerencia acessos); sem isso o aviso manda pedir ao Administrador. */
  onPreencherCrn?: () => void;
  emitindo: boolean;
  erro: string;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
};

// Confirmação antes de emitir: número e data vêm do servidor; a assinatura é o nome e o CRN do RT, sem certificado digital.
export default function PcEmitirRelatorio({ versaoAnterior, assinante, cargo, crn, onPreencherCrn, emitindo, erro, onConfirmar, onCancelar }: Props) {
  const [semCrn, setSemCrn] = useState(false);
  const [motivo, setMotivo] = useState("");
  // O campo do motivo só mostra erro depois de tocado ou digitado (ou ao tentar emitir); abre sem vermelho.
  const [motivoTocado, setMotivoTocado] = useState(false);
  const [tentouEmitir, setTentouEmitir] = useState(false);
  const erroMotivo = versaoAnterior && motivo.trim().length < 5 ? "Explique o que mudou (mínimo de 5 letras)." : "";
  const mostrarErro = Boolean(erroMotivo && (motivoTocado || tentouEmitir));

  // Com texto digitado, fechar pede confirmação (o motivo seria perdido).
  async function pedirParaFechar() {
    if (motivo.trim() && !(await confirmar("Descartar o motivo digitado e fechar?", { titulo: "Fechar sem emitir", confirmarRotulo: "Descartar e fechar", cancelarRotulo: "Continuar editando", perigoso: true }))) return;
    onCancelar();
  }
  return (
    <div className="pc-modal-layer" role="presentation">
      {/* Clicar fora NÃO fecha: o motivo digitado não se perde. Só Cancelar ou o X fecham. */}
      <div className="pc-modal-backdrop" />
      <section className="pc-modal" role="dialog" aria-modal="true" aria-label="Emitir relatório">
        <button type="button" className="pc-modal-x" aria-label="Fechar" disabled={emitindo} onClick={() => void pedirParaFechar()}>
          ×
        </button>
        <h2 className="pc-modal-title">{versaoAnterior ? `Emitir a versão ${versaoAnterior.versao + 1} de ${versaoAnterior.numero}` : "Emitir relatório assinado"}</h2>
        <p className="pc-modal-texto">
          {versaoAnterior
            ? `O número continua ${versaoAnterior.numero}. O conteúdo é guardado como está agora e não muda depois.`
            : "O número (por exemplo, PC-2026-0042) é atribuído pelo servidor. O conteúdo é guardado como está agora e não muda depois; para corrigir, emita a versão 2."}
        </p>
        <p className="pc-modal-texto">
          Assinatura: <b>{assinante}</b>, {cargo || "Responsável técnico"} · {crn || "CRN a preencher"}
        </p>
        {!crn.trim() && (
          <div className="emitir-crn-alerta" role="alert">
            <strong>{AVISO_CRN_VAZIO}</strong>
            {onPreencherCrn ? (
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onPreencherCrn} disabled={emitindo}>
                Preencher agora
              </button>
            ) : (
              <span>Peça ao Administrador para preencher em Acessos.</span>
            )}
            <label className="emitir-crn-confirma">
              <input type="checkbox" checked={semCrn} onChange={(evento) => setSemCrn(evento.target.checked)} />
              <span>{ROTULO_EMITIR_SEM_CRN}</span>
            </label>
          </div>
        )}
        <div className="priv-faixa" role="note">
          <span>{AVISO_SEM_ICP}</span>
        </div>
        {versaoAnterior && (
          <label className="pc-field">
            <span className="ui-eyebrow">Motivo da nova versão</span>
            <input
              className={`ui-input${mostrarErro ? " is-invalid" : ""}`}
              value={motivo}
              onChange={(evento) => {
                setMotivo(evento.target.value);
                setMotivoTocado(true);
              }}
              onBlur={() => motivo && setMotivoTocado(true)}
              aria-invalid={mostrarErro}
              autoFocus
            />
            {mostrarErro && <span className="ui-field-error">{erroMotivo}</span>}
          </label>
        )}
        {erro && <span className="ui-field-error">{erro}</span>}
        <div className="pc-modal-foot">
          <span />
          <div className="ui-footer-actions">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => void pedirParaFechar()} disabled={emitindo}>
              Cancelar
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--save"
              disabled={emitindo || !emissaoLiberada(crn, semCrn)}
              aria-describedby="emitir-motivo-bloqueio"
              onClick={() => {
                setTentouEmitir(true);
                if (!erroMotivo) onConfirmar(motivo.trim());
              }}
            >
              {emitindo ? "Emitindo…" : "Emitir"}
            </button>
          </div>
        </div>
        {motivoDoBotaoDesabilitado({ crn, confirmouSemCrn: semCrn, precisaMotivo: Boolean(versaoAnterior), motivoValido: !erroMotivo }) && (
          <p id="emitir-motivo-bloqueio" className="emitir-bloqueio">
            {motivoDoBotaoDesabilitado({ crn, confirmouSemCrn: semCrn, precisaMotivo: Boolean(versaoAnterior), motivoValido: !erroMotivo })}
          </p>
        )}
      </section>
    </div>
  );
}
