"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
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

// Empresas › Norma aplicável: normas do catálogo, confirmação do RT e responsável do estabelecimento.
export default function PcNormaAplicavel({ uf, municipio, normasAplicadas, confirmacao, responsavel, responsavelTexto, podeEditar, somenteLeitura, onAlterarEmDados, onSalvar }: Props) {
  const disponiveis = normasDisponiveis(uf);
  const [escolhidas, setEscolhidas] = useState<string[]>(normasAplicadas);
  const [rtConfirmou, setRtConfirmou] = useState(Boolean(confirmacao));
  const editavel = podeEditar && !somenteLeitura;

  const erroConfirmacao = rtConfirmou && escolhidas.length === 0 ? "Escolha ao menos uma norma para confirmar." : "";
  const valido = !erroConfirmacao;
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
                  <span>
                    {norma.nome} · {norma.esfera === "federal" ? "federal" : norma.uf}
                  </span>
                </label>
              ))}
            </div>
            {disponiveis.some((norma) => escolhidas.includes(norma.id) && norma.id === "rdc-216-2004") && (
              <p className="ui-row-sub priv-texto">Conferir no texto oficial da ANVISA antes de usar com clientes.</p>
            )}
            {!temNormaEstadual(uf) && (
              <div className="priv-faixa" role="status">
                <span>{AVISO_SEM_NORMA_ESTADUAL}</span>
              </div>
            )}
            {rs && (
              <div className="norma-avisos">
                <div className="priv-faixa" role="status">
                  <span>Vigência da Portaria SES 799/2023: confirmar no diário oficial.</span>
                </div>
                <div className="priv-faixa" role="status">
                  <span>Exigência municipal: confirmar com a Vigilância Sanitária.</span>
                </div>
              </div>
            )}
            <label className="pc-check priv-aceite">
              <input type="checkbox" checked={rtConfirmou} disabled={!editavel} onChange={(evento) => setRtConfirmou(evento.target.checked)} />
              <span>O RT confirmou estas normas</span>
            </label>
            {erroConfirmacao && <span className="ui-field-error">{erroConfirmacao}</span>}
            {confirmacao && rtConfirmou && (
              <p className="ui-row-sub priv-texto">
                Confirmado por {confirmacao.nome} em {new Date(confirmacao.em).toLocaleDateString("pt-BR")}.
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
        <div className="priv-acoes">
          <button type="button" className="ui-btn ui-btn--save ui-btn--small" disabled={!valido} onClick={() => onSalvar({ normasAplicadas: escolhidas, rtConfirmou })}>
            Salvar norma
          </button>
        </div>
      ) : null}
    </div>
  );
}
