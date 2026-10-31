"use client";

import Select from "@/components/Select";
import { limparTextoDePessoa, nomeProprio } from "@/lib/nomeCargo";
import { useRef, useState } from "react";
import { mostrarToast } from "@/lib/toast";
import { confirmar } from "@/lib/dialogos";
import Janela from "@/components/ui/Janela";
import MenuMais from "@/components/pc/MenuMais";
import { AVISO_DADOS_DE_SAUDE_PESSOA, LIMITE_CARGO_DA_PESSOA, LIMITE_NOME_DA_PESSOA, nomeRepetidoDePessoa, subtituloDePessoas, treinamentoDaPessoa } from "@/lib/documentosCentral";
import { hojeISO } from "@/lib/popsNorma";
import { LIMITE_DO_CONTEUDO_DO_TREINAMENTO, LIMITE_DO_INSTRUTOR } from "@/lib/limitesDoServidor";
import {
  AVISO_PRAZO_DE_CAPACITACAO,
  ROTULO_DA_CAPACITACAO,
  capacitacoesVigentes,
  referenciasDeCapacitacao,
  situacaoDaValidade,
  sugerirVencimentoDaCapacitacao,
  validarCapacitacao,
  validarColaborador,
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

function dataBr(iso: string) {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

// Pessoas da empresa: cadastro leve (nome e cargo) e capacitação nominal com vencimento. Não é conta de acesso.
function itensDoTreinamento(id: string, onRemover: (id: string) => void) {
  return [{ rotulo: "Remover", onClick: () => { void confirmar("Remover este registro de treinamento? Esta ação não pode ser desfeita.", { titulo: "Remover treinamento", confirmarRotulo: "Remover", cancelarRotulo: "Cancelar" }).then((sim) => { if (sim) onRemover(id); }); } }];
}

export default function PcPessoas({ empresa, normas, colaboradores, capacitacoes, onSalvarColaborador, onAlternarAtivo, onSalvarCapacitacao, onRemoverCapacitacao, onVoltar, embutido = false }: Props) {
  const [aba, setAba] = useState<Aba>("colaboradores");
  const [pessoa, setPessoa] = useState<DadosDoColaboradorForm>({ nome: "", cargo: "" });
  const [pessoaTocada, setPessoaTocada] = useState(false);
  const [janelaAberta, setJanelaAberta] = useState(false);
  const colaboradoresRef = useRef<Colaborador[]>([]);
  const [nomeTocado, setNomeTocado] = useState(false);
  const [cargoTocado, setCargoTocado] = useState(false);
  const [verInativos, setVerInativos] = useState(false);
  const vazia = (): DadosDaCapacitacaoForm => ({ colaboradorId: "", conteudo: "", cargaHoraria: "", data: "", venceEm: "", instrutor: "" });
  const [cap, setCap] = useState<DadosDaCapacitacaoForm>(vazia);
  const [treinoAberto, setTreinoAberto] = useState(false);
  // Campos em que a pessoa já passou (ou tentou registrar): o erro aparece na hora, no campo.
  const [tocados, setTocados] = useState<Record<string, boolean>>({});
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
    setNomeTocado(false);
    setCargoTocado(false);
    setJanelaAberta(true);
  }

  function abrirEdicao(item: Colaborador) {
    setPessoa({ id: item.id, nome: item.nome, cargo: item.cargo });
    setPessoaTocada(false);
    setNomeTocado(false);
    setCargoTocado(false);
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

  function abrirTreino(colaboradorId = "") {
    setCap({ ...vazia(), colaboradorId });
    setTocados({});
    setTreinoAberto(true);
  }

  function fecharTreino() {
    setTreinoAberto(false);
    setCap(vazia());
    setTocados({});
  }

  function salvarCapacitacao() {
    if (Object.keys(errosCap).length) {
      setTocados({ colaboradorId: true, cargaHoraria: true, conteudo: true, data: true, venceEm: true });
      return;
    }
    onSalvarCapacitacao(cap);
    fecharTreino();
  }

  const tocar = (campo: string) => setTocados((atual) => (atual[campo] ? atual : { ...atual, [campo]: true }));
  // Vencimento e carga horária acusam na hora em que há valor; os demais, ao sair do campo ou ao tentar registrar.
  const erroDe = (campo: keyof typeof errosCap) => {
    if (!errosCap[campo]) return "";
    if (tocados[campo]) return errosCap[campo] || "";
    if ((campo === "venceEm" || campo === "cargaHoraria") && String(cap[campo]).trim()) return errosCap[campo] || "";
    return "";
  };

  const pessoasParaChecar = colaboradores.map((item) => ({ id: item.id, nome: item.nome }));
  const erroDoNome = nomeRepetidoDePessoa(pessoa.nome, pessoasParaChecar, pessoa.id) ? "Já existe uma pessoa com este nome." : (pessoaTocada || nomeTocado) && errosPessoa.nome ? errosPessoa.nome : "";
  const erroDoCargo = (pessoaTocada || cargoTocado) && errosPessoa.cargo ? errosPessoa.cargo : "";
  const inativos = colaboradores.filter((item) => !item.ativo);
  const listaVisivel = [...colaboradores]
    .filter((item) => item.ativo !== false || verInativos)
    .sort((a, b) => Number(b.ativo) - Number(a.ativo) || a.nome.localeCompare(b.nome, "pt-BR"));
  colaboradoresRef.current = colaboradores;
  function desativar(item: Colaborador) {
    onAlternarAtivo(item.id);
    // Desfazer só reativa se a pessoa ainda estiver inativa (não vira um segundo "alternar").
    mostrarToast(`${item.nome} ficou inativo.`, { acao: { rotulo: "Desfazer", aoClicar: () => { if (colaboradoresRef.current.find((pessoaAtual) => pessoaAtual.id === item.id)?.ativo === false) onAlternarAtivo(item.id); } }, duracaoMs: 6000 });
  }

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
        {aba === "colaboradores" && listaVisivel.length > 0 && (
          <button type="button" className="ui-btn ui-btn--laranja" onClick={abrirNova}>
            + Adicionar pessoa
          </button>
        )}
        {aba === "capacitacao" && ativos.length > 0 && (
          <button type="button" className="ui-btn ui-btn--laranja" onClick={() => abrirTreino()}>
            + Registrar treinamento
          </button>
        )}
      </div>

      <div className="cdoc-abas" role="tablist" aria-label="Pessoas">
        {([["colaboradores", "Colaboradores", ativos.length], ["capacitacao", "Capacitação", vigentes.length]] as [Aba, string, number][]).map(([id, rotulo, conta]) => (
          <button key={id} type="button" role="tab" id={`pess-aba-${id}`} aria-controls={`pess-painel-${id}`} aria-selected={aba === id} className={`cdoc-aba${aba === id ? " is-ativa" : ""}`} onClick={() => setAba(id)}>
            {rotulo}{conta > 0 && <> <span className="cdoc-aba-conta">{conta}</span></>}
          </button>
        ))}
      </div>

      {aba === "colaboradores" && (
        <div className="cdoc-lista" role="tabpanel" id="pess-painel-colaboradores" aria-labelledby="pess-aba-colaboradores">
          {listaVisivel.length === 0 ? (
            <div className="pess-vazio">
              <p className="pess-vazio-texto">{colaboradores.length > 0 ? "Nenhuma pessoa ativa." : "Nenhuma pessoa cadastrada. Cadastre a equipe para registrar leituras de POP e capacitações."}</p>
              <button type="button" className="ui-btn ui-btn--laranja" onClick={abrirNova}>+ Adicionar pessoa</button>
            </div>
          ) : (
            listaVisivel
              .map((item) => {
                const estado = treinamentoDaPessoa(item, capacitacoes, hoje);
                return (
                  <div key={item.id} className={`pess-linha-p${item.ativo ? "" : " is-inativa"}`}>
                    <span className="pess-avatar" aria-hidden="true">{item.nome.slice(0, 1).toUpperCase()}</span>
                    <span className="pess-textos">
                      <span className="pess-nome">{item.nome}</span>
                      <span className="pess-cargo">{item.cargo}</span>
                    </span>
                    {item.ativo && (estado.id === "sem-registro" || estado.id === "vencido") ? (
                      <button type="button" className={`pess-estado pess-estado--${estado.id} pess-estado-link`} onClick={() => abrirTreino(item.id)}>{estado.texto}</button>
                    ) : (
                      <span className={`pess-estado pess-estado--${estado.id}`}>{estado.texto}</span>
                    )}
                    <MenuMais
                      rotulo={`Mais ações de ${item.nome}`}
                      itens={[
                        { rotulo: "Editar", assumeFoco: true, onClick: () => abrirEdicao(item) },
                        ...(item.ativo ? [{ rotulo: "Registrar treinamento", assumeFoco: true, onClick: () => abrirTreino(item.id) }] : []),
                        { rotulo: item.ativo ? "Desativar" : "Reativar", onClick: () => (item.ativo ? desativar(item) : onAlternarAtivo(item.id)) },
                      ]}
                    />
                  </div>
                );
              })
          )}
          {inativos.length > 0 && (
            <button type="button" className="pess-ver-inativos" aria-expanded={verInativos} onClick={() => setVerInativos((atual) => !atual)}>
              {verInativos ? "Ocultar inativos" : `Ver inativos (${inativos.length})`}
            </button>
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
              <button type="button" className={`ui-btn ui-btn--save${pessoa.nome.trim() ? "" : " is-apagado"}`} disabled={!pessoa.nome.trim()} onClick={salvarPessoa}>Salvar pessoa</button>
            </>
          }
        >
          <label className="jan-campo">
            <span className="jan-rotulo">Nome <span className="jan-conta">{pessoa.nome.length} de {LIMITE_NOME_DA_PESSOA}</span></span>
            <input className={`ui-input${erroDoNome ? " is-invalid" : ""}`} value={pessoa.nome} maxLength={LIMITE_NOME_DA_PESSOA} aria-invalid={Boolean(erroDoNome)} aria-describedby={erroDoNome ? "pess-erro-nome" : undefined} onBlur={() => setNomeTocado(true)} onChange={(evento) => setPessoa({ ...pessoa, nome: evento.target.value })} />
            {erroDoNome && <span id="pess-erro-nome" className="ui-field-error" role="alert">{erroDoNome}</span>}
          </label>
          <label className="jan-campo">
            <span className="jan-rotulo">Cargo ou função <span className="jan-conta">{pessoa.cargo.length} de {LIMITE_CARGO_DA_PESSOA}</span></span>
            <input className={`ui-input${erroDoCargo ? " is-invalid" : ""}`} value={pessoa.cargo} maxLength={LIMITE_CARGO_DA_PESSOA} placeholder="Ex.: Cozinheiro" aria-invalid={Boolean(erroDoCargo)} aria-describedby={erroDoCargo ? "pess-erro-cargo" : undefined} onBlur={() => setCargoTocado(true)} onChange={(evento) => setPessoa({ ...pessoa, cargo: evento.target.value })} />
            {erroDoCargo && <span id="pess-erro-cargo" className="ui-field-error" role="alert">{erroDoCargo}</span>}
          </label>
          <p className="jan-aviso">{AVISO_DADOS_DE_SAUDE_PESSOA}</p>
        </Janela>
      )}

      {aba === "capacitacao" && (
        <div className="cdoc-lista" role="tabpanel" id="pess-painel-capacitacao" aria-labelledby="pess-aba-capacitacao">
          {linhas.length === 0 ? (
            <div className="pess-vazio">
              <p className="pess-vazio-texto">Nenhum treinamento registrado.</p>
              {ativos.length > 0 && <button type="button" className="ui-btn ui-btn--laranja" onClick={() => abrirTreino()}>+ Registrar treinamento</button>}
            </div>
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
                  <th><span className="sr-only">Ações</span></th>
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
                        <span className={`pess-sit pess-sit--${vigente ? situacao : "antiga"}`}>{vigente ? ROTULO_DA_CAPACITACAO[situacao] : "Substituída"}</span>
                      </td>
                      <td className="pess-acoes">
                        <MenuMais rotulo={`Mais ações do treinamento de ${nomes.get(item.colaboradorId)?.nome || "pessoa"}: ${item.conteudo}`} itens={itensDoTreinamento(item.id, onRemoverCapacitacao)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {linhas.length > 0 && (
            <ul className="pess-cap-lista" aria-label="Treinamentos">
              {linhas.map((item) => {
                const situacao = situacaoDaValidade(item.venceEm, hoje);
                const vigente = vigentes.some((v) => v.id === item.id);
                const pessoaDoTreino = nomes.get(item.colaboradorId)?.nome || "—";
                return (
                  <li key={item.id} className={`pess-cap-item${vigente ? "" : " is-antiga"}`}>
                    <span className="pess-cap-textos">
                      <span className="pess-cap-titulo">{pessoaDoTreino} · {item.conteudo}</span>
                      <span className="pess-cap-sub">{item.cargaHoraria} h · feito em {dataBr(item.data)} · vence em {dataBr(item.venceEm)}</span>
                    </span>
                    <span className={`pess-sit pess-sit--${vigente ? situacao : "antiga"}`}>{vigente ? ROTULO_DA_CAPACITACAO[situacao] : "Substituída"}</span>
                    <MenuMais rotulo={`Mais ações do treinamento de ${pessoaDoTreino}: ${item.conteudo}`} itens={itensDoTreinamento(item.id, onRemoverCapacitacao)} />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {treinoAberto && (
        <Janela
          titulo="Registrar treinamento"
          largura={600}
          onFechar={fecharTreino}
          rodape={
            <>
              <button type="button" className="ui-btn ui-btn--secondary" onClick={fecharTreino}>Cancelar</button>
              <button type="button" className="ui-btn ui-btn--save" onClick={salvarCapacitacao}>Registrar treinamento</button>
            </>
          }
        >
          <div className="trn-linha trn-linha--pessoa">
            <label className="jan-campo">
              <span className="jan-rotulo">Pessoa</span>
              <Select className={`ui-input${erroDe("colaboradorId") ? " is-invalid" : ""}`} value={cap.colaboradorId} onChange={(evento) => setCap({ ...cap, colaboradorId: evento.target.value })} onBlur={() => tocar("colaboradorId")}>
                <option value="">Escolha</option>
                {ativos.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nome} · {item.cargo}
                  </option>
                ))}
              </Select>
              {erroDe("colaboradorId") && <span className="ui-field-error" role="alert">{erroDe("colaboradorId")}</span>}
            </label>
            <label className="jan-campo">
              <span className="jan-rotulo">Carga horária (h)</span>
              <input className={`ui-input${erroDe("cargaHoraria") ? " is-invalid" : ""}`} inputMode="decimal" value={cap.cargaHoraria} aria-invalid={Boolean(erroDe("cargaHoraria"))} onBlur={() => tocar("cargaHoraria")} onChange={(evento) => setCap({ ...cap, cargaHoraria: evento.target.value.replace(/[^\d,.]/g, "") })} />
              {erroDe("cargaHoraria") && <span className="ui-field-error" role="alert">{erroDe("cargaHoraria")}</span>}
            </label>
          </div>
          <label className="jan-campo">
            <span className="jan-rotulo">Conteúdo</span>
            <input className={`ui-input${erroDe("conteudo") ? " is-invalid" : ""}`} value={cap.conteudo} placeholder="Ex.: Boas práticas de manipulação" maxLength={LIMITE_DO_CONTEUDO_DO_TREINAMENTO} aria-invalid={Boolean(erroDe("conteudo"))} onBlur={() => tocar("conteudo")} onChange={(evento) => setCap({ ...cap, conteudo: evento.target.value })} />
            {erroDe("conteudo") && <span className="ui-field-error" role="alert">{erroDe("conteudo")}</span>}
            <span className="jan-conta jan-conta--baixo">{cap.conteudo.length} de {LIMITE_DO_CONTEUDO_DO_TREINAMENTO}</span>
          </label>
          <div className="trn-linha trn-linha--datas">
            <label className="jan-campo">
              <span className="jan-rotulo">Feito em</span>
              <input type="date" className={`ui-input${erroDe("data") ? " is-invalid" : ""}`} value={cap.data} max={hoje} aria-invalid={Boolean(erroDe("data"))} onBlur={() => tocar("data")} onChange={(evento) => setCap({ ...cap, data: evento.target.value })} />
              {erroDe("data") && <span className="ui-field-error" role="alert">{erroDe("data")}</span>}
            </label>
            <label className="jan-campo">
              <span className="jan-rotulo">Vence em</span>
              <input type="date" className={`ui-input${erroDe("venceEm") ? " is-invalid" : ""}`} value={cap.venceEm} aria-invalid={Boolean(erroDe("venceEm"))} onBlur={() => tocar("venceEm")} onChange={(evento) => setCap({ ...cap, venceEm: evento.target.value })} />
              {erroDe("venceEm") && <span className="ui-field-error" role="alert">{erroDe("venceEm")}</span>}
            </label>
            <label className="jan-campo">
              <span className="jan-rotulo">Instrutor (opcional)</span>
              <input className="ui-input" value={cap.instrutor} maxLength={LIMITE_DO_INSTRUTOR} onChange={(evento) => setCap({ ...cap, instrutor: evento.target.value })} />
              <span className="jan-conta jan-conta--baixo">{cap.instrutor.length} de {LIMITE_DO_INSTRUTOR}</span>
            </label>
          </div>
          {sugestao && (
            <p className="jan-sugestao" role="status">
              <span>{sugestao.texto}</span>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setCap({ ...cap, venceEm: sugestao.venceEm })}>Usar</button>
            </p>
          )}
          <p className="jan-aviso">{AVISO_PRAZO_DE_CAPACITACAO}</p>
          <details className="pess-apoio">
            <summary>O que a norma da empresa cita sobre capacitação ({referencias.length})</summary>
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
        </Janela>
      )}
    </section>
  );
}
