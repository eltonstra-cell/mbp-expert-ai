"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { formatarData } from "@/lib/dataLocal";
import { AVISO_SEM_NORMA_ESTADUAL, normasDisponiveis, temNormaEstadual } from "@/lib/normas";

export type DadosDaNorma = {
  normasAplicadas: string[];
  rtConfirmou: boolean;
};

type Props = {
  uf: string;
  municipio: string;
  normasAplicadas: string[];
  confirmacao?: { nome: string; em: string };
  responsavel: { nome: string; cargo: string; usuarioId?: string };
  podeEditar: boolean;
  somenteLeitura: boolean;
  /** Texto "Nome · Cargo" do responsável (fonte única: Empresa › Dados). */
  responsavelTexto?: string;
  onAlterarEmDados?: () => void;
  onSalvar: (dados: DadosDaNorma) => void;
};

/** "RDC 216/2004 (ANVISA) · federal"; a norma estadual já traz a UF no nome ("Portaria SES 799/2023 (RS)"), então não repete. */
function rotuloDaNorma(norma: { nome: string; esfera: string; uf?: string }): string {
  if (norma.esfera === "federal") return `${norma.nome} · federal`;
  return !norma.uf || norma.nome.includes(`(${norma.uf})`) ? norma.nome : `${norma.nome} · ${norma.uf}`;
}

// Empresas › Norma aplicável: normas do catálogo, confirmação do RT e responsável do estabelecimento.
export default function PcNormaAplicavel({ uf, municipio, normasAplicadas, confirmacao, responsavel, responsavelTexto, podeEditar, somenteLeitura, onAlterarEmDados, onSalvar }: Props) {
  const disponiveis = normasDisponiveis(uf);
  const [escolhidas, setEscolhidas] = useState<string[]>(normasAplicadas);
  const [rtConfirmou, setRtConfirmou] = useState(Boolean(confirmacao));
  const editavel = podeEditar && !somenteLeitura;

  const erroConfirmacao = rtConfirmou && escolhidas.length === 0 ? "Escolha ao menos uma norma para confirmar." : "";
  const valido = !erroConfirmacao;
  const mesmasNormas = escolhidas.length === normasAplicadas.length && escolhidas.every((id) => normasAplicadas.includes(id));
  const alterou = !mesmasNormas || rtConfirmou !== Boolean(confirmacao);
  const rs = uf.trim().toUpperCase() === "RS";

  return (
    <div className="norma-painel">
      <article className="ui-card priv-cartao">
        <div className="pc-card-head">
          <h2 className="ui-card-title">Norma aplicável</h2>
          <Pill tom={escolhidas.length > 0 ? "info" : "na"}>{escolhidas.length > 0 ? `${escolhidas.length} norma${escolhidas.length === 1 ? "" : "s"}` : "Nenhuma"}</Pill>
        </div>
        <p className="ui-row-sub priv-texto">
          Estado: {uf || "não informado"} · Município: {municipio || "não informado"}. Mude em Dados da empresa.
        </p>
        <>
            <div className="norma-lista" role="group" aria-label="Normas aplicadas">
              {disponiveis.map((norma) => (
                <label key={norma.id} className={`priv-opcao norma-opcao${escolhidas.includes(norma.id) ? " is-on" : ""}`}>
                  <input
                    type="checkbox"
                    checked={escolhidas.includes(norma.id)}
                    disabled={!editavel}
                    onChange={() => setEscolhidas((atual) => (atual.includes(norma.id) ? atual.filter((id) => id !== norma.id) : [...atual, norma.id]))}
                  />
                  <span>{rotuloDaNorma(norma)}</span>
                </label>
              ))}
            </div>
            {(!temNormaEstadual(uf) || rs) && (
              <div className="priv-faixa norma-aviso-unico" role="status">
                <span>
                  {!temNormaEstadual(uf) ? AVISO_SEM_NORMA_ESTADUAL : "Vigência da Portaria SES 799/2023: confirmar no diário oficial. Exigência municipal: confirmar com a Vigilância Sanitária."}
                </span>
              </div>
            )}
            <label className="pc-check priv-aceite">
              <input type="checkbox" checked={rtConfirmou} disabled={!editavel} onChange={(evento) => setRtConfirmou(evento.target.checked)} />
              <span>O RT confirmou estas normas</span>
            </label>
            {erroConfirmacao && <span className="ui-field-error">{erroConfirmacao}</span>}
            {confirmacao && rtConfirmou && (
              <p className="ui-row-sub priv-texto">
                Confirmado por {confirmacao.nome} em {formatarData(confirmacao.em)}.
              </p>
            )}
        </>
      </article>

      <article className="ui-card priv-cartao">
        <div className="pc-card-head">
          <h2 className="ui-card-title">Responsável do estabelecimento</h2>
          {onAlterarEmDados && !somenteLeitura && (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={onAlterarEmDados}>
              Alterar em Dados
            </button>
          )}
        </div>
        <p className="ui-row-sub priv-texto">Quem aprova e assina os POPs (RDC 216/2004, 4.11.2). O Consultor/RT revisa antes; o app nunca aprova sozinho. Definido uma vez, em Empresa › Dados.</p>
        <p className="norma-responsavel">{responsavelTexto || "Ainda não definido."}</p>
        {!responsavel.usuarioId && <p className="ui-row-sub priv-texto">Sem pessoa de Acessos vinculada, ninguém consegue aprovar POP nesta empresa.</p>}
      </article>
      {somenteLeitura ? (
        <p className="ui-row-sub priv-texto">Alterar no computador.</p>
      ) : editavel ? (
        <div className="cen-salvar">
          <span className={`cen-salvar-aviso${alterou ? " is-pendente" : ""}`}>{alterou ? "● Alterações ainda não salvas" : "✓ Todas as alterações desta área estão salvas"}</span>
          <button type="button" className="ui-btn ui-btn--save" disabled={!valido || !alterou} onClick={() => onSalvar({ normasAplicadas: escolhidas, rtConfirmou })}>
            Salvar
          </button>
        </div>
      ) : null}
    </div>
  );
}
