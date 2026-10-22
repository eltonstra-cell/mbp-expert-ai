"use client";

import { useState } from "react";
import type {
  EquipamentoSetor,
  PapelResponsabilidadeManual,
  ResponsabilidadeManual,
} from "@/types";
import { SETORES_OFICIAIS_MANUAL, agruparEquipamentosPorAmbiente, resumoDosSetoresMarcados } from "@/lib/manualBase";
import { aplicarEscolhaDeSetores } from "@/lib/escolhaEmJanela";
import { ambientesParaMover, moverEquipamento } from "@/lib/equipamentosCadastro";
import { textoCurtoDaResponsabilidade, textoDosAtivos } from "@/lib/manualIdentificacao";
import EscolhaEmJanela from "@/components/EscolhaEmJanela";
import FieldVoiceTools from "@/components/FieldVoiceTools";

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
  modo?: "completo" | "responsabilidades" | "ambientes" | "equipamentos";
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
  modo = "completo",
}: Props) {
  const [setorEquipamento, setSetorEquipamento] = useState(setores[0] || SETORES_OFICIAIS_MANUAL[0]);
  const [nomeEquipamento, setNomeEquipamento] = useState("");
  const [quantidadeEquipamento, setQuantidadeEquipamento] = useState("1");
  const [papelAdicional, setPapelAdicional] = useState<PapelResponsabilidadeManual>("Proprietário");
  const [novoAmbiente, setNovoAmbiente] = useState("");
  const [detalhesAbertos, setDetalhesAbertos] = useState<string[]>([]);
  const [respEmEdicao, setRespEmEdicao] = useState<string | null>(null);
  const [gruposRecolhidos, setGruposRecolhidos] = useState<PapelResponsabilidadeManual[]>([]);

  const setoresParaEquipamentos = setores.length ? setores : [...SETORES_OFICIAIS_MANUAL];
  const mostrarAmbientes = modo === "completo" || modo === "ambientes";
  const mostrarEquipamentos = modo === "completo" || modo === "equipamentos";
  const mostrarResponsabilidades = modo === "completo" || modo === "responsabilidades";
  const proprios = setores.filter((setor) => !SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]));
  const oficiaisMarcados = setores.filter((setor) => SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]));
  const gruposDeEquipamentos = agruparEquipamentosPorAmbiente(equipamentos, setoresParaEquipamentos);

  // "Concluir" na janela de setores: aplica no estado da tela (quem grava é o Salvar da barra de baixo).
  function aplicarSetores(escolhidos: string[]) {
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

  function mudarEquipamento(id: string, mudanca: Partial<EquipamentoSetor>) {
    onEquipamentosChange(equipamentos.map((item) => (item.id === id ? { ...item, ...mudanca } : item)));
  }

  function adicionarAmbienteReal() {
    const nome = novoAmbiente.trim();
    if (!nome || setores.includes(nome)) return;
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
        <EscolhaEmJanela
          titulo="Setores do estabelecimento"
          apoio="Marque somente os setores que realmente existem nesta empresa."
          opcoes={SETORES_OFICIAIS_MANUAL.map((setor) => ({ id: setor, titulo: setor }))}
          marcadas={setores.filter((setor) => SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]))}
          palavra="setores marcados"
          rotuloDoBotao="Escolher setores"
          vazio="Nenhum setor marcado"
          salvas={setoresSalvos}
          onAplicar={aplicarSetores}
        />
      )}

      {mostrarAmbientes && (
        <section className="cad-cartao" aria-label="Ambientes com nomes próprios da empresa">
          <div className="cad-titulo">Ambientes com nomes próprios da empresa</div>
          {proprios.length > 0 && (
            <ul className="cad-lista">
              {proprios.map((setor) => (
                <li key={setor} className="cad-item">
                  <span className="cad-item-nome">{setor}</span>
                  {onVinculosChange && oficiaisMarcados.length > 0 && (
                    <label className="cad-vinculo">
                      <span>Setor oficial</span>
                      <select
                        value={vinculos[setor] && oficiaisMarcados.includes(vinculos[setor]) ? vinculos[setor] : ""}
                        onChange={(event) => {
                          const { [setor]: _removido, ...resto } = vinculos;
                          onVinculosChange(event.target.value ? { ...resto, [setor]: event.target.value } : resto);
                        }}
                        aria-label={`Setor oficial de ${setor}`}
                      >
                        <option value="">Nenhum (opcional)</option>
                        {oficiaisMarcados.map((oficial) => <option key={oficial} value={oficial}>{oficial}</option>)}
                      </select>
                    </label>
                  )}
                  <button type="button" onClick={() => onSetoresChange(setores.filter((item) => item !== setor))} className="cad-remover">Remover</button>
                </li>
              ))}
            </ul>
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
            <button type="button" onClick={adicionarAmbienteReal} className="ui-btn ui-btn--criar cad-adicionar">Adicionar</button>
          </div>
          <div className="cad-resumo">{resumoDosSetoresMarcados(setores)}</div>
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
            <select value={papelAdicional} onChange={(event) => setPapelAdicional(event.target.value as PapelResponsabilidadeManual)} className="cad-input resp-papel" aria-label="Papel da nova responsabilidade">
              <option>Proprietário</option>
              <option>Consultor/RT</option>
            </select>
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
              <select value={setorEquipamento} onChange={(event) => setSetorEquipamento(event.target.value)} className="cad-input" aria-label="Ambiente ou setor do equipamento">
                {setoresParaEquipamentos.map((setor) => <option key={setor}>{setor}</option>)}
              </select>
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
                  <FieldVoiceTools fieldKey="novo-equipamento" value={nomeEquipamento} onChange={setNomeEquipamento} contexto="Nome curto de um equipamento ou móvel de estabelecimento de alimentos." somenteVoz soIcone />
                </span>
              </span>
            </label>
            <label className="cad-rotulado cad-rotulado--qtd">
              <span>Qtd</span>
              <input type="number" min="1" value={quantidadeEquipamento} onChange={(event) => setQuantidadeEquipamento(event.target.value)} className="ui-input cad-input" />
            </label>
            <button type="button" onClick={adicionarEquipamento} className="ui-btn ui-btn--criar cad-adicionar">Adicionar</button>
          </div>

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
                              <select value="" onChange={(event) => onEquipamentosChange(moverEquipamento(equipamentos, equipamento.id, event.target.value))} className="cad-input">
                                <option value="">Escolher o ambiente…</option>
                                {ambientesParaMover(setoresParaEquipamentos, equipamento.setor).map((setor) => <option key={setor} value={setor}>{setor}</option>)}
                              </select>
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
