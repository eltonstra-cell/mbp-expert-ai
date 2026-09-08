"use client";

import { useState } from "react";
import type {
  ProcedimentoOperacionalPadronizado,
  StatusPOP,
} from "@/types";
import { DEFINICOES_PROGRAMAS_CONTROLE } from "@/lib/qualityPrograms";
import { SUGESTOES_POPS_MANUAL } from "@/lib/pops";

type Props = {
  pops: ProcedimentoOperacionalPadronizado[];
  onChange: (pops: ProcedimentoOperacionalPadronizado[]) => void;
};

const statusDisponiveis: StatusPOP[] = ["Rascunho", "Em revisão", "Aprovado", "Inativo"];

export default function PopsFields({ pops, onChange }: Props) {
  const [titulo, setTitulo] = useState("");
  const [codigo, setCodigo] = useState("");

  function adicionar() {
    if (!titulo.trim()) return;
    onChange([
      ...pops,
      {
        id: crypto.randomUUID(),
        codigo: codigo.trim(),
        titulo: titulo.trim(),
        versao: "1.0",
        status: "Rascunho",
        programaRelacionado: "",
        responsavel: "",
        proximaRevisao: "",
      },
    ]);
    setTitulo("");
    setCodigo("");
  }

  function adicionarSugestao(sugestao: (typeof SUGESTOES_POPS_MANUAL)[number]) {
    if (pops.some((pop) => pop.titulo.toLocaleLowerCase("pt-BR") === sugestao.titulo.toLocaleLowerCase("pt-BR"))) return;
    onChange([
      ...pops,
      {
        id: crypto.randomUUID(),
        codigo: sugestao.codigo,
        titulo: sugestao.titulo,
        versao: "1.0",
        status: "Rascunho",
        programaRelacionado: sugestao.programaRelacionado,
        responsavel: "",
        proximaRevisao: "",
      },
    ]);
  }

  function atualizar(indice: number, alteracao: Partial<ProcedimentoOperacionalPadronizado>) {
    onChange(pops.map((pop, atual) => atual === indice ? { ...pop, ...alteracao } : pop));
  }

  return (
    <details className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer list-none">
        <div className="font-extrabold text-slate-950">Procedimentos Operacionais Padronizados — POPs</div>
        <div className="mt-0.5 text-xs text-slate-500">
          Cadastre e acompanhe os procedimentos da empresa. {pops.length} POP(s).
        </div>
      </summary>

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-[#2F5597]">
          Sugestões citadas no Manual
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGESTOES_POPS_MANUAL.map((sugestao) => {
            const adicionado = pops.some(
              (pop) => pop.titulo.toLocaleLowerCase("pt-BR") === sugestao.titulo.toLocaleLowerCase("pt-BR")
            );
            return (
              <button
                key={sugestao.titulo}
                type="button"
                disabled={adicionado}
                onClick={() => adicionarSugestao(sugestao)}
                className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-left text-xs font-bold text-[#17365D] disabled:bg-blue-100 disabled:text-slate-500"
              >
                {adicionado ? "✓ " : "+ "}{sugestao.titulo}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-2 md:grid-cols-[130px_minmax(0,1fr)_auto]">
        <input value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="Código" className="min-w-0 w-full rounded-xl border bg-white p-3 text-sm" />
        <input value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Título do POP" className="min-w-0 w-full rounded-xl border bg-white p-3 text-sm" />
        <button type="button" onClick={adicionar} className="w-full rounded-xl bg-[#2F5597] px-4 py-3 text-sm font-extrabold text-white">Adicionar POP</button>
      </div>

      <div className="mt-4 space-y-3">
        {pops.map((pop, indice) => (
          <details key={pop.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer list-none">
              <div className="font-extrabold text-slate-900">
                {pop.codigo ? `${pop.codigo} — ` : ""}{pop.titulo || "POP sem título"}
              </div>
              <div className="mt-1 text-xs text-slate-500">{pop.status} • versão {pop.versao || "não informada"}</div>
            </summary>
            <div className="mt-3 grid min-w-0 gap-2 border-t border-slate-100 pt-3 md:grid-cols-2">
              <input value={pop.codigo} onChange={(event) => atualizar(indice, { codigo: event.target.value })} placeholder="Código" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
              <input value={pop.titulo} onChange={(event) => atualizar(indice, { titulo: event.target.value })} placeholder="Título" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
              <input value={pop.versao} onChange={(event) => atualizar(indice, { versao: event.target.value })} placeholder="Versão" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
              <select value={pop.status} onChange={(event) => atualizar(indice, { status: event.target.value as StatusPOP })} className="min-w-0 w-full rounded-lg border bg-white p-2 text-sm">
                {statusDisponiveis.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={pop.programaRelacionado} onChange={(event) => atualizar(indice, { programaRelacionado: event.target.value })} className="min-w-0 w-full rounded-lg border bg-white p-2 text-sm">
                <option value="">Programa relacionado</option>
                {DEFINICOES_PROGRAMAS_CONTROLE.map((programa) => <option key={programa.nome}>{programa.nome}</option>)}
              </select>
              <input value={pop.responsavel} onChange={(event) => atualizar(indice, { responsavel: event.target.value })} placeholder="Responsável" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
              <label className="text-xs font-bold text-slate-600">
                Próxima revisão
                <input type="date" value={pop.proximaRevisao} onChange={(event) => atualizar(indice, { proximaRevisao: event.target.value })} className="mt-1 min-w-0 w-full rounded-lg border p-2 text-sm font-normal" />
              </label>
              <button type="button" onClick={() => onChange(pops.filter((_, atual) => atual !== indice))} className="self-end rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Excluir POP</button>
            </div>
          </details>
        ))}
        {pops.length === 0 && (
          <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
            Nenhum POP cadastrado.
          </div>
        )}
      </div>
    </details>
  );
}
