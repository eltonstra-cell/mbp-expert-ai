"use client";

import Select from "@/components/Select";
import { useState } from "react";
import type {
  EquipamentoSetor,
  PapelResponsabilidadeManual,
  ResponsabilidadeManual,
} from "@/types";
import { OPCOES_MODELO_QUESTIONARIO, SETORES_OFICIAIS_MANUAL, agruparEquipamentosPorAmbiente, resumoDosSetoresMarcados } from "@/lib/manualBase";
import { MODELO_GENERICO, ambientesSemQuestionario, bloqueioDeExcluirAmbiente, vincularQuestionarioEmLote } from "@/lib/regrasDoPacote3";
import { erroDoNovoNome } from "@/lib/renomearAmbiente";
import { aplicarEscolhaDeSetores } from "@/lib/escolhaEmJanela";
import { ambientesParaMover, moverEquipamento } from "@/lib/equipamentosCadastro";
import { textoCurtoDaResponsabilidade, textoDosAtivos } from "@/lib/manualIdentificacao";
import EscolhaEmJanela from "@/components/EscolhaEmJanela";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import VozEquipamentosConferencia, { type ItemParaConferir } from "@/components/VozEquipamentosConferencia";
import { nomeJaExistente } from "@/lib/ambientesVisita";
import { interpretarEquipamentos, podeConfirmar } from "@/lib/vozEquipamentos";

type Props = {
  responsabilidades: ResponsabilidadeManual[];
  onResponsabilidadesChange: (responsabilidades: ResponsabilidadeManual[]) => void;
  setores: string[];
  onSetoresChange: (setores: string[]) => void;
  equipamentos: EquipamentoSetor[];
  onEquipamentosChange: (equipamentos: EquipamentoSetor[]) => void;
  /** Setores que estavam marcados no último salvo (para o chip "Falta salvar"). */
  setoresSalvos?: string[];
  /** Opcional: ambiente com nome próprio -> setor oficial marcado. */
  vinculos?: Record<string, string>;
  onVinculosChange?: (vinculos: Record<string, string>) => void;
  /** Opcional: questionário (modelo) de cada ambiente; permite o vínculo em lote. */
  modelos?: Record<string, string>;
  onModelosChange?: (modelos: Record<string, string>) => void;
  /** Opcional: renomear ambiente próprio com cascata (quem chama pede a confirmação e aplica). Devolve true se renomeou. */
  onRenomearAmbiente?: (de: string, para: string) => Promise<boolean>;
  modo?: "completo" | "responsabilidades" | "ambientes" | "equipamentos" | "estrutura";
};

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="font-extrabold text-slate-950">{title}</div>
      <div className="mt-0.5 text-xs text-slate-500">{description}</div>
    </div>
  );
}

