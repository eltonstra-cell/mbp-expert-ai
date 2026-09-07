"use client";

import type { FluxoOperacional } from "@/types";
import { DEFINICOES_FLUXOS_OPERACIONAIS } from "@/lib/operationalFlows";

type Props = {
  fluxos: FluxoOperacional[];
  setores: string[];
  onChange: (fluxos: FluxoOperacional[]) => void;
};

export default function OperationalFlowsFields({ fluxos, setores, onChange }: Props) {
  function atualizar(indice: number, alteracao: Partial<FluxoOperacional>) {
    onChange(fluxos.map((fluxo, atual) => atual === indice ? { ...fluxo, ...alteracao } : fluxo));
  }

  const ativos = fluxos.filter((fluxo) => fluxo.aplicavel).length;

  return (
    <details className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer list-none">
        <div className="font-extrabold text-slate-950">Capítulo 2 — Fluxos operacionais</div>
        <div className="mt-0.5 text-xs text-slate-500">
          Ative somente os fluxos que existem. {ativos} de {fluxos.length} selecionado(s).
        </div>
      </summary>

      <div className="mt-4 space-y-3">
        {fluxos.map((fluxo, indice) => {
          const definicao = DEFINICOES_FLUXOS_OPERACIONAIS.find((item) => item.tipo === fluxo.tipo);
          return (
            <div key={fluxo.id} className={`rounded-xl border p-3 ${fluxo.aplicavel ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-white"}`}>
              <label className="flex cursor-pointer gap-3">
                <input
                  type="checkbox"
                  checked={fluxo.aplicavel}
                  onChange={(event) => atualizar(indice, {
                    aplicavel: event.target.checked,
                    setorVinculado:
                      event.target.checked && setores.length > 0 && !setores.includes(fluxo.setorVinculado)
                        ? setores[0]
                        : fluxo.setorVinculado,
                  })}
                />
                <span>
                  <span className="block text-sm font-extrabold text-slate-900">{fluxo.tipo}</span>
                  <span className="block text-xs text-slate-500">{definicao?.orientacao}</span>
                </span>
              </label>

              {fluxo.aplicavel && (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <label className="text-xs font-bold text-slate-600">
                    Setor onde ocorre
                    <select value={fluxo.setorVinculado} onChange={(event) => atualizar(indice, { setorVinculado: event.target.value })} className="mt-1 w-full rounded-lg border bg-white p-2 text-sm font-normal">
                      {setores.length === 0 && <option value={fluxo.setorVinculado}>{fluxo.setorVinculado}</option>}
                      {setores.map((setor) => <option key={setor} value={setor}>{setor}</option>)}
                    </select>
                  </label>
                  <label className="text-xs font-bold text-slate-600">
                    Responsável
                    <input value={fluxo.responsavel} onChange={(event) => atualizar(indice, { responsavel: event.target.value })} placeholder="Nome ou função" className="mt-1 w-full rounded-lg border bg-white p-2 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-bold text-slate-600 md:col-span-2">
                    Como acontece nesta empresa?
                    <textarea rows={2} value={fluxo.descricao} onChange={(event) => atualizar(indice, { descricao: event.target.value })} placeholder="Descrição curta do fluxo" className="mt-1 w-full rounded-lg border bg-white p-2 text-sm font-normal" />
                  </label>
                  <label className="text-xs font-bold text-slate-600 md:col-span-2">
                    Controles e registros usados
                    <input value={fluxo.controlesRegistros} onChange={(event) => atualizar(indice, { controlesRegistros: event.target.value })} placeholder="Ex.: planilha de temperatura e recebimento" className="mt-1 w-full rounded-lg border bg-white p-2 text-sm font-normal" />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </details>
  );
}
