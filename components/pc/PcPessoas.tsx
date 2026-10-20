"use client";

import { useState } from "react";
import { ListRow } from "@/components/ui/ListRow";
import { Pill, type Tom } from "@/components/ui/Pill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
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
};

type Aba = "colaboradores" | "capacitacao";

const TOM: Record<SituacaoDaValidade, Tom> = { "em-dia": "ok", "vence-em-breve": "amber", vencido: "nc", "sem-validade": "na" };

function dataBr(iso: string) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Pessoas da empresa: cadastro leve (nome e cargo) e capacitação nominal com vencimento. Não é conta de acesso.
export default function PcPessoas({ empresa, normas, colaboradores, capacitacoes, onSalvarColaborador, onAlternarAtivo, onSalvarCapacitacao, onRemoverCapacitacao, onVoltar }: Props) {
  const [aba, setAba] = useState<Aba>("colaboradores");
  const [pessoa, setPessoa] = useState<DadosDoColaboradorForm>({ nome: "", cargo: "" });
  const [pessoaTocada, setPessoaTocada] = useState(false);
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

  function salvarPessoa() {
    setPessoaTocada(true);
    if (Object.keys(errosPessoa).length) return;
    onSalvarColaborador({ ...pessoa, nome: pessoa.nome.trim(), cargo: pessoa.cargo.trim() });
    setPessoa({ nome: "", cargo: "" });
    setPessoaTocada(false);
  }

  function salvarCapacitacao() {
    setCapTocada(true);
    if (Object.keys(errosCap).length) return;
    onSalvarCapacitacao(cap);
    setCap(vazia());
    setCapTocada(false);
  }

  return (
    <section className="ui-screen pess" aria-label="Pessoas da empresa">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Pessoas</h1>
          <p className="ui-subtitle">Equipe e capacitação · {empresa}</p>
        </div>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
          ← Voltar
        </button>
      </div>

      <SegmentedTabs<Aba>
        rotulo="Pessoas"
        valor={aba}
        onChange={setAba}
        abas={[
          { id: "colaboradores", rotulo: "Colaboradores", contagem: ativos.length },
          { id: "capacitacao", rotulo: "Capacitação", contagem: vigentes.length },
        ]}
      />

      {aba === "colaboradores" && (
        <div className="pess-cols">
          <div className="pess-lista">
            {colaboradores.length === 0 ? (
              <div className="ui-empty">Nenhuma pessoa cadastrada. Cadastre a equipe para registrar leituras de POP e capacitações.</div>
            ) : (
              <div className="ui-list">
                {[...colaboradores]
                  .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"))
                  .map((item) => (
                    <ListRow
                      key={item.id}
                      faixa={item.ativo ? "info" : "na"}
                      esmaecida={!item.ativo}
                      icone={<span aria-hidden="true">{item.nome.slice(0, 1).toUpperCase()}</span>}
                      titulo={item.nome}
                      secundario={item.cargo}
                      pilulas={<Pill tom={item.ativo ? "ok" : "na"}>{item.ativo ? "Ativo" : "Inativo"}</Pill>}
                      menu={[
                        { rotulo: "Editar", onClick: () => setPessoa({ id: item.id, nome: item.nome, cargo: item.cargo }) },
                        { rotulo: item.ativo ? "Desativar" : "Reativar", onClick: () => onAlternarAtivo(item.id) },
                      ]}
                    />
                  ))}
              </div>
            )}
          </div>
          <div className="ui-card pess-form">
            <h2 className="ui-card-title">{pessoa.id ? "Editar pessoa" : "Cadastrar pessoa"}</h2>
            <label className="pc-field">
              <span className="ui-eyebrow">Nome</span>
              <input className={`ui-input${pessoaTocada && errosPessoa.nome ? " is-invalid" : ""}`} value={pessoa.nome} onChange={(evento) => setPessoa({ ...pessoa, nome: evento.target.value })} aria-invalid={Boolean(pessoaTocada && errosPessoa.nome)} />
              {pessoaTocada && errosPessoa.nome && <span className="ui-field-error">{errosPessoa.nome}</span>}
            </label>
            <label className="pc-field">
              <span className="ui-eyebrow">Cargo</span>
              <input className={`ui-input${pessoaTocada && errosPessoa.cargo ? " is-invalid" : ""}`} value={pessoa.cargo} onChange={(evento) => setPessoa({ ...pessoa, cargo: evento.target.value })} aria-invalid={Boolean(pessoaTocada && errosPessoa.cargo)} />
              {pessoaTocada && errosPessoa.cargo && <span className="ui-field-error">{errosPessoa.cargo}</span>}
            </label>
            <p className="ui-row-sub">Guardamos só nome e cargo (e as datas dos treinamentos). Não é conta de acesso, e CPF, dados de saúde, foto e nascimento não entram aqui.</p>
            <div className="comp-form-acoes">
              {pessoa.id && (
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => { setPessoa({ nome: "", cargo: "" }); setPessoaTocada(false); }}>
                  Cancelar
                </button>
              )}
              <button type="button" className="ui-btn ui-btn--save" onClick={salvarPessoa}>
                Salvar pessoa
              </button>
            </div>
          </div>
        </div>
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
              <select className={`ui-input${capTocada && errosCap.colaboradorId ? " is-invalid" : ""}`} value={cap.colaboradorId} onChange={(evento) => setCap({ ...cap, colaboradorId: evento.target.value })}>
                <option value="">Escolha</option>
                {ativos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} · {item.cargo}
                  </option>
                ))}
              </select>
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
