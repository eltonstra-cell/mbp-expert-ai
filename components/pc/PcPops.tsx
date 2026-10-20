"use client";

import { useState } from "react";
import type { Empresa, ProcedimentoOperacionalPadronizado, StatusPOP, UsuarioSistema } from "@/types";
import PcPopEditor from "@/components/pc/PcPopEditor";
import { MENSAGEM_SEM_NORMA } from "@/lib/normas";
import {
  MENSAGEM_NORMA_ALTERADA,
  MENSAGEM_SEM_NORMA_APLICADA,
  aprovarPop,
  criarPopDoTextoBase,
  enviarParaAprovacao,
  iniciarNovaVersao,
  linhasDoConjunto,
  popDoConjunto,
  popPrecisaRevisarPorNorma,
  situacaoDoPop,
  type SituacaoDoPop,
} from "@/lib/popsNorma";
import { DEFINICOES_PROGRAMAS_CONTROLE } from "@/lib/qualityPrograms";
import {
  adicionarPop,
  arquivarPop,
  duplicarPop,
  popsAtivos,
  resumoPops,
  situacaoRevisaoPOP,
  tomSituacaoPOP,
} from "@/lib/pops";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { StatStrip } from "@/components/ui/StatStrip";
import type { ItemMenu } from "@/components/ui/RowMenu";
import { acoesDoPop } from "@/lib/menuActions";
import { NavIcon } from "@/components/NavIcons";

// "Aprovado" e "Aguardando aprovação" não são escolhidos aqui: vêm do fluxo Enviar para aprovação e Aprovar e assinar.
const STATUS_ESCOLHIVEIS: StatusPOP[] = ["Rascunho", "Inativo"];

const TOM_DA_SITUACAO: Record<SituacaoDoPop, "ok" | "nc" | "pend" | "info" | "na"> = {
  "Falta criar": "nc",
  Rascunho: "pend",
  "Aguardando aprovação": "info",
  Aprovado: "ok",
  Vencido: "nc",
  Inativo: "na",
};

type Props = {
  pops: ProcedimentoOperacionalPadronizado[];
  onChange: (pops: ProcedimentoOperacionalPadronizado[]) => void;
  temAlteracoes: boolean;
  mensagem?: string;
  onSalvar: () => void;
  onVoltar: () => void;
  /** Empresa (norma, responsável do estabelecimento) e a pessoa logada, para o conjunto da norma e a aprovação. */
  empresa?: Pick<Empresa, "normasAplicadas" | "responsavelEstabelecimento" | "uf">;
  usuario?: UsuarioSistema | null;
  /** Sem edição (leitura): só abre os POPs; quem é o responsável do estabelecimento ainda aprova. */
  podeEditar?: boolean;
  /** Grava os POPs na hora (sem esperar o "Salvar" da empresa). */
  onPersistir?: (pops: ProcedimentoOperacionalPadronizado[]) => void;
};

function dataCurta(iso: string) {
  if (!iso) return "revisão não definida";
  const [ano, mes, dia] = iso.split("-");
  return `revisão ${dia}/${mes}/${ano}`;
}

