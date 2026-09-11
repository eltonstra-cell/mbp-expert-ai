"use client";

import { useState } from "react";
import type {
  ProcedimentoOperacionalPadronizado,
  StatusPOP,
} from "@/types";
import { DEFINICOES_PROGRAMAS_CONTROLE } from "@/lib/qualityPrograms";
import { SUGESTOES_POPS_MANUAL, situacaoRevisaoPOP } from "@/lib/pops";
import FieldVoiceTools from "@/components/FieldVoiceTools";

type Props = {
  pops: ProcedimentoOperacionalPadronizado[];
  onChange: (pops: ProcedimentoOperacionalPadronizado[]) => void;
  aberto?: boolean;
};

const statusDisponiveis: StatusPOP[] = ["Rascunho", "Em revisão", "Aprovado", "Inativo"];

export default function PopsFields({ pops, onChange, aberto = false }: Props) {
  const [titulo, setTitulo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [aviso, setAviso] = useState("");

  const aprovados = pops.filter((pop) => pop.status === "Aprovado").length;
  const emPreparacao = pops.filter((pop) => pop.status === "Rascunho" || pop.status === "Em revisão").length;
  const revisoesVencidas = pops.filter((pop) => situacaoRevisaoPOP(pop).label === "Revisão vencida").length;

  function adicionar() {
    if (!titulo.trim()) {
      setAviso("Informe o título do POP.");
      return;
    }
    if (codigo.trim() && pops.some((pop) => pop.codigo.trim().toLocaleLowerCase("pt-BR") === codigo.trim().toLocaleLowerCase("pt-BR"))) {
      setAviso("Este código já está sendo utilizado em outro POP.");
      return;
    }
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
    setAviso("");
  }

  function adicionarSugestao(sugestao: (typeof SUGESTOES_POPS_MANUAL)[number]) {
    if (pops.some((pop) => pop.titulo.toLocaleLowerCase("pt-BR") === sugestao.titulo.toLocaleLowerCase("pt-BR"))) return;
    const codigoDisponivel = pops.some(
      (pop) => pop.codigo.trim().toLocaleLowerCase("pt-BR") === sugestao.codigo.toLocaleLowerCase("pt-BR")
    ) ? "" : sugestao.codigo;
    onChange([
      ...pops,
      {
        id: crypto.randomUUID(),
        codigo: codigoDisponivel,
        titulo: sugestao.titulo,
        versao: "1.0",
        status: "Rascunho",
        programaRelacionado: sugestao.programaRelacionado,
        responsavel: "",
        proximaRevisao: "",
      },
    ]);
    setAviso(codigoDisponivel ? "" : "Sugestão adicionada sem código porque essa numeração já estava em uso.");
  }

  function atualizar(indice: number, alteracao: Partial<ProcedimentoOperacionalPadronizado>) {
    onChange(pops.map((pop, atual) => atual === indice ? { ...pop, ...alteracao } : pop));
  }

  return (
    <details open={aberto} className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer list-none">
        <div className="font-extrabold text-slate-950">Procedimentos Operacionais Padronizados — POPs</div>
        <div className="mt-0.5 text-xs text-slate-500">Cadastre, acompanhe a aprovação e controle as datas de revisão.</div>
      </summary>

      {pops.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-emerald-50 p-3"><div className="text-[10px] font-extrabold uppercase text-emerald-700">Aprovados</div><div className="mt-1 text-xl font-extrabold text-emerald-900">{aprovados}</div></div>
          <div className="rounded-xl bg-blue-50 p-3"><div className="text-[10px] font-extrabold uppercase text-blue-700">Em preparação</div><div className="mt-1 text-xl font-extrabold text-blue-900">{emPreparacao}</div></div>
          <div className={`rounded-xl p-3 ${revisoesVencidas > 0 ? "bg-red-50" : "bg-slate-100"}`}><div className={`text-[10px] font-extrabold uppercase ${revisoesVencidas > 0 ? "text-red-700" : "text-slate-600"}`}>Revisão vencida</div><div className={`mt-1 text-xl font-extrabold ${revisoesVencidas > 0 ? "text-red-900" : "text-slate-800"}`}>{revisoesVencidas}</div></div>
        </div>
      )}

      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">
        <div className="text-xs font-extrabold uppercase tracking-wide text-[#2F5597]">Sugestões citadas no Manual</div>
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGESTOES_POPS_MANUAL.map((sugestao) => {
            const adicionado = pops.some((pop) => pop.titulo.toLocaleLowerCase("pt-BR") === sugestao.titulo.toLocaleLowerCase("pt-BR"));
            return (
              <button key={sugestao.titulo} type="button" disabled={adicionado} onClick={() => adicionarSugestao(sugestao)} className="rounded-lg border border-blue-200 bg-white px-3 py-2 text-left text-xs font-bold text-[#17365D] disabled:bg-blue-100 disabled:text-slate-500">
                {adicionado ? "✓ " : "+ "}{sugestao.titulo}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-2 md:grid-cols-[130px_minmax(0,1fr)_auto]">
        <input value={codigo} onChange={(event) => setCodigo(event.target.value)} placeholder="Código (opcional)" className="min-w-0 w-full rounded-xl border bg-white p-3 text-sm" />
        <div className="min-w-0">
          <input value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Título do POP" className="min-w-0 w-full rounded-xl border bg-white p-3 text-sm" />
          <FieldVoiceTools fieldKey="novo-pop-titulo" value={titulo} onChange={setTitulo} contexto="Título curto e objetivo de um Procedimento Operacional Padronizado." />
        </div>
        <button type="button" onClick={adicionar} className="w-full rounded-xl bg-[#2F5597] px-4 py-3 text-sm font-extrabold text-white">Adicionar POP</button>
      </div>

      {aviso && <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{aviso}</div>}

      <div className="mt-4 space-y-3">
        {pops.map((pop, indice) => {
          const situacao = situacaoRevisaoPOP(pop);
          return (
          <details key={pop.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
            <summary className="cursor-pointer list-none">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="font-extrabold text-slate-900">{pop.codigo ? `${pop.codigo} — ` : ""}{pop.titulo || "POP sem título"}</div>
                  <div className="mt-1 text-xs text-slate-500">{pop.status} • versão {pop.versao || "não informada"}</div>
                </div>
                <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-[10px] font-extrabold ${situacao.classe}`}>{situacao.label}</span>
              </div>
            </summary>

            <div className="mt-3 grid min-w-0 gap-2 border-t border-slate-100 pt-3 md:grid-cols-2">
              <input value={pop.codigo} onChange={(event) => atualizar(indice, { codigo: event.target.value })} placeholder="Código" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
              <div className="min-w-0">
                <input value={pop.titulo} onChange={(event) => atualizar(indice, { titulo: event.target.value })} placeholder="Título" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
                <FieldVoiceTools fieldKey={`pop-titulo-${pop.id}`} value={pop.titulo} onChange={(texto) => atualizar(indice, { titulo: texto })} contexto="Título curto e objetivo de um POP." />
              </div>
              <input value={pop.versao} onChange={(event) => atualizar(indice, { versao: event.target.value })} placeholder="Versão" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
              <select value={pop.status} onChange={(event) => atualizar(indice, { status: event.target.value as StatusPOP })} className="min-w-0 w-full rounded-lg border bg-white p-2 text-sm">
                {statusDisponiveis.map((status) => <option key={status}>{status}</option>)}
              </select>
              <select value={pop.programaRelacionado} onChange={(event) => atualizar(indice, { programaRelacionado: event.target.value })} className="min-w-0 w-full rounded-lg border bg-white p-2 text-sm">
                <option value="">Programa relacionado</option>
                {DEFINICOES_PROGRAMAS_CONTROLE.map((programa) => <option key={programa.nome}>{programa.nome}</option>)}
              </select>
              <div className="min-w-0">
                <input value={pop.responsavel} onChange={(event) => atualizar(indice, { responsavel: event.target.value })} placeholder="Responsável" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
                <FieldVoiceTools fieldKey={`pop-responsavel-${pop.id}`} value={pop.responsavel} onChange={(texto) => atualizar(indice, { responsavel: texto })} contexto="Nome ou função do responsável por um POP." somenteVoz />
              </div>
              <label className="text-xs font-bold text-slate-600">
                Próxima revisão
                <input type="date" value={pop.proximaRevisao} onChange={(event) => atualizar(indice, { proximaRevisao: event.target.value })} className="mt-1 min-w-0 w-full rounded-lg border p-2 text-sm font-normal" />
              </label>
              <button type="button" onClick={() => onChange(pops.filter((_, atual) => atual !== indice))} className="self-end rounded-lg bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Excluir POP</button>
            </div>
          </details>
          );
        })}
        {pops.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Nenhum POP cadastrado.</div>}
      </div>
    </details>
  );
}
