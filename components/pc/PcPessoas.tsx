"use client";

import Select from "@/components/Select";
import { limparTextoDePessoa, nomeProprio } from "@/lib/nomeCargo";
import { useState } from "react";
import { Pill, type Tom } from "@/components/ui/Pill";
import Janela from "@/components/ui/Janela";
import MenuMais from "@/components/pc/MenuMais";
import { AVISO_DADOS_DE_SAUDE_PESSOA, LIMITE_CARGO_DA_PESSOA, LIMITE_NOME_DA_PESSOA, nomeRepetidoDePessoa, subtituloDePessoas, treinamentoDaPessoa } from "@/lib/documentosCentral";
import { hojeISO } from "@/lib/popsNorma";
import {
  AVISO_PRAZO_DE_CAPACITACAO,
  ROTULO_DA_CAPACITACAO,
  capacitacoesVigentes,
  referenciasDeCapacitacao,
  situacaoDaValidade,
  sugerirVencimentoDaCapacitacao,
  validarCapacitacao,
  validarColaborador,
  type SituacaoDaValidade,
} from "@/lib/registrosEmpresa";
import type { Capacitacao, Colaborador, Empresa } from "@/types";

export type DadosDoColaboradorForm = { id?: string; nome: string; cargo: string };
export type DadosDaCapacitacaoForm = { colaboradorId: string; conteudo: string; cargaHoraria: string; data: string; venceEm: string; instrutor: string };

type Props = {
  empresa: string;
  normas: Pick<Empresa, "normasAplicadas">;
  colaboradores: Colaborador[];
  capacitacoes: Capacitacao[];
  onSalvarColaborador: (dados: DadosDoColaboradorForm) => void;
  onAlternarAtivo: (id: string) => void;
  onSalvarCapacitacao: (dados: DadosDaCapacitacaoForm) => void;
  onRemoverCapacitacao: (id: string) => void;
  onVoltar: () => void;
  /** Dentro da Central (Documentos › Pessoas): sem título nem Voltar próprios. */
  embutido?: boolean;
};

type Aba = "colaboradores" | "capacitacao";

const TOM: Record<SituacaoDaValidade, Tom> = { "em-dia": "ok", "vence-em-breve": "amber", vencido: "nc", "sem-validade": "na" };

