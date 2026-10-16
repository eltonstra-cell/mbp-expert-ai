"use client";

import { useState } from "react";
import type { ProcedimentoOperacionalPadronizado, StatusPOP } from "@/types";
import { DEFINICOES_PROGRAMAS_CONTROLE } from "@/lib/qualityPrograms";
import {
  SUGESTOES_POPS_MANUAL,
  adicionarPop,
  adicionarSugestaoPop,
  arquivarPop,
  duplicarPop,
  popsAtivos,
  resumoPops,
  situacaoRevisaoPOP,
  sugestaoJaCriada,
  tomSituacaoPOP,
} from "@/lib/pops";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { StatStrip } from "@/components/ui/StatStrip";
import type { ItemMenu } from "@/components/ui/RowMenu";
import { acoesDoPop } from "@/lib/menuActions";
import { NavIcon } from "@/components/NavIcons";

const STATUS: StatusPOP[] = ["Rascunho", "Em revisão", "Aprovado", "Inativo"];

type Props = {
  pops: ProcedimentoOperacionalPadronizado[];
  onChange: (pops: ProcedimentoOperacionalPadronizado[]) => void;
  temAlteracoes: boolean;
  mensagem?: string;
  onSalvar: () => void;
  onVoltar: () => void;
};

function dataCurta(iso: string) {
  if (!iso) return "revisão não definida";
  const [ano, mes, dia] = iso.split("-");
  return `revisão ${dia}/${mes}/${ano}`;
}

