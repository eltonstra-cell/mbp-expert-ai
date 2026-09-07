"use client";

import { useMemo, useState } from "react";
import type {
  EquipamentoSetor,
  EstadoEquipamento,
  HorarioFuncionamento,
  PapelResponsabilidadeManual,
  ResponsabilidadeManual,
} from "@/types";
import {
  criarHorarioExemploManual,
  resumirHorarioFuncionamento,
  SETORES_OFICIAIS_MANUAL,
} from "@/lib/manualBase";

type Props = {
  horarios: HorarioFuncionamento[];
  onHorariosChange: (horarios: HorarioFuncionamento[]) => void;
  responsabilidades: ResponsabilidadeManual[];
  onResponsabilidadesChange: (responsabilidades: ResponsabilidadeManual[]) => void;
  setores: string[];
  onSetoresChange: (setores: string[]) => void;
  equipamentos: EquipamentoSetor[];
  onEquipamentosChange: (equipamentos: EquipamentoSetor[]) => void;
};

const estadosEquipamento: EstadoEquipamento[] = [
  "Não avaliado",
  "Adequado",
  "Requer atenção",
  "Inadequado",
];

function SectionTitle({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <div className="font-extrabold text-slate-950">{title}</div>
      <div className="mt-0.5 text-xs text-slate-500">{description}</div>
    </div>
  );
}