export default function PcPops({ pops, onChange, temAlteracoes, mensagem, onSalvar, onVoltar, empresa, usuario = null, podeEditar = true, onPersistir }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [mensagemEditor, setMensagemEditor] = useState("");
  const [codigo, setCodigo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<{ campo: "titulo" | "codigo"; aviso: string } | null>(null);
  const [aviso, setAviso] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [verArquivados, setVerArquivados] = useState(false);

  const persistir = (novos: ProcedimentoOperacionalPadronizado[]) => (onPersistir ? onPersistir(novos) : onChange(novos));
  const empresaDoConjunto = { normasAplicadas: empresa?.normasAplicadas, pops };
  const conjunto = linhasDoConjunto(empresaDoConjunto);
  const idsDoConjunto = new Set(conjunto.linhas.map((linha) => linha.pop?.id).filter(Boolean));
  const popEmEdicao = editandoId ? pops.find((pop) => pop.id === editandoId) : undefined;
  const resumo = resumoPops(popsAtivos(pops));
  const arquivados = pops.filter((pop) => pop.arquivado).length;
  const listados = (verArquivados ? pops : popsAtivos(pops)).filter((pop) => !idsDoConjunto.has(pop.id));

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

  function criarDoTextoBase(indice: number) {
    const definicao = conjunto.linhas[indice]?.definicao;
    if (!definicao) return;
    const novo = criarPopDoTextoBase(definicao, empresaDoConjunto, crypto.randomUUID());
    persistir([...pops, novo]);
    setMensagemEditor("");
    setEditandoId(novo.id);
  }

  function trocar(atual: ProcedimentoOperacionalPadronizado, novo: ProcedimentoOperacionalPadronizado) {
    persistir(pops.map((pop) => (pop.id === atual.id ? novo : pop)));
  }

  function executar(atual: ProcedimentoOperacionalPadronizado, acao: () => ProcedimentoOperacionalPadronizado, aviso: string) {
    try {
      trocar(atual, acao());
      setMensagemEditor(aviso);
    } catch (erro) {
      setMensagemEditor(erro instanceof Error ? erro.message : "Não foi possível concluir.");
    }
  }

  if (popEmEdicao && empresa) {
    return (
      <PcPopEditor
        key={`${popEmEdicao.id}-${popEmEdicao.versao}-${popEmEdicao.status}`}
        pop={popEmEdicao}
        empresa={empresa}
        usuario={usuario}
        podeEditar={podeEditar}
        mensagem={mensagemEditor}
        onVoltar={() => {
          setEditandoId(null);
          setMensagemEditor("");
        }}
        onSalvarRascunho={(novo) => executar(popEmEdicao, () => novo, "Rascunho salvo.")}
        onEnviar={(novo) => executar(popEmEdicao, () => enviarParaAprovacao(novo), "Enviado para aprovação do responsável do estabelecimento.")}
        onAprovar={(novo) => executar(popEmEdicao, () => aprovarPop(novo, usuario!, empresa, new Date().toISOString()), "POP aprovado e assinado.")}
        onNovaVersao={(novo) => executar(popEmEdicao, () => iniciarNovaVersao(novo), "Nova versão criada em rascunho. A versão aprovada continua guardada.")}
      />
    );
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

      <div className="ui-card pop-conjunto">
        <div className="pc-card-head">
          <h2 className="ui-card-title">Conjunto da norma</h2>
          {conjunto.linhas.length > 0 && (
            <span className="ui-row-sub">
              {conjunto.resumo.aprovados} de {conjunto.resumo.total} aprovados · {conjunto.resumo.rascunho} em rascunho · {conjunto.resumo.faltam} faltam criar
            </span>
          )}
        </div>
        {conjunto.linhas.length === 0 ? (
          <div className="priv-faixa" role="status">
            <span>{empresa && (empresa.uf || "").trim().toUpperCase() !== "RS" ? MENSAGEM_SEM_NORMA : MENSAGEM_SEM_NORMA_APLICADA}</span>
          </div>
        ) : (
          <div className="ui-list">
            {conjunto.linhas.map((linha, indice) => (
              <div key={linha.definicao.catalogoId} className="pop-conjunto-linha">
                <div className="pop-conjunto-textos">
                  <span className="pop-conjunto-titulo">{linha.definicao.titulo}</span>
                  <span className="ui-row-sub">
                    {linha.itemDaNorma} · versão {linha.versao} · {linha.responsavel}
                  </span>
                </div>
                <Pill tom={TOM_DA_SITUACAO[linha.situacao]}>{linha.situacao}</Pill>
                {linha.pop && popPrecisaRevisarPorNorma(linha.pop) && (
                  <span className="pop-revisar" title={MENSAGEM_NORMA_ALTERADA}>Revisar</span>
                )}
                {linha.pop ? (
                  <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => { setMensagemEditor(""); setEditandoId(linha.pop!.id); }}>
                    Abrir
                  </button>
                ) : podeEditar ? (
                  <button type="button" className="ui-btn ui-btn--criar ui-btn--small" onClick={() => criarDoTextoBase(indice)}>
                    Criar do texto-base
                  </button>
                ) : (
                  <span className="ui-row-sub">Falta criar</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="ui-eyebrow pop-outros-titulo">Outros POPs e documentos da empresa</div>

      {podeEditar && (
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
        <button type="button" className="ui-btn ui-btn--criar" onClick={adicionar}>
          + Adicionar POP
        </button>
      </div>
      )}
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
                pilulas={
                  <>
                    <Pill tom={tomSituacaoPOP(situacao.label)}>{situacao.label}</Pill>
                    {popPrecisaRevisarPorNorma(pop) && <span className="pop-revisar" title={MENSAGEM_NORMA_ALTERADA}>Revisar</span>}
                  </>
                }
                acao={
                  <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setAberto(expandido ? null : pop.id)}>
                    {expandido ? "Fechar" : "Abrir"}
                  </button>
                }
                esmaecida={Boolean(pop.arquivado)}
                menu={acoesDoPop({ arquivado: Boolean(pop.arquivado), podeEditar }).map((acao): ItemMenu => {
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
                  expandido && podeEditar ? (
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
                          {(STATUS_ESCOLHIVEIS.includes(pop.status) ? STATUS_ESCOLHIVEIS : [...STATUS_ESCOLHIVEIS, pop.status]).map((status) => (
                            <option key={status} disabled={!STATUS_ESCOLHIVEIS.includes(status)}>
                              {status}
                            </option>
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
          {listados.length === 0 && <div className="ui-empty">Nenhum outro POP ou documento cadastrado.</div>}
        </div>
      </div>

      {mensagem && <div className="ui-note">{mensagem}</div>}

      <div className="ui-footer">
        {podeEditar ? (
          <>
            <span className="ui-row-sub">
              {temAlteracoes ? "● Alterações ainda não salvas" : "✓ Todas as alterações desta área estão salvas"}
            </span>
            <button type="button" className="ui-btn ui-btn--save" onClick={onSalvar}>
              Salvar e voltar à Central
            </button>
          </>
        ) : (
          <span className="ui-row-sub">Somente leitura. O responsável do estabelecimento aprova os POPs que aguardam aprovação.</span>
        )}
      </div>
    </section>
  );
}