export default function PcPops({ pops, onChange, temAlteracoes, mensagem, onSalvar, onVoltar }: Props) {
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<{ campo: "titulo" | "codigo"; aviso: string } | null>(null);
  const [aviso, setAviso] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [verArquivados, setVerArquivados] = useState(false);

  const resumo = resumoPops(popsAtivos(pops));
  const arquivados = pops.filter((pop) => pop.arquivado).length;
  const listados = verArquivados ? pops : popsAtivos(pops);

  function adicionar() {
    const resultado = adicionarPop(pops, codigo, titulo, crypto.randomUUID());
    if (!resultado.ok) {
      setErro({ campo: resultado.campo, aviso: resultado.aviso });
      return;
    }
    onChange(resultado.pops);
    setCodigo("");
    setTitulo("");
    setErro(null);
    setAviso("");
  }

  function atualizar(id: string, alteracao: Partial<ProcedimentoOperacionalPadronizado>) {
    onChange(pops.map((pop) => (pop.id === id ? { ...pop, ...alteracao } : pop)));
  }

  return (
    <section className="ui-screen" aria-label="POPs">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">POPs</h1>
          <p className="ui-subtitle">Procedimentos Operacionais Padronizados: cadastro, aprovação e revisão.</p>
        </div>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
          ← Central
        </button>
      </div>

      <StatStrip
        rotulo="Situação dos POPs"
        itens={[
          { rotulo: "Aprovados", valor: resumo.aprovados, tom: "ok" },
          { rotulo: "Em preparação", valor: resumo.emPreparacao, tom: "pend" },
          { rotulo: "Revisão vencida", valor: resumo.revisaoVencida, tom: "nc" },
        ]}
      />

      <div className="ui-card pc-suggest">
        <div className="ui-eyebrow">Sugeridos pelo Manual de Boas Práticas</div>
        <div className="pc-chip-row">
          {SUGESTOES_POPS_MANUAL.map((sugestao) => {
            const criado = sugestaoJaCriada(pops, sugestao);
            return (
              <button
                key={sugestao.titulo}
                type="button"
                disabled={criado}
                className={`ui-chip-btn${criado ? " ui-chip-btn--done" : ""}`}
                onClick={() => {
                  const resultado = adicionarSugestaoPop(pops, sugestao, crypto.randomUUID());
                  onChange(resultado.pops);
                  setAviso(resultado.aviso);
                }}
              >
                {criado ? "✓ " : "+ "}
                {sugestao.titulo}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pc-add-row">
        <label className="pc-add-code">
          <input
            className={`ui-input${erro?.campo === "codigo" ? " is-invalid" : ""}`}
            value={codigo}
            onChange={(evento) => {
              setCodigo(evento.target.value);
              if (erro?.campo === "codigo") setErro(null);
            }}
            placeholder="Código (opcional)"
            aria-label="Código do POP (opcional)"
            aria-invalid={erro?.campo === "codigo"}
          />
          {erro?.campo === "codigo" && <span className="ui-field-error">{erro.aviso}</span>}
        </label>
        <label className="pc-add-title">
          <span className="ui-field-wrap">
            <input
              className={`ui-input pc-input-tools${erro?.campo === "titulo" ? " is-invalid" : ""}`}
              value={titulo}
              onChange={(evento) => {
                setTitulo(evento.target.value);
                if (erro?.campo === "titulo") setErro(null);
              }}
              placeholder="Título do POP"
              aria-label="Título do POP"
              aria-invalid={erro?.campo === "titulo"}
            />
            <span className="ui-field-tools">
              <FieldVoiceTools
                fieldKey="novo-pop-titulo"
                value={titulo}
                onChange={setTitulo}
                contexto="Título curto e objetivo de um Procedimento Operacional Padronizado."
              />
            </span>
          </span>
          {erro?.campo === "titulo" && <span className="ui-field-error">{erro.aviso}</span>}
        </label>
        <button type="button" className="ui-btn ui-btn--primary" onClick={adicionar}>
          + Adicionar POP
        </button>
      </div>
      {aviso && <div className="ui-note">{aviso}</div>}
      {arquivados > 0 && (
        <button type="button" className="pc-link-btn pc-self-start" onClick={() => setVerArquivados((atual) => !atual)}>
          {verArquivados ? "Ocultar arquivados" : `Ver arquivados (${arquivados})`}
        </button>
      )}

      <div className="ui-scroll">
        <div className="ui-list">
          {listados.map((pop) => {
            const situacao = situacaoRevisaoPOP(pop);
            const expandido = aberto === pop.id;
            return (
              <ListRow
                key={pop.id}
                faixa="amber"
                icone={
                  <span className="pc-pop-icon" aria-hidden="true">
                    <NavIcon name="pops" size={22} strokeWidth={1.9} />
                  </span>
                }
                titulo={`${pop.codigo ? `${pop.codigo} · ` : ""}${pop.titulo || "POP sem título"}`}
                secundario={`${pop.status} · versão ${pop.versao || "não informada"} · ${dataCurta(pop.proximaRevisao)}`}
                pilulas={<Pill tom={tomSituacaoPOP(situacao.label)}>{situacao.label}</Pill>}
                acao={
                  <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setAberto(expandido ? null : pop.id)}>
                    {expandido ? "Fechar" : "Abrir"}
                  </button>
                }
                esmaecida={Boolean(pop.arquivado)}
                menu={acoesDoPop({ arquivado: Boolean(pop.arquivado), podeEditar: true }).map((acao): ItemMenu => {
                  switch (acao) {
                    case "abrir":
                      return { rotulo: "Abrir", onClick: () => setAberto(pop.id) };
                    case "duplicar":
                      return { rotulo: "Duplicar", onClick: () => onChange(duplicarPop(pops, pop.id, crypto.randomUUID())) };
                    case "arquivar":
                      return { rotulo: "Arquivar", confirmar: `Arquivar o POP "${pop.titulo || pop.codigo}"? Ele sai da lista, mas continua guardado.`, onClick: () => onChange(arquivarPop(pops, pop.id, true)) };
                    case "desarquivar":
                      return { rotulo: "Desarquivar", onClick: () => onChange(arquivarPop(pops, pop.id, false)) };
                    default:
                      return {
                        rotulo: "Excluir POP",
                        perigo: true,
                        confirmar: `Excluir o POP "${pop.titulo || pop.codigo}"?`,
                        onClick: () => onChange(pops.filter((item) => item.id !== pop.id)),
                      };
                  }
                })}
                filhos={
                  expandido ? (
                    <div className="pc-pop-edit">
                      <label className="pc-field">
                        <span className="ui-eyebrow">Código</span>
                        <input className="ui-input" value={pop.codigo} onChange={(e) => atualizar(pop.id, { codigo: e.target.value })} />
                      </label>
                      <label className="pc-field pc-field--wide">
                        <span className="ui-eyebrow">Título</span>
                        <input
                          className={`ui-input${pop.titulo.trim() ? "" : " is-invalid"}`}
                          value={pop.titulo}
                          onChange={(e) => atualizar(pop.id, { titulo: e.target.value })}
                        />
                        {!pop.titulo.trim() && <span className="ui-field-error">Informe o título do POP.</span>}
                      </label>
                      <label className="pc-field">
                        <span className="ui-eyebrow">Versão</span>
                        <input className="ui-input" value={pop.versao} onChange={(e) => atualizar(pop.id, { versao: e.target.value })} />
                      </label>
                      <label className="pc-field">
                        <span className="ui-eyebrow">Situação</span>
                        <select className="ui-input" value={pop.status} onChange={(e) => atualizar(pop.id, { status: e.target.value as StatusPOP })}>
                          {STATUS.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </label>
                      <label className="pc-field">
                        <span className="ui-eyebrow">Programa relacionado</span>
                        <select
                          className="ui-input"
                          value={pop.programaRelacionado}
                          onChange={(e) => atualizar(pop.id, { programaRelacionado: e.target.value })}
                        >
                          <option value="">Nenhum</option>
                          {DEFINICOES_PROGRAMAS_CONTROLE.map((programa) => (
                            <option key={programa.nome}>{programa.nome}</option>
                          ))}
                        </select>
                      </label>
                      <label className="pc-field">
                        <span className="ui-eyebrow">Responsável</span>
                        <input className="ui-input" value={pop.responsavel} onChange={(e) => atualizar(pop.id, { responsavel: e.target.value })} />
                      </label>
                      <label className="pc-field">
                        <span className="ui-eyebrow">Próxima revisão</span>
                        <input
                          type="date"
                          className="ui-input"
                          value={pop.proximaRevisao}
                          onChange={(e) => atualizar(pop.id, { proximaRevisao: e.target.value })}
                        />
                      </label>
                    </div>
                  ) : undefined
                }
              />
            );
          })}
          {pops.length === 0 && <div className="ui-empty">Nenhum POP cadastrado.</div>}
        </div>
      </div>

      {mensagem && <div className="ui-note">{mensagem}</div>}

      <div className="ui-footer">
        <span className="ui-row-sub">
          {temAlteracoes ? "● Alterações ainda não salvas" : "✓ Todas as alterações desta área estão salvas"}
        </span>
        <button type="button" className="ui-btn ui-btn--save" onClick={onSalvar}>
          Salvar e voltar à Central
        </button>
      </div>
    </section>
  );
}
