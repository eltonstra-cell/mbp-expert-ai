"use client";

import { useState } from "react";
import { AVISO_SEM_ICP } from "@/lib/relatorioEmitido";

type Props = {
  /** Já existe relatório emitido desta visita: a emissão é a próxima versão. */
  versaoAnterior?: { numero: string; versao: number };
  assinante: string;
  /** Cargo que sai na assinatura (não o perfil de acesso). */
  cargo?: string;
  crn: string;
  emitindo: boolean;
  erro: string;
  onConfirmar: (motivo: string) => void;
  onCancelar: () => void;
};

// Confirmação antes de emitir: número e data vêm do servidor; a assinatura é o nome e o CRN do RT, sem certificado digital.
export default function PcEmitirRelatorio({ versaoAnterior, assinante, cargo, crn, emitindo, erro, onConfirmar, onCancelar }: Props) {
  const [motivo, setMotivo] = useState("");
  // O campo do motivo só mostra erro depois de tocado ou digitado (ou ao tentar emitir); abre sem vermelho.
  const [motivoTocado, setMotivoTocado] = useState(false);
  const [tentouEmitir, setTentouEmitir] = useState(false);
  const erroMotivo = versaoAnterior && motivo.trim().length < 5 ? "Explique o que mudou (mínimo de 5 letras)." : "";
  const mostrarErro = Boolean(erroMotivo && (motivoTocado || tentouEmitir));
  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={emitindo ? undefined : onCancelar} />
      <section className="pc-modal" role="dialog" aria-modal="true" aria-label="Emitir relatório">
        <h2 className="pc-modal-title">{versaoAnterior ? `Emitir a versão ${versaoAnterior.versao + 1} de ${versaoAnterior.numero}` : "Emitir relatório assinado"}</h2>
        <p className="pc-modal-texto">
          {versaoAnterior
            ? `O número continua ${versaoAnterior.numero}; a data e a hora são atribuídas pelo servidor na emissão.`
            : "O número (por exemplo, PC-2026-0042), a data e a hora são atribuídos pelo servidor na emissão."}{" "}
          O conteúdo é guardado como está agora e não muda depois
          {versaoAnterior ? "; a versão anterior continua guardada" : "; para corrigir, emita a versão 2"}.
        </p>
        <p className="pc-modal-texto">
          Assinatura: <b>{assinante}</b>, {cargo || "Responsável técnico"} · {crn || "CRN a preencher"}
        </p>
        {!crn && <div className="priv-faixa" role="alert"><span>O CRN ainda não está no cadastro. O relatório sairá com “CRN a preencher”; cadastre em Acessos antes de emitir, se puder.</span></div>}
        <div className="priv-faixa" role="note"><span>{AVISO_SEM_ICP}</span></div>
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
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onCancelar} disabled={emitindo}>
              Cancelar
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--save"
              disabled={emitindo}
              onClick={() => {
                setTentouEmitir(true);
                if (!erroMotivo) onConfirmar(motivo.trim());
              }}
            >
              {emitindo ? "Emitindo…" : "Emitir"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
