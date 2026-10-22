"use client";

import { useState } from "react";
import type {
  EquipamentoSetor,
  PapelResponsabilidadeManual,
  ResponsabilidadeManual,
} from "@/types";
import { SETORES_OFICIAIS_MANUAL, agruparEquipamentosPorAmbiente, resumoDosSetoresMarcados } from "@/lib/manualBase";
import { aplicarEscolhaDeSetores } from "@/lib/escolhaEmJanela";
import EscolhaEmJanela from "@/components/EscolhaEmJanela";
import FieldVoiceTools from "@/components/FieldVoiceTools";

type Props = {
  responsabilidades: ResponsabilidadeManual[];
  onResponsabilidadesChange: (responsabilidades: ResponsabilidadeManual[]) => void;
  setores: string[];
  onSetoresChange: (setores: string[]) => void;
  equipamentos: EquipamentoSetor[];
  onEquipamentosChange: (equipamentos: EquipamentoSetor[]) => void;
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
  modo = "completo",
}: Props) {
  const [setorEquipamento, setSetorEquipamento] = useState(setores[0] || SETORES_OFICIAIS_MANUAL[0]);
  const [nomeEquipamento, setNomeEquipamento] = useState("");
  const [quantidadeEquipamento, setQuantidadeEquipamento] = useState("1");
  const [papelAdicional, setPapelAdicional] = useState<PapelResponsabilidadeManual>("Proprietário");
  const [novoAmbiente, setNovoAmbiente] = useState("");

  const setoresParaEquipamentos = setores.length ? setores : [...SETORES_OFICIAIS_MANUAL];
  const mostrarAmbientes = modo === "completo" || modo === "ambientes";
  const mostrarEquipamentos = modo === "completo" || modo === "equipamentos";
  const mostrarResponsabilidades = modo === "completo" || modo === "responsabilidades";
  const proprios = setores.filter((setor) => !SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]));
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

      {mostrarResponsabilidades && <details open={modo === "responsabilidades"} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer list-none">
          <SectionTitle title="Responsabilidades" description="Textos base do Manual. Desative ou ajuste conforme o contrato e a realidade do cliente." />
        </summary>
        <div className="mt-4 space-y-5">
          {(["Proprietário", "Consultor/RT"] as PapelResponsabilidadeManual[]).map((papel) => (
            <div key={papel}>
              <div className="mb-2 text-sm font-extrabold text-[color:var(--ink)]">{papel}</div>
              <div className="space-y-2">
                {responsabilidades.map((responsabilidade, indice) => responsabilidade.papel === papel && (
                  <div key={responsabilidade.id} className="flex gap-2 rounded-xl bg-white p-3">
                    <input aria-label="Incluir responsabilidade" type="checkbox" checked={responsabilidade.ativa} onChange={(event) => onResponsabilidadesChange(responsabilidades.map((item, atual) => atual === indice ? { ...item, ativa: event.target.checked } : item))} />
                    <div className="min-w-0 flex-1">
                      <textarea rows={2} value={responsabilidade.descricao} onChange={(event) => onResponsabilidadesChange(responsabilidades.map((item, atual) => atual === indice ? { ...item, descricao: event.target.value } : item))} className="min-h-16 w-full rounded-lg border p-2 text-sm" />
                      <FieldVoiceTools
                        fieldKey={`responsabilidade-${responsabilidade.id}`}
                        value={responsabilidade.descricao}
                        onChange={(texto) => onResponsabilidadesChange(responsabilidades.map((item, atual) => atual === indice ? { ...item, descricao: texto } : item))}
                        contexto={`Responsabilidade do papel ${papel} em um Manual de Boas Práticas. Preserve obrigações e fatos informados.`}
                      />
                    </div>
                    <button type="button" aria-label="Excluir responsabilidade" onClick={() => onResponsabilidadesChange(responsabilidades.filter((_, atual) => atual !== indice))} className="self-start rounded-lg bg-[var(--nc-bg)] px-2 py-1 text-xs font-bold text-[color:var(--ink)]">Excluir</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <select value={papelAdicional} onChange={(event) => setPapelAdicional(event.target.value as PapelResponsabilidadeManual)} className="rounded-xl border bg-white p-2 text-sm">
            <option>Proprietário</option>
            <option>Consultor/RT</option>
          </select>
          <button type="button" onClick={adicionarResponsabilidade} className="rounded-xl bg-[var(--brand-soft)] px-4 py-2 text-sm font-extrabold text-[color:var(--brand)]">+ Adicionar responsabilidade</button>
        </div>
      </details>}

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
                <div className="cad-grupo-titulo">{grupo.setor} · {grupo.itens.length}</div>
                <ul className="cad-lista">
                  {grupo.itens.map((equipamento) => (
                    <li key={equipamento.id} className="cad-equip">
                      <div className="cad-equip-linha">
                        <input value={equipamento.nome} onChange={(event) => mudarEquipamento(equipamento.id, { nome: event.target.value })} className="ui-input cad-input cad-equip-nome" aria-label="Nome do equipamento" />
                        <input type="number" min="1" value={equipamento.quantidade} onChange={(event) => mudarEquipamento(equipamento.id, { quantidade: Math.max(1, Number(event.target.value) || 1) })} className="ui-input cad-input cad-equip-qtd" aria-label="Quantidade" />
                        <button type="button" onClick={() => onEquipamentosChange(equipamentos.filter((item) => item.id !== equipamento.id))} className="cad-remover">Remover</button>
                      </div>
                      <details className="cad-mais" open={Boolean((equipamento.observacao || "").trim())}>
                        <summary>Observação e ambiente</summary>
                        <label className="cad-rotulado">
                          <span>Ambiente</span>
                          <select value={equipamento.setor} onChange={(event) => mudarEquipamento(equipamento.id, { setor: event.target.value })} className="cad-input">
                            {setoresParaEquipamentos.includes(equipamento.setor) ? null : <option>{equipamento.setor}</option>}
                            {setoresParaEquipamentos.map((setor) => <option key={setor}>{setor}</option>)}
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
                      </details>
                    </li>
                  ))}
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