export default function ManualBaseFields({
  responsabilidades,
  onResponsabilidadesChange,
  setores,
  onSetoresChange,
  equipamentos,
  onEquipamentosChange,
  setoresSalvos,
  vinculos = {},
  onVinculosChange,
  modelos = {},
  onModelosChange,
  onRenomearAmbiente,
  modo = "completo",
}: Props) {
  const [setorEquipamento, setSetorEquipamento] = useState(setores[0] || SETORES_OFICIAIS_MANUAL[0]);
  const [nomeEquipamento, setNomeEquipamento] = useState("");
  const [quantidadeEquipamento, setQuantidadeEquipamento] = useState("1");
  const [papelAdicional, setPapelAdicional] = useState<PapelResponsabilidadeManual>("Proprietário");
  const [novoAmbiente, setNovoAmbiente] = useState("");
  const [renomeando, setRenomeando] = useState<{ de: string; texto: string } | null>(null);
  const [bloqueio, setBloqueio] = useState<{ ambiente: string; mensagem: string } | null>(null);
  const [destinoDoMover, setDestinoDoMover] = useState("");
  const [loteAberto, setLoteAberto] = useState(false);
  const [loteSelecionados, setLoteSelecionados] = useState<string[]>([]);
  const [loteModelo, setLoteModelo] = useState("");
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);
  // Itens falados esperando conferência (nada entra no quadro sem confirmar).
  const [falados, setFalados] = useState<ItemParaConferir[]>([]);
  const [respEmEdicao, setRespEmEdicao] = useState<string | null>(null);
  const [gruposRecolhidos, setGruposRecolhidos] = useState<PapelResponsabilidadeManual[]>([]);

  const setoresParaEquipamentos = setores.length ? setores : [...SETORES_OFICIAIS_MANUAL];
  const mostrarAmbientes = modo === "completo" || modo === "ambientes" || modo === "estrutura";
  const mostrarEquipamentos = modo === "completo" || modo === "equipamentos" || modo === "estrutura";
  const mostrarResponsabilidades = modo === "completo" || modo === "responsabilidades";
  const proprios = setores.filter((setor) => !SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]));
  const oficiaisMarcados = setores.filter((setor) => SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]));
  const gruposDeEquipamentos = agruparEquipamentosPorAmbiente(equipamentos, setoresParaEquipamentos);
  const semQuestionario = ambientesSemQuestionario(setores, SETORES_OFICIAIS_MANUAL, modelos, vinculos);
  const destinosParaMover = bloqueio ? setores.filter((setor) => setor !== bloqueio.ambiente) : [];
  const erroDoNovoAmbiente = (() => {
    const nome = novoAmbiente.trim();
    if (!nome) return "";
    if (setores.includes(nome)) return "Esse ambiente já está na lista.";
    const existente = nomeJaExistente(nome, setores);
    return existente ? `Já existe: ${existente}.` : "";
  })();

  function abrirLote(preselecionados: string[]) {
    setLoteSelecionados(preselecionados);
    setLoteModelo("");
    setLoteAberto(true);
  }

  function aplicarLote() {
    if (!onModelosChange || !loteModelo || loteSelecionados.length === 0) return;
    onModelosChange(vincularQuestionarioEmLote(modelos, loteSelecionados, loteModelo));
    setLoteAberto(false);
  }

  async function confirmarRenomear() {
    if (!renomeando || !onRenomearAmbiente) return;
    if (erroDoNovoNome(renomeando.de, renomeando.texto, setores)) return;
    const feito = await onRenomearAmbiente(renomeando.de, renomeando.texto.trim());
    if (feito) setRenomeando(null);
  }

  // Excluir ambiente com equipamentos: bloqueia, diz quais são e oferece mover ou excluir.
  function pedirRemover(setor: string) {
    const resultado = bloqueioDeExcluirAmbiente(setor, equipamentos);
    if (resultado.bloqueado) {
      setDestinoDoMover("");
      setBloqueio({ ambiente: setor, mensagem: resultado.mensagem });
      return;
    }
    setBloqueio(null);
    onSetoresChange(setores.filter((item) => item !== setor));
  }

  function moverEEExcluir() {
    if (!bloqueio || !destinoDoMover) return;
    onEquipamentosChange(equipamentos.map((item) => (item.setor === bloqueio.ambiente ? { ...item, setor: destinoDoMover } : item)));
    onSetoresChange(setores.filter((item) => item !== bloqueio.ambiente));
    setBloqueio(null);
  }

  function excluirTudo() {
    if (!bloqueio) return;
    onEquipamentosChange(equipamentos.filter((item) => item.setor !== bloqueio.ambiente));
    onSetoresChange(setores.filter((item) => item !== bloqueio.ambiente));
    setBloqueio(null);
  }

  // "Concluir" na janela de setores: aplica no estado da tela (quem grava é o Salvar da barra de baixo).
  function aplicarSetores(escolhidos: string[]) {
    const retirados = setores.filter((setor) => SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]) && !escolhidos.includes(setor));
    const comEquipamentos = retirados.find((setor) => bloqueioDeExcluirAmbiente(setor, equipamentos).bloqueado);
    if (comEquipamentos) {
      const resultado = bloqueioDeExcluirAmbiente(comEquipamentos, equipamentos);
      if (resultado.bloqueado) {
        setDestinoDoMover("");
        setBloqueio({ ambiente: comEquipamentos, mensagem: resultado.mensagem });
      }
      escolhidos = [...escolhidos, comEquipamentos];
    }
    const proximos = aplicarEscolhaDeSetores(setores, SETORES_OFICIAIS_MANUAL, escolhidos);
    if (proximos === setores) return;
    onSetoresChange(proximos);
    if (!proximos.includes(setorEquipamento)) {
      setSetorEquipamento(proximos[0] || SETORES_OFICIAIS_MANUAL[0]);
    }
  }

  function adicionarEquipamento() {
    const nome = nomeEquipamento.trim();
    if (!nome || !setorEquipamento) return;
    onEquipamentosChange([
      ...equipamentos,
      {
        id: crypto.randomUUID(),
        setor: setorEquipamento,
        nome,
        quantidade: Math.max(1, Number(quantidadeEquipamento) || 1),
        estado: "Não avaliado",
        observacao: "",
      },
    ]);
    setNomeEquipamento("");
    setQuantidadeEquipamento("1");
  }

  function tratarFalaDeEquipamento(texto: string) {
    const resultado = interpretarEquipamentos(texto, setoresParaEquipamentos);
    if (!resultado.entendeu) {
      // Não entendeu: o texto fica no campo e o resto não é preenchido.
      setNomeEquipamento((atual) => [atual.trim(), texto.trim()].filter(Boolean).join(" "));
      return;
    }
    setFalados((atuais) => [...atuais, ...resultado.itens.map((item) => ({ ...item, id: crypto.randomUUID() }))]);
  }

  function atualizarFalado(id: string, mudanca: Partial<ItemParaConferir>) {
    setFalados((atuais) => atuais.map((item) => (item.id === id ? { ...item, ...mudanca } : item)));
  }

  function criarAmbienteFalado(id: string) {
    const item = falados.find((atual) => atual.id === id);
    const falado = (item?.falado || "").trim();
    if (!item || !falado) return;
    const nome = falado.charAt(0).toLocaleUpperCase("pt-BR") + falado.slice(1);
    const existente = nomeJaExistente(nome, setoresParaEquipamentos);
    if (!existente && !setores.includes(nome)) onSetoresChange([...setores, nome]);
    atualizarFalado(id, { ambiente: existente || nome, situacao: "ok" });
  }

  function confirmarFalados(ids: string[]) {
    const prontos = falados.filter((item) => ids.includes(item.id) && podeConfirmar(item));
    if (prontos.length === 0) return;
    onEquipamentosChange([
      ...equipamentos,
      ...prontos.map((item) => ({ id: crypto.randomUUID(), setor: item.ambiente, nome: item.nome, quantidade: item.quantidade, estado: "Não avaliado" as const, observacao: "" })),
    ]);
    setFalados((atuais) => atuais.filter((item) => !prontos.some((pronto) => pronto.id === item.id)));
  }

  function corrigirFalado(id: string) {
    const item = falados.find((atual) => atual.id === id);
    if (!item) return;
    setNomeEquipamento(item.nome);
    setQuantidadeEquipamento(String(item.quantidade));
    if (item.ambiente && setoresParaEquipamentos.includes(item.ambiente)) setSetorEquipamento(item.ambiente);
    setFalados((atuais) => atuais.filter((atual) => atual.id !== id));
  }

  function mudarEquipamento(id: string, mudanca: Partial<EquipamentoSetor>) {
    onEquipamentosChange(equipamentos.map((item) => (item.id === id ? { ...item, ...mudanca } : item)));
  }

  function adicionarAmbienteReal() {
    const nome = novoAmbiente.trim();
    if (!nome || erroDoNovoAmbiente) return;
    onSetoresChange([...setores, nome]);
    setNovoAmbiente("");
  }

  function adicionarResponsabilidade() {
    onResponsabilidadesChange([
      ...responsabilidades,
      {
        id: crypto.randomUUID(),
        papel: papelAdicional,
        descricao: "",
        ativa: true,
      },
    ]);
  }

  return (
    <div className={modo === "completo" ? "mt-6 space-y-4 border-t border-slate-200 pt-5" : "space-y-4"}>
      {modo === "completo" && <div>
        <div className="text-xs font-extrabold uppercase tracking-wide text-[color:var(--brand)]">Base do Manual de Boas Práticas</div>
        <h3 className="mt-1 text-xl font-extrabold text-slate-950">Identificação, setores e responsabilidades</h3>
        <p className="mt-1 text-sm text-slate-500">Esses dados serão reutilizados no Manual, nas visitas e nos relatórios.</p>
      </div>}

      {mostrarAmbientes && (
        <section className="cad-cartao cadamb-unico" aria-label="Ambientes da empresa">
          <div className="cadamb-topo">
            <div className="cadamb-topo-textos">
              <div className="cad-titulo">Ambientes da empresa</div>
              <div className="cad-descricao">{resumoDosSetoresMarcados(setores)}</div>
            </div>
            <div className="cadamb-topo-acoes">
              <EscolhaEmJanela
                modo="botao"
                titulo="Setores do estabelecimento"
                apoio="Marque somente os setores que realmente existem nesta empresa."
                opcoes={SETORES_OFICIAIS_MANUAL.map((setor) => ({ id: setor, titulo: setor }))}
                marcadas={oficiaisMarcados}
                palavra="setores marcados"
                rotuloDoBotao="Escolher setores"
                vazio="Nenhum setor marcado"
                salvas={setoresSalvos}
                onAplicar={aplicarSetores}
              />
              {onModelosChange && semQuestionario.length > 0 && (
                <button type="button" className="ui-btn ui-btn--secondary" aria-expanded={loteAberto} onClick={() => abrirLote(semQuestionario)}>
                  Vincular questionário
                </button>
              )}
            </div>
          </div>

          {setores.length === 0 ? (
            <p className="esc-vazio">Nenhum ambiente ainda. Escolha os setores ou adicione um ambiente com nome próprio abaixo.</p>
          ) : (
            <ul className="cadamb-lista">
              {setores.map((setor) => {
                const proprio = !SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]);
                const semModelo = semQuestionario.includes(setor);
                const editandoNome = renomeando?.de === setor;
                const erroNome = editandoNome ? erroDoNovoNome(setor, renomeando.texto, setores) : "";
                return (
                  <li key={setor} className="cadamb-linha">
                    <div className="cadamb-nome">
                      {editandoNome ? (
                        <span className="cadamb-renomear">
                          <input
                            className="ui-input cad-input"
                            value={renomeando.texto}
                            autoFocus
                            aria-label={`Novo nome de ${setor}`}
                            aria-invalid={Boolean(erroNome)}
                            onChange={(event) => setRenomeando({ de: setor, texto: event.target.value })}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                void confirmarRenomear();
                              } else if (event.key === "Escape") setRenomeando(null);
                            }}
                          />
                          <button type="button" className="ui-btn ui-btn--save" disabled={Boolean(erroNome)} onClick={() => void confirmarRenomear()}>Renomear</button>
                          <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setRenomeando(null)}>Cancelar</button>
                          {erroNome && renomeando.texto !== setor && <span className="ui-field-error" role="alert">{erroNome}</span>}
                        </span>
                      ) : (
                        <>
                          <span className="cad-item-nome">{setor}</span>
                          <span className="cadamb-tipo">{proprio ? "Nome próprio" : "Setor oficial"}</span>
                        </>
                      )}
                    </div>
                    <div className="cadamb-meio">
                      {proprio && onVinculosChange && oficiaisMarcados.length > 0 && (
                        <label className="cad-vinculo">
                          <span>Setor oficial</span>
                          <Select
                            value={vinculos[setor] && oficiaisMarcados.includes(vinculos[setor]) ? vinculos[setor] : ""}
                            onChange={(event) => {
                              const { [setor]: _removido, ...resto } = vinculos;
                              onVinculosChange(event.target.value ? { ...resto, [setor]: event.target.value } : resto);
                            }}
                            aria-label={`Setor oficial de ${setor}`}
                          >
                            <option value="">Nenhum (opcional)</option>
                            {oficiaisMarcados.map((oficial) => <option key={oficial} value={oficial}>{oficial}</option>)}
                          </Select>
                        </label>
                      )}
                      {proprio && semModelo && (
                        <span className="cadamb-aviso" role="status">
                          Sem questionário
                          {onModelosChange && <button type="button" className="cadamb-aviso-acao" onClick={() => abrirLote([setor])}>Vincular</button>}
                        </span>
                      )}
                      {proprio && !semModelo && modelos[setor] && <span className="cadamb-modelo">Questionário: {modelos[setor]}</span>}
                    </div>
                    <div className="cadamb-acoes">
                      {proprio && onRenomearAmbiente && !editandoNome && (
                        <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" aria-label={`Renomear ${setor}`} onClick={() => setRenomeando({ de: setor, texto: setor })}>Renomear</button>
                      )}
                      <button type="button" onClick={() => pedirRemover(setor)} className="cad-remover" aria-label={`Remover ${setor}`}>Remover</button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {bloqueio && (
            <div className="cadamb-bloqueio" role="alert">
              <p>{bloqueio.mensagem}</p>
              <div className="cadamb-bloqueio-acoes">
                {destinosParaMover.length > 0 && (
                  <label className="cad-vinculo">
                    <span>Mover para</span>
                    <Select value={destinoDoMover} onChange={(event) => setDestinoDoMover(event.target.value)} aria-label="Ambiente de destino dos equipamentos">
                      <option value="">Escolher o ambiente…</option>
                      {destinosParaMover.map((destino) => <option key={destino} value={destino}>{destino}</option>)}
                    </Select>
                  </label>
                )}
                <button type="button" className="ui-btn ui-btn--primary" disabled={!destinoDoMover} onClick={moverEEExcluir}>Mover e remover o ambiente</button>
                <button type="button" className="ui-btn ui-btn--secondary" onClick={excluirTudo}>Excluir equipamentos e o ambiente</button>
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setBloqueio(null)}>Cancelar</button>
              </div>
            </div>
          )}

          {loteAberto && onModelosChange && (
            <div className="cadamb-lote" role="group" aria-label="Vincular questionário em lote">
              <div className="cad-titulo">Vincular questionário a vários ambientes</div>
              <ul className="cadamb-lote-lista">
                {setores.filter((setor) => !SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number])).map((setor) => (
                  <li key={setor}>
                    <label className="cadamb-lote-item">
                      <input type="checkbox" checked={loteSelecionados.includes(setor)} onChange={() => setLoteSelecionados((atual) => (atual.includes(setor) ? atual.filter((item) => item !== setor) : [...atual, setor]))} />
                      <span>{setor}</span>
                      {semQuestionario.includes(setor) && <span className="cadamb-aviso">Sem questionário</span>}
                    </label>
                  </li>
                ))}
              </ul>
              <label className="cad-vinculo">
                <span>Questionário</span>
                <Select value={loteModelo} onChange={(event) => setLoteModelo(event.target.value)} aria-label="Questionário a vincular">
                  <option value="">Escolher o questionário…</option>
                  {OPCOES_MODELO_QUESTIONARIO.filter((modelo) => modelo !== MODELO_GENERICO).map((modelo) => <option key={modelo} value={modelo}>{modelo}</option>)}
                </Select>
              </label>
              <div className="cadamb-bloqueio-acoes">
                <button type="button" className="ui-btn ui-btn--save" disabled={!loteModelo || loteSelecionados.length === 0} onClick={aplicarLote}>
                  Vincular a {loteSelecionados.length === 1 ? "1 ambiente" : `${loteSelecionados.length} ambientes`}
                </button>
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setLoteAberto(false)}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Uma linha só: o campo (com o microfone dentro, na ponta direita) e o botão de 40 px alinhado a ele. */}
          <div className="cad-linha cad-linha--ambiente">
            <span className="ui-field-wrap cad-campo-voz">
              <input
                value={novoAmbiente}
                onChange={(event) => setNovoAmbiente(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    adicionarAmbienteReal();
                  }
                }}
                placeholder="Nome real do ambiente, ex.: Churrasqueira"
                aria-label="Nome real do ambiente"
                aria-invalid={Boolean(erroDoNovoAmbiente)}
                className="ui-input cad-input cad-input--voz"
              />
              <span className="ui-field-tools cad-mic">
                <FieldVoiceTools
                  fieldKey="novo-ambiente"
                  value={novoAmbiente}
                  onChange={setNovoAmbiente}
                  contexto="Nome curto e objetivo de um ambiente ou setor de um estabelecimento de alimentos."
                  somenteVoz
                  soIcone
                />
              </span>
            </span>
            <button type="button" onClick={adicionarAmbienteReal} disabled={Boolean(erroDoNovoAmbiente)} className="ui-btn ui-btn--criar cad-adicionar">Adicionar</button>
          </div>
          {erroDoNovoAmbiente && <span className="ui-field-error" role="alert">{erroDoNovoAmbiente}</span>}
        </section>
      )}

      {mostrarResponsabilidades && (
        <section className="resp" aria-label="Responsabilidades">
          <header className="resp-topo">
            <SectionTitle title="Responsabilidades" description="Textos base do Manual. Desative ou ajuste conforme o contrato e a realidade do cliente." />
          </header>
          <div className="resp-lista">
            {(["Proprietário", "Consultor/RT"] as PapelResponsabilidadeManual[]).map((papel) => {
              const recolhido = gruposRecolhidos.includes(papel);
              return (
                <div key={papel} className="resp-grupo">
                  <button type="button" className="resp-grupo-topo" aria-expanded={!recolhido} onClick={() => setGruposRecolhidos((atuais) => (recolhido ? atuais.filter((item) => item !== papel) : [...atuais, papel]))}>
                    <span className="resp-grupo-titulo">{papel}</span>
                    <span className="cad-conta">{textoDosAtivos(responsabilidades, papel)}</span>
                    <span aria-hidden="true">{recolhido ? "▸" : "▾"}</span>
                  </button>
                  {!recolhido && (
                    <ul className="resp-itens">
                      {responsabilidades.map((responsabilidade, indice) => {
                        if (responsabilidade.papel !== papel) return null;
                        const editando = respEmEdicao === responsabilidade.id;
                        const mudar = (alteracao: Partial<ResponsabilidadeManual>) => onResponsabilidadesChange(responsabilidades.map((item, atual) => (atual === indice ? { ...item, ...alteracao } : item)));
                        return (
                          <li key={responsabilidade.id} className={`resp-item${editando ? " is-editando" : ""}${responsabilidade.ativa ? "" : " is-inativa"}`}>
                            <div className="resp-linha">
                              <input aria-label="Incluir responsabilidade" type="checkbox" checked={responsabilidade.ativa} onChange={(event) => mudar({ ativa: event.target.checked })} />
                              <button type="button" className="resp-texto" aria-expanded={editando} onClick={() => setRespEmEdicao(editando ? null : responsabilidade.id)}>
                                {textoCurtoDaResponsabilidade(responsabilidade.descricao)}
                              </button>
                              <button type="button" aria-label="Excluir responsabilidade" onClick={() => onResponsabilidadesChange(responsabilidades.filter((_, atual) => atual !== indice))} className="cad-remover">Excluir</button>
                            </div>
                            {editando && (
                              <div className="resp-edicao">
                                <textarea rows={3} value={responsabilidade.descricao} onChange={(event) => mudar({ descricao: event.target.value })} className="ui-input cad-obs-texto" aria-label="Texto da responsabilidade" autoFocus />
                                <FieldVoiceTools
                                  fieldKey={`responsabilidade-${responsabilidade.id}`}
                                  value={responsabilidade.descricao}
                                  onChange={(texto) => mudar({ descricao: texto })}
                                  contexto={`Responsabilidade do papel ${papel} em um Manual de Boas Práticas. Preserve obrigações e fatos informados.`}
                                />
                                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small resp-pronto" onClick={() => setRespEmEdicao(null)}>Pronto</button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
          <div className="resp-rodape">
            <Select value={papelAdicional} onChange={(event) => setPapelAdicional(event.target.value as PapelResponsabilidadeManual)} className="cad-input resp-papel" aria-label="Papel da nova responsabilidade">
              <option>Proprietário</option>
              <option>Consultor/RT</option>
            </Select>
            <button type="button" onClick={adicionarResponsabilidade} className="ui-btn ui-btn--secondary">+ Adicionar responsabilidade</button>
          </div>
        </section>
      )}

      {mostrarEquipamentos && (
        <section className="cad-cartao" aria-label="Quadro de equipamentos e móveis">
          <div className="cad-titulo">Quadro de equipamentos e móveis</div>
          <p className="cad-descricao">Cadastre os itens vinculados a cada setor do estabelecimento.</p>
          {/* Numa linha só: ambiente · equipamento (microfone dentro) · Qtd · Adicionar. */}
          <div className="cad-linha cad-linha--equipamento">
            <label className="cad-rotulado cad-rotulado--ambiente">
              <span>Ambiente</span>
              <Select value={setorEquipamento} onChange={(event) => setSetorEquipamento(event.target.value)} className="cad-input" aria-label="Ambiente ou setor do equipamento">
                {setoresParaEquipamentos.map((setor) => <option key={setor}>{setor}</option>)}
              </Select>
            </label>
            <label className="cad-rotulado cad-rotulado--nome">
              <span>Equipamento ou móvel</span>
              <span className="ui-field-wrap cad-campo-voz">
                <input
                  value={nomeEquipamento}
                  onChange={(event) => setNomeEquipamento(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      adicionarEquipamento();
                    }
                  }}
                  placeholder="Ex.: Refrigerador"
                  className="ui-input cad-input cad-input--voz"
                />
                <span className="ui-field-tools cad-mic">
                  <FieldVoiceTools fieldKey="novo-equipamento" value={nomeEquipamento} onChange={setNomeEquipamento} onTextoDitado={tratarFalaDeEquipamento} contexto="Nome curto de um equipamento ou móvel de estabelecimento de alimentos." somenteVoz soIcone />
                </span>
              </span>
            </label>
            <label className="cad-rotulado cad-rotulado--qtd">
              <span>Qtd</span>
              <input type="number" min="1" value={quantidadeEquipamento} onChange={(event) => setQuantidadeEquipamento(event.target.value)} className="ui-input cad-input" />
            </label>
            <button type="button" onClick={adicionarEquipamento} className="ui-btn ui-btn--criar cad-adicionar">Adicionar</button>
          </div>

          <VozEquipamentosConferencia
            itens={falados}
            ambientes={setoresParaEquipamentos}
            onEscolherAmbiente={(id, ambiente) => atualizarFalado(id, { ambiente, situacao: ambiente ? "ok" : "faltando" })}
            onCriarAmbiente={criarAmbienteFalado}
            onConfirmar={(id) => confirmarFalados([id])}
            onConfirmarTodos={() => confirmarFalados(falados.map((item) => item.id))}
            onCorrigir={corrigirFalado}
          />

          <div className="cad-grupos">
            {gruposDeEquipamentos.map((grupo) => (
              <div key={grupo.setor} className="cad-grupo">
                <div className="cad-grupo-titulo">
                  <span>{grupo.setor}</span>
                  <span className="cad-conta" aria-label={`${grupo.itens.length} itens`}>{grupo.itens.length}</span>
                </div>
                <ul className="cad-lista">
                  {grupo.itens.map((equipamento) => {
                    const aberto = detalhesAbertos.includes(equipamento.id);
                    return (
                      <li key={equipamento.id} className="cad-equip">
                        <div className="cad-equip-linha">
                          <input value={equipamento.nome} onChange={(event) => mudarEquipamento(equipamento.id, { nome: event.target.value })} className="ui-input cad-input cad-equip-nome" aria-label="Nome do equipamento" />
                          <input type="number" min="1" value={equipamento.quantidade} onChange={(event) => mudarEquipamento(equipamento.id, { quantidade: Math.max(1, Number(event.target.value) || 1) })} className="ui-input cad-input cad-equip-qtd" aria-label="Quantidade" />
                          <button type="button" className="cad-detalhes" aria-expanded={aberto} onClick={() => setDetalhesAbertos((atuais) => (aberto ? atuais.filter((id) => id !== equipamento.id) : [...atuais, equipamento.id]))}>
                            Detalhes {aberto ? "▾" : "▸"}{!aberto && (equipamento.observacao || "").trim() ? <span className="cad-detalhes-marca" title="Tem observação"> ●</span> : null}
                          </button>
                          <button type="button" onClick={() => onEquipamentosChange(equipamentos.filter((item) => item.id !== equipamento.id))} className="cad-remover">Remover</button>
                        </div>
                        {aberto && (
                          <div className="cad-equip-detalhes">
                            <label className="cad-rotulado cad-rotulado--mover">
                              <span>Mover para outro ambiente</span>
                              <Select value="" onChange={(event) => onEquipamentosChange(moverEquipamento(equipamentos, equipamento.id, event.target.value))} className="cad-input">
                                <option value="">Escolher o ambiente…</option>
                                {ambientesParaMover(setoresParaEquipamentos, equipamento.setor).map((setor) => <option key={setor} value={setor}>{setor}</option>)}
                              </Select>
                            </label>
                            <label className="cad-rotulado">
                              <span>Observações do equipamento</span>
                              <textarea
                                rows={2}
                                value={equipamento.observacao || ""}
                                onChange={(event) => mudarEquipamento(equipamento.id, { observacao: event.target.value })}
                                placeholder="Ex.: borracha danificada, excesso de gelo, manutenção necessária..."
                                className="ui-input cad-obs-texto"
                              />
                            </label>
                            <FieldVoiceTools
                              fieldKey={`equipamento-${equipamento.id}`}
                              value={equipamento.observacao || ""}
                              onChange={(texto) => mudarEquipamento(equipamento.id, { observacao: texto })}
                              contexto={`Observação técnica sobre o equipamento "${equipamento.nome}" no setor "${equipamento.setor}". Seja claro, objetivo e não invente fatos.`}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {equipamentos.length === 0 && <div className="cad-vazio">Nenhum equipamento ou móvel cadastrado.</div>}
          </div>
        </section>
      )}
    </div>
  );
}
