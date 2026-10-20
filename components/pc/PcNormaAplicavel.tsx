"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { AVISO_SEM_NORMA_ESTADUAL, normasDisponiveis, temNormaEstadual } from "@/lib/normas";

export type PessoaVinculavel = { id: string; nome: string; perfil: string };

export type DadosDaNorma = {
  normasAplicadas: string[];
  rtConfirmou: boolean;
  responsavel: { nome: string; cargo: string; usuarioId?: string };
};

type Props = {
  uf: string;
  municipio: string;
  normasAplicadas: string[];
  confirmacao?: { nome: string; em: string };
  responsavel: { nome: string; cargo: string; usuarioId?: string };
  pessoas: PessoaVinculavel[];
  podeEditar: boolean;
  /** Só o Administrador escolhe a pessoa de Acessos que aprova os POPs. */
  podeVincular: boolean;
  somenteLeitura: boolean;
  onSalvar: (dados: DadosDaNorma) => void;
};

// Empresas › Norma aplicável: normas do catálogo, confirmação do RT e responsável do estabelecimento.
export default function PcNormaAplicavel({ uf, municipio, normasAplicadas, confirmacao, responsavel, pessoas, podeEditar, podeVincular, somenteLeitura, onSalvar }: Props) {
  const disponiveis = normasDisponiveis(uf);
  const [escolhidas, setEscolhidas] = useState<string[]>(normasAplicadas);
  const [rtConfirmou, setRtConfirmou] = useState(Boolean(confirmacao));
  const [nome, setNome] = useState(responsavel.nome);
  const [cargo, setCargo] = useState(responsavel.cargo);
  const [usuarioId, setUsuarioId] = useState(responsavel.usuarioId || "");
  const editavel = podeEditar && !somenteLeitura;

  const erroNome = (cargo.trim() || usuarioId) && !nome.trim() ? "Informe o nome do responsável." : "";
  const erroConfirmacao = rtConfirmou && escolhidas.length === 0 ? "Escolha ao menos uma norma para confirmar." : "";
  const valido = !erroNome && !erroConfirmacao;
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
        </div>
        <p className="ui-row-sub priv-texto">Quem aprova e assina os POPs (RDC 216/2004, 4.11.2). O Consultor/RT revisa antes; o app nunca aprova sozinho.</p>
        <div className="norma-campos">
          <label className="pc-field">
            <span className="ui-eyebrow">Nome</span>
            <input className={`ui-input${erroNome ? " is-invalid" : ""}`} value={nome} disabled={!editavel} onChange={(evento) => setNome(evento.target.value)} aria-invalid={Boolean(erroNome)} />
            {erroNome && <span className="ui-field-error">{erroNome}</span>}
          </label>
          <label className="pc-field">
            <span className="ui-eyebrow">Cargo</span>
            <input className="ui-input" value={cargo} disabled={!editavel} onChange={(evento) => setCargo(evento.target.value)} />
          </label>
          <label className="pc-field">
            <span className="ui-eyebrow">Pessoa em Acessos</span>
            <select className="ui-input" value={usuarioId} disabled={!editavel || !podeVincular} onChange={(evento) => setUsuarioId(evento.target.value)}>
              <option value="">Ainda não vinculada</option>
              {pessoas.map((pessoa) => (
                <option key={pessoa.id} value={pessoa.id}>
                  {pessoa.nome} · {pessoa.perfil}
                </option>
              ))}
            </select>
            {!podeVincular && <span className="ui-row-sub">Só o Administrador vincula a pessoa de Acessos.</span>}
          </label>
        </div>
        {!usuarioId && <p className="ui-row-sub priv-texto">Sem pessoa vinculada, ninguém consegue aprovar POP nesta empresa.</p>}
        {somenteLeitura ? (
          <p className="ui-row-sub priv-texto">Alterar no computador.</p>
        ) : editavel ? (
          <div className="priv-acoes">
            <button
              type="button"
              className="ui-btn ui-btn--save ui-btn--small"
              disabled={!valido}
              onClick={() => onSalvar({ normasAplicadas: escolhidas, rtConfirmou, responsavel: { nome: nome.trim(), cargo: cargo.trim(), ...(usuarioId ? { usuarioId } : {}) } })}
            >
              Salvar norma e responsável
            </button>
          </div>
        ) : null}
      </article>
    </div>
  );
}