function dataBr(iso: string) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Pessoas da empresa: cadastro leve (nome e cargo) e capacitação nominal com vencimento. Não é conta de acesso.
export default function PcPessoas({ empresa, normas, colaboradores, capacitacoes, onSalvarColaborador, onAlternarAtivo, onSalvarCapacitacao, onRemoverCapacitacao, onVoltar, embutido = false }: Props) {
  const [aba, setAba] = useState<Aba>("colaboradores");
  const [pessoa, setPessoa] = useState<DadosDoColaboradorForm>({ nome: "", cargo: "" });
  const [pessoaTocada, setPessoaTocada] = useState(false);
  const [janelaAberta, setJanelaAberta] = useState(false);
  const vazia = (): DadosDaCapacitacaoForm => ({ colaboradorId: "", conteudo: "", cargaHoraria: "", data: "", venceEm: "", instrutor: "" });
  const [cap, setCap] = useState<DadosDaCapacitacaoForm>(vazia);
  const [capTocada, setCapTocada] = useState(false);
  const hoje = hojeISO();

  const nomes = new Map(colaboradores.map((item) => [item.id, item]));
  const ativos = colaboradores.filter((item) => item.ativo);
  const errosPessoa = validarColaborador(pessoa);
  const errosCap = validarCapacitacao(cap);
  const sugestao = sugerirVencimentoDaCapacitacao(normas, cap.data);
  const referencias = referenciasDeCapacitacao(normas);
  const vigentes = capacitacoesVigentes(capacitacoes);
  const linhas = [...capacitacoes].sort((a, b) => b.data.localeCompare(a.data));

  function abrirNova() {
    setPessoa({ nome: "", cargo: "" });
    setPessoaTocada(false);
    setJanelaAberta(true);
  }

  function abrirEdicao(item: Colaborador) {
    setPessoa({ id: item.id, nome: item.nome, cargo: item.cargo });
    setPessoaTocada(false);
    setJanelaAberta(true);
  }

  function fecharJanela() {
    setJanelaAberta(false);
    setPessoa({ nome: "", cargo: "" });
    setPessoaTocada(false);
  }

  function salvarPessoa() {
    setPessoaTocada(true);
    if (Object.keys(errosPessoa).length || nomeRepetidoDePessoa(pessoa.nome, colaboradores.map((item) => ({ id: item.id, nome: item.nome })), pessoa.id)) return;
    onSalvarColaborador({ ...pessoa, nome: nomeProprio(pessoa.nome), cargo: limparTextoDePessoa(pessoa.cargo) });
    fecharJanela();
  }

  function salvarCapacitacao() {
    setCapTocada(true);
    if (Object.keys(errosCap).length) return;
    onSalvarCapacitacao(cap);
    setCap(vazia());
    setCapTocada(false);
  }

  const pessoasParaChecar = colaboradores.map((item) => ({ id: item.id, nome: item.nome }));
  const erroDoNome = nomeRepetidoDePessoa(pessoa.nome, pessoasParaChecar, pessoa.id) ? "Já existe uma pessoa com este nome." : pessoaTocada && errosPessoa.nome ? errosPessoa.nome : "";
  const erroDoCargo = pessoaTocada && errosPessoa.cargo ? errosPessoa.cargo : "";

  return (
    <section className={`${embutido ? "ui-embed pess--embutido" : "ui-screen"} pess`} aria-label="Pessoas da empresa">
      {!embutido && (
        <div className="ui-head">
          <div>
            <h1 className="ui-title">Pessoas</h1>
            <p className="ui-subtitle">Equipe e capacitação</p>
          </div>
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Voltar
          </button>
        </div>
      )}

      <div className="cdoc-titulo">
        <div>
          <h2 className="cdoc-h">Pessoas</h2>
          <p className="cdoc-sub">{subtituloDePessoas(ativos.length)}</p>
        </div>
        <button type="button" className="ui-btn ui-btn--laranja" onClick={abrirNova}>
          + Adicionar pessoa
        </button>
      </div>

      <div className="cdoc-abas" role="tablist" aria-label="Pessoas">
        {([["colaboradores", "Colaboradores", ativos.length], ["capacitacao", "Capacitação", vigentes.length]] as [Aba, string, number][]).map(([id, rotulo, conta]) => (
          <button key={id} type="button" role="tab" aria-selected={aba === id} className={`cdoc-aba${aba === id ? " is-ativa" : ""}`} onClick={() => setAba(id)}>
            {rotulo} <span className="cdoc-aba-conta">{conta}</span>
          </button>
        ))}
      </div>

      {aba === "colaboradores" && (
        <div className="cdoc-lista" role="list">
          {colaboradores.length === 0 ? (
            <div className="ui-empty">Nenhuma pessoa cadastrada. Cadastre a equipe para registrar leituras de POP e capacitações.</div>
          ) : (
            [...colaboradores]
              .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"))
              .map((item) => {
                const estado = treinamentoDaPessoa(item, capacitacoes, hoje);
                return (
                  <div key={item.id} role="listitem" className={`pess-linha-p${item.ativo ? "" : " is-inativa"}`}>
                    <span className="pess-avatar" aria-hidden="true">{item.nome.slice(0, 1).toUpperCase()}</span>
                    <span className="pess-textos">
                      <span className="pess-nome">{item.nome}</span>
                      <span className="pess-cargo">{item.cargo}</span>
                    </span>
                    <span className={`pess-estado pess-estado--${estado.id}`}>{estado.texto}</span>
                    <MenuMais
                      rotulo={`Mais ações de ${item.nome}`}
                      itens={[
                        { rotulo: "Editar", assumeFoco: true, onClick: () => abrirEdicao(item) },
                        { rotulo: item.ativo ? "Desativar" : "Reativar", onClick: () => onAlternarAtivo(item.id) },
                      ]}
                    />
                  </div>
                );
              })
          )}
        </div>
      )}

      {janelaAberta && (
        <Janela
          titulo={pessoa.id ? "Editar pessoa" : "Adicionar pessoa"}
          onFechar={fecharJanela}
          rodape={
            <>
              <button type="button" className="ui-btn ui-btn--secondary" onClick={fecharJanela}>Cancelar</button>
              <button type="button" className="ui-btn ui-btn--save" onClick={salvarPessoa}>Salvar pessoa</button>
            </>
          }
        >
          <label className="jan-campo">
            <span className="jan-rotulo">Nome <span className="jan-conta">{pessoa.nome.length} de {LIMITE_NOME_DA_PESSOA}</span></span>
            <input className={`ui-input${erroDoNome ? " is-invalid" : ""}`} value={pessoa.nome} maxLength={LIMITE_NOME_DA_PESSOA} aria-invalid={Boolean(erroDoNome)} aria-describedby={erroDoNome ? "pess-erro-nome" : undefined} onChange={(evento) => setPessoa({ ...pessoa, nome: evento.target.value })} />
            {erroDoNome && <span id="pess-erro-nome" className="ui-field-error" role="alert">{erroDoNome}</span>}
          </label>
          <label className="jan-campo">
            <span className="jan-rotulo">Cargo ou função <span className="jan-conta">{pessoa.cargo.length} de {LIMITE_CARGO_DA_PESSOA}</span></span>
            <input className={`ui-input${erroDoCargo ? " is-invalid" : ""}`} value={pessoa.cargo} maxLength={LIMITE_CARGO_DA_PESSOA} placeholder="Ex.: Cozinheiro" aria-invalid={Boolean(erroDoCargo)} aria-describedby={erroDoCargo ? "pess-erro-cargo" : undefined} onChange={(evento) => setPessoa({ ...pessoa, cargo: evento.target.value })} />
            {erroDoCargo && <span id="pess-erro-cargo" className="ui-field-error" role="alert">{erroDoCargo}</span>}
          </label>
          <p className="jan-aviso">{AVISO_DADOS_DE_SAUDE_PESSOA}</p>
        </Janela>
      )}

      {aba === "capacitacao" && (
        <div className="pess-cols">
          <div className="pess-lista">
            {linhas.length === 0 ? (
              <div className="ui-empty">Nenhuma capacitação registrada.</div>
            ) : (
              <table className="pess-tabela">
                <thead>
                  <tr>
                    <th>Pessoa</th>
                    <th>Treinamento</th>
                    <th>Horas</th>
                    <th>Feito em</th>
                    <th>Vence em</th>
                    <th>Situação</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((item) => {
                    const situacao = situacaoDaValidade(item.venceEm, hoje);
                    const vigente = vigentes.some((v) => v.id === item.id);
                    return (
                      <tr key={item.id} className={vigente ? "" : "is-antiga"}>
                        <td>{nomes.get(item.colaboradorId)?.nome || "—"}</td>
                        <td title={item.instrutor ? `Instrutor: ${item.instrutor}` : undefined}>{item.conteudo}</td>
                        <td>{item.cargaHoraria} h</td>
                        <td>{dataBr(item.data)}</td>
                        <td>{dataBr(item.venceEm)}</td>
                        <td>
                          <Pill tom={vigente ? TOM[situacao] : "na"}>{vigente ? ROTULO_DA_CAPACITACAO[situacao] : "Substituída"}</Pill>
                        </td>
                        <td>
                          <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label="Remover este registro de capacitação" title="Remover" onClick={() => onRemoverCapacitacao(item.id)}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <div className="ui-card pess-form">
            <h2 className="ui-card-title">Registrar capacitação</h2>
            <div className="pess-linha pess-linha--2-1">
            <label className="pc-field">
              <span className="ui-eyebrow">Pessoa</span>
              <Select className={`ui-input${capTocada && errosCap.colaboradorId ? " is-invalid" : ""}`} value={cap.colaboradorId} onChange={(evento) => setCap({ ...cap, colaboradorId: evento.target.value })}>
                <option value="">Escolha</option>
                {ativos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} · {item.cargo}
                  </option>
                ))}
              </Select>
              {capTocada && errosCap.colaboradorId && <span className="ui-field-error">{errosCap.colaboradorId}</span>}
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Carga horária (h)</span>
              <input className={`ui-input${capTocada && errosCap.cargaHoraria ? " is-invalid" : ""}`} inputMode="decimal" value={cap.cargaHoraria} onChange={(evento) => setCap({ ...cap, cargaHoraria: evento.target.value.replace(/[^\d,.]/g, "") })} aria-invalid={Boolean(capTocada && errosCap.cargaHoraria)} />
              {capTocada && errosCap.cargaHoraria && <span className="ui-field-error">{errosCap.cargaHoraria}</span>}
            </label>
            </div>
            <label className="pc-field">
              <span className="ui-eyebrow">Conteúdo</span>
              <input className={`ui-input${capTocada && errosCap.conteudo ? " is-invalid" : ""}`} value={cap.conteudo} onChange={(evento) => setCap({ ...cap, conteudo: evento.target.value })} aria-invalid={Boolean(capTocada && errosCap.conteudo)} />
              {capTocada && errosCap.conteudo && <span className="ui-field-error">{errosCap.conteudo}</span>}
            </label>
            <div className="pess-linha pess-linha--3">
              <label className="pc-field">
                <span className="ui-eyebrow">Feito em</span>
                <input type="date" className={`ui-input${capTocada && errosCap.data ? " is-invalid" : ""}`} value={cap.data} max={hoje} onChange={(evento) => setCap({ ...cap, data: evento.target.value })} aria-invalid={Boolean(capTocada && errosCap.data)} />
                {capTocada && errosCap.data && <span className="ui-field-error">{errosCap.data}</span>}
              </label>
              <label className="pc-field">
                <span className="ui-eyebrow">Vence em</span>
                <input type="date" className={`ui-input${errosCap.venceEm && cap.venceEm ? " is-invalid" : ""}`} value={cap.venceEm} onChange={(evento) => setCap({ ...cap, venceEm: evento.target.value })} aria-invalid={Boolean(errosCap.venceEm && cap.venceEm)} />
                {cap.venceEm && errosCap.venceEm && <span className="ui-field-error">{errosCap.venceEm}</span>}
              </label>
              <label className="pc-field">
                <span className="ui-eyebrow">Instrutor (opcional)</span>
                <input className="ui-input" value={cap.instrutor} onChange={(evento) => setCap({ ...cap, instrutor: evento.target.value })} />
              </label>
            </div>
            {sugestao && (
              <div className="priv-faixa comp-sugestao" role="status">
                <span>{sugestao.texto}</span>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setCap({ ...cap, venceEm: sugestao.venceEm })}>
                  Usar
                </button>
              </div>
            )}
            <p className="ui-row-sub">{AVISO_PRAZO_DE_CAPACITACAO}</p>
            <details className="pess-apoio">
              <summary className="ui-row-sub">O que a norma da empresa cita sobre capacitação ({referencias.length})</summary>
              {referencias.length === 0 ? (
                <span className="ui-row-sub">Nenhuma norma com referência de capacitação aplicada a esta empresa.</span>
              ) : (
                referencias.map((ref) => (
                  <span key={`${ref.norma}-${ref.rotulo}-${ref.orientacao}`} className="ui-row-sub pess-ref">
                    {ref.norma} · {ref.rotulo}: {ref.orientacao}
                    {ref.conferir ? <span className="em-breve pop-conferir"> conferir</span> : null}
                  </span>
                ))
              )}
            </details>
            <div className="comp-form-acoes">
              <button type="button" className="ui-btn ui-btn--save" onClick={salvarCapacitacao}>
                Registrar capacitação
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
