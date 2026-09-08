"use client";

import { useState } from "react";
import type {
  EquipamentoSetor,
  PapelResponsabilidadeManual,
  ResponsabilidadeManual,
} from "@/types";
import {
  SETORES_OFICIAIS_MANUAL,
} from "@/lib/manualBase";

type Props = {
  responsabilidades: ResponsabilidadeManual[];
  onResponsabilidadesChange: (responsabilidades: ResponsabilidadeManual[]) => void;
  setores: string[];
  onSetoresChange: (setores: string[]) => void;
  equipamentos: EquipamentoSetor[];
  onEquipamentosChange: (equipamentos: EquipamentoSetor[]) => void;
  modo?: "completo" | "responsabilidades" | "ambientes";
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
  const mostrarResponsabilidades = modo === "completo" || modo === "responsabilidades";

  function toggleSetor(setor: string) {
    const proximos = setores.includes(setor)
      ? setores.filter((item) => item !== setor)
      : [...setores, setor];
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
        <div className="text-xs font-extrabold uppercase tracking-wide text-[#2F5597]">Base do Manual de Boas Práticas</div>
        <h3 className="mt-1 text-xl font-extrabold text-slate-950">Identificação, setores e responsabilidades</h3>
        <p className="mt-1 text-sm text-slate-500">Esses dados serão reutilizados no Manual, nas visitas e nos relatórios.</p>
      </div>}

      {mostrarAmbientes && <details open className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer list-none">
          <SectionTitle title="Setores do estabelecimento" description="Selecione somente os setores que realmente existem nesta empresa." />
        </summary>
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {SETORES_OFICIAIS_MANUAL.map((setor) => (
            <label key={setor} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${setores.includes(setor) ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
              <input type="checkbox" checked={setores.includes(setor)} onChange={() => toggleSetor(setor)} />
              <span className="font-bold">{setor}</span>
            </label>
          ))}
        </div>
        {setores.filter((setor) => !SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number])).length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="text-xs font-extrabold uppercase tracking-wide text-[#2F5597]">Ambientes com nomes próprios da empresa</div>
            {setores
              .filter((setor) => !SETORES_OFICIAIS_MANUAL.includes(setor as (typeof SETORES_OFICIAIS_MANUAL)[number]))
              .map((setor) => (
                <div key={setor} className="flex items-center justify-between gap-3 rounded-xl border border-blue-100 bg-white p-3 text-sm">
                  <span className="font-bold">{setor}</span>
                  <button type="button" onClick={() => onSetoresChange(setores.filter((item) => item !== setor))} className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700">Remover</button>
                </div>
              ))}
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input value={novoAmbiente} onChange={(event) => setNovoAmbiente(event.target.value)} placeholder="Nome real do ambiente, ex.: Churrasqueira" className="min-w-0 flex-1 rounded-xl border bg-white p-3 text-sm" />
          <button type="button" onClick={adicionarAmbienteReal} className="rounded-xl bg-[#17365D] px-4 py-3 text-sm font-extrabold text-white">Adicionar ambiente</button>
        </div>
        <div className="mt-3 text-xs font-bold text-slate-500">{setores.length} setor(es) selecionado(s)</div>
      </details>}

      {mostrarResponsabilidades && <details open={modo === "responsabilidades"} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer list-none">
          <SectionTitle title="Responsabilidades" description="Textos base do Manual. Desative ou ajuste conforme o contrato e a realidade do cliente." />
        </summary>
        <div className="mt-4 space-y-5">
          {(["Proprietário", "Consultor/RT"] as PapelResponsabilidadeManual[]).map((papel) => (
            <div key={papel}>
              <div className="mb-2 text-sm font-extrabold text-[#17365D]">{papel}</div>
              <div className="space-y-2">
                {responsabilidades.map((responsabilidade, indice) => responsabilidade.papel === papel && (
                  <div key={responsabilidade.id} className="flex gap-2 rounded-xl bg-white p-3">
                    <input aria-label="Incluir responsabilidade" type="checkbox" checked={responsabilidade.ativa} onChange={(event) => onResponsabilidadesChange(responsabilidades.map((item, atual) => atual === indice ? { ...item, ativa: event.target.checked } : item))} />
                    <textarea rows={2} value={responsabilidade.descricao} onChange={(event) => onResponsabilidadesChange(responsabilidades.map((item, atual) => atual === indice ? { ...item, descricao: event.target.value } : item))} className="min-h-16 flex-1 rounded-lg border p-2 text-sm" />
                    <button type="button" aria-label="Excluir responsabilidade" onClick={() => onResponsabilidadesChange(responsabilidades.filter((_, atual) => atual !== indice))} className="self-start rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Excluir</button>
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
          <button type="button" onClick={adicionarResponsabilidade} className="rounded-xl bg-blue-50 px-4 py-2 text-sm font-extrabold text-[#2F5597]">+ Adicionar responsabilidade</button>
        </div>
      </details>}

      {mostrarAmbientes && <details open className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer list-none">
          <SectionTitle title="Quadro de equipamentos e móveis" description="Cadastre os itens vinculados a cada setor do estabelecimento." />
        </summary>
        <div className="mt-4 grid min-w-0 gap-2 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_100px_auto]">
          <select value={setorEquipamento} onChange={(event) => setSetorEquipamento(event.target.value)} className="min-w-0 w-full rounded-xl border bg-white p-3 text-sm">
            {setoresParaEquipamentos.map((setor) => <option key={setor}>{setor}</option>)}
          </select>
          <input value={nomeEquipamento} onChange={(event) => setNomeEquipamento(event.target.value)} placeholder="Ex.: Refrigerador" className="min-w-0 w-full rounded-xl border p-3 text-sm" />
          <input type="number" min="1" value={quantidadeEquipamento} onChange={(event) => setQuantidadeEquipamento(event.target.value)} className="min-w-0 w-full rounded-xl border p-3 text-sm" aria-label="Quantidade" />
          <button type="button" onClick={adicionarEquipamento} className="w-full rounded-xl bg-[#2F5597] px-4 py-3 text-sm font-extrabold text-white">Adicionar</button>
        </div>

        <div className="mt-4 space-y-2">
          {equipamentos.map((equipamento, indice) => (
            <div key={equipamento.id} className="grid min-w-0 gap-2 rounded-xl border-2 border-blue-200 bg-blue-50/70 p-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_90px_auto]">
              <select value={equipamento.setor} onChange={(event) => onEquipamentosChange(equipamentos.map((item, atual) => atual === indice ? { ...item, setor: event.target.value } : item))} className="min-w-0 w-full rounded-lg border p-2 text-xs">
                {setoresParaEquipamentos.map((setor) => <option key={setor}>{setor}</option>)}
              </select>
              <input value={equipamento.nome} onChange={(event) => onEquipamentosChange(equipamentos.map((item, atual) => atual === indice ? { ...item, nome: event.target.value } : item))} className="min-w-0 w-full rounded-lg border p-2 text-sm" />
              <input type="number" min="1" value={equipamento.quantidade} onChange={(event) => onEquipamentosChange(equipamentos.map((item, atual) => atual === indice ? { ...item, quantidade: Math.max(1, Number(event.target.value) || 1) } : item))} className="min-w-0 w-full rounded-lg border p-2 text-sm" />
              <button type="button" onClick={() => onEquipamentosChange(equipamentos.filter((_, atual) => atual !== indice))} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Excluir</button>
            </div>
          ))}
          {equipamentos.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Nenhum equipamento ou móvel cadastrado.</div>}
        </div>
      </details>}
    </div>
  );
}