export default function ManualBaseFields({
  horarios,
  onHorariosChange,
  responsabilidades,
  onResponsabilidadesChange,
  setores,
  onSetoresChange,
  equipamentos,
  onEquipamentosChange,
}: Props) {
  const [setorEquipamento, setSetorEquipamento] = useState(setores[0] || SETORES_OFICIAIS_MANUAL[0]);
  const [nomeEquipamento, setNomeEquipamento] = useState("");
  const [quantidadeEquipamento, setQuantidadeEquipamento] = useState("1");
  const [papelAdicional, setPapelAdicional] = useState<PapelResponsabilidadeManual>("Proprietário");

  const resumoHorario = useMemo(() => resumirHorarioFuncionamento(horarios), [horarios]);
  const setoresParaEquipamentos = setores.length ? setores : [...SETORES_OFICIAIS_MANUAL];

  function atualizarHorario(indice: number, patch: Partial<HorarioFuncionamento>) {
    onHorariosChange(horarios.map((item, atual) => atual === indice ? { ...item, ...patch } : item));
  }

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
    <div className="mt-6 space-y-4 border-t border-slate-200 pt-5">
      <div>
        <div className="text-xs font-extrabold uppercase tracking-wide text-[#2F5597]">Base do Manual de Boas Práticas</div>
        <h3 className="mt-1 text-xl font-extrabold text-slate-950">Identificação, setores e responsabilidades</h3>
        <p className="mt-1 text-sm text-slate-500">Esses dados serão reutilizados no Manual, nas visitas e nos relatórios.</p>
      </div>

      <details open className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer list-none">
          <SectionTitle title="Horário de funcionamento" description="Cadastre cada dia. Nada será atualizado sem sua confirmação." />
        </summary>
        <div className="mt-4 space-y-2">
          {horarios.map((horario, indice) => (
            <div key={horario.dia} className="grid items-center gap-2 rounded-xl bg-white p-3 sm:grid-cols-[1fr_auto_110px_110px]">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input type="checkbox" checked={horario.aberto} onChange={(event) => atualizarHorario(indice, { aberto: event.target.checked })} />
                {horario.dia}
              </label>
              <span className={`text-xs font-bold ${horario.aberto ? "text-emerald-700" : "text-slate-400"}`}>
                {horario.aberto ? "Aberto" : "Fechado"}
              </span>
              <input aria-label={`Abertura de ${horario.dia}`} type="time" disabled={!horario.aberto} value={horario.abertura} onChange={(event) => atualizarHorario(indice, { abertura: event.target.value })} className="rounded-lg border p-2 disabled:bg-slate-100" />
              <input aria-label={`Fechamento de ${horario.dia}`} type="time" disabled={!horario.aberto} value={horario.fechamento} onChange={(event) => atualizarHorario(indice, { fechamento: event.target.value })} className="rounded-lg border p-2 disabled:bg-slate-100" />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => onHorariosChange(criarHorarioExemploManual())} className="mt-3 rounded-xl bg-blue-50 px-4 py-2 text-xs font-extrabold text-[#2F5597]">
          Usar exemplo do Manual
        </button>
        <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-slate-700">
          <strong>Como aparecerá no Manual:</strong> {resumoHorario}
        </div>
      </details>

      <details open className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
        <div className="mt-3 text-xs font-bold text-slate-500">{setores.length} setor(es) selecionado(s)</div>
      </details>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
      </details>

      <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <summary className="cursor-pointer list-none">
          <SectionTitle title="Quadro de equipamentos e móveis" description="Cadastre os itens vinculados a cada setor do estabelecimento." />
        </summary>
        <div className="mt-4 grid gap-2 md:grid-cols-[1.4fr_1fr_100px_auto]">
          <select value={setorEquipamento} onChange={(event) => setSetorEquipamento(event.target.value)} className="rounded-xl border bg-white p-3 text-sm">
            {setoresParaEquipamentos.map((setor) => <option key={setor}>{setor}</option>)}
          </select>
          <input value={nomeEquipamento} onChange={(event) => setNomeEquipamento(event.target.value)} placeholder="Ex.: Refrigerador" className="rounded-xl border p-3 text-sm" />
          <input type="number" min="1" value={quantidadeEquipamento} onChange={(event) => setQuantidadeEquipamento(event.target.value)} className="rounded-xl border p-3 text-sm" aria-label="Quantidade" />
          <button type="button" onClick={adicionarEquipamento} className="rounded-xl bg-[#2F5597] px-4 py-3 text-sm font-extrabold text-white">Adicionar</button>
        </div>

        <div className="mt-4 space-y-2">
          {equipamentos.map((equipamento, indice) => (
            <div key={equipamento.id} className="grid gap-2 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[1.3fr_1fr_90px_150px_auto]">
              <select value={equipamento.setor} onChange={(event) => onEquipamentosChange(equipamentos.map((item, atual) => atual === indice ? { ...item, setor: event.target.value } : item))} className="rounded-lg border p-2 text-xs">
                {setoresParaEquipamentos.map((setor) => <option key={setor}>{setor}</option>)}
              </select>
              <input value={equipamento.nome} onChange={(event) => onEquipamentosChange(equipamentos.map((item, atual) => atual === indice ? { ...item, nome: event.target.value } : item))} className="rounded-lg border p-2 text-sm" />
              <input type="number" min="1" value={equipamento.quantidade} onChange={(event) => onEquipamentosChange(equipamentos.map((item, atual) => atual === indice ? { ...item, quantidade: Math.max(1, Number(event.target.value) || 1) } : item))} className="rounded-lg border p-2 text-sm" />
              <select value={equipamento.estado} onChange={(event) => onEquipamentosChange(equipamentos.map((item, atual) => atual === indice ? { ...item, estado: event.target.value as EstadoEquipamento } : item))} className="rounded-lg border p-2 text-xs">
                {estadosEquipamento.map((estado) => <option key={estado}>{estado}</option>)}
              </select>
              <button type="button" onClick={() => onEquipamentosChange(equipamentos.filter((_, atual) => atual !== indice))} className="rounded-lg bg-red-50 px-2 py-1 text-xs font-bold text-red-700">Excluir</button>
              <input value={equipamento.observacao} onChange={(event) => onEquipamentosChange(equipamentos.map((item, atual) => atual === indice ? { ...item, observacao: event.target.value } : item))} placeholder="Observação opcional" className="rounded-lg border p-2 text-sm md:col-span-5" />
            </div>
          ))}
          {equipamentos.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Nenhum equipamento ou móvel cadastrado.</div>}
        </div>
      </details>
    </div>
  );
}
