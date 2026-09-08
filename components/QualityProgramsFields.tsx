"use client";

import type {
  ProgramaControleQualidade,
  StatusProgramaControle,
} from "@/types";
import { DEFINICOES_PROGRAMAS_CONTROLE } from "@/lib/qualityPrograms";

type Props = {
  programas: ProgramaControleQualidade[];
  onChange: (programas: ProgramaControleQualidade[]) => void;
  aberto?: boolean;
};

const statusDisponiveis: StatusProgramaControle[] = [
  "Não iniciado",
  "Em implantação",
  "Implantado",
  "Não se aplica",
];

export default function QualityProgramsFields({ programas, onChange, aberto = false }: Props) {
  function atualizar(indice: number, alteracao: Partial<ProgramaControleQualidade>) {
    onChange(programas.map((programa, atual) =>
      atual === indice ? { ...programa, ...alteracao } : programa
    ));
  }

  const ativos = programas.filter((programa) =>
    programa.status === "Implantado" || programa.status === "Em implantação"
  ).length;

  return (
    <details open={aberto} className="mt-4 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <summary className="cursor-pointer list-none">
        <div className="font-extrabold text-slate-950">Capítulo 3 — Programas de Controle de Qualidade</div>
        <div className="mt-0.5 text-xs text-slate-500">
          Informe a situação atual e toque no nome para completar os dados. {ativos} programa(s) ativo(s) ou em implantação.
        </div>
      </summary>

      <div className="mt-4 space-y-3">
        {programas.map((programa, indice) => {
          const definicao = DEFINICOES_PROGRAMAS_CONTROLE.find((item) => item.nome === programa.nome);
          const preencherDetalhes = programa.status === "Implantado" || programa.status === "Em implantação";
          return (
            <details key={programa.id} className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-3">
              <summary className="cursor-pointer list-none">
                <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,1fr)_180px] md:items-center">
                  <div className="min-w-0">
                    <div className="text-sm font-extrabold text-slate-900">{programa.nome}</div>
                    <div className="mt-0.5 text-xs text-slate-500">{definicao?.objetivo}</div>
                  </div>
                  <select
                    aria-label={`Situação de ${programa.nome}`}
                    value={programa.status}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => atualizar(indice, { status: event.target.value as StatusProgramaControle })}
                    className="min-w-0 w-full rounded-lg border bg-white p-2 text-sm font-bold"
                  >
                    {statusDisponiveis.map((status) => <option key={status}>{status}</option>)}
                  </select>
                </div>
              </summary>

              {preencherDetalhes && (
                <div className="mt-3 grid min-w-0 gap-2 border-t border-slate-100 pt-3 md:grid-cols-2">
                  <input value={programa.responsavel} onChange={(event) => atualizar(indice, { responsavel: event.target.value })} placeholder="Responsável" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
                  <input value={programa.frequencia} onChange={(event) => atualizar(indice, { frequencia: event.target.value })} placeholder="Frequência: ex. mensal" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
                  <input value={programa.registro} onChange={(event) => atualizar(indice, { registro: event.target.value })} placeholder="Registro ou planilha utilizada" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
                  <input value={programa.documentoRelacionado} onChange={(event) => atualizar(indice, { documentoRelacionado: event.target.value })} placeholder="POP ou documento relacionado" className="min-w-0 w-full rounded-lg border p-2 text-sm" />
                  <input value={programa.observacao} onChange={(event) => atualizar(indice, { observacao: event.target.value })} placeholder="Observação breve (opcional)" className="min-w-0 w-full rounded-lg border p-2 text-sm md:col-span-2" />
                </div>
              )}
            </details>
          );
        })}
      </div>
    </details>
  );
}
