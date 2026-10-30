"use client";

import { useState } from "react";
import Select from "@/components/Select";
import type {
  ProgramaControleQualidade,
  StatusProgramaControle,
} from "@/types";
import { DEFINICOES_PROGRAMAS_CONTROLE } from "@/lib/qualityPrograms";
import { estadoVisualDoPrograma, resumoDosProgramas } from "@/lib/documentosCentral";
import FieldVoiceTools from "@/components/FieldVoiceTools";

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

// Programas de controle (Capítulo 3): linhas sem caixa, o estado como texto com bolinha de cor e seta. Tocar no nome abre os dados do programa.
export default function QualityProgramsFields({ programas, onChange }: Props) {
  const [aberto, setAberto] = useState<string | null>(null);

  function atualizar(indice: number, alteracao: Partial<ProgramaControleQualidade>) {
    onChange(programas.map((programa, atual) =>
      atual === indice ? { ...programa, ...alteracao } : programa
    ));
  }

  return (
    <section className="prog" aria-label="Programas de controle de qualidade">
      <div className="cdoc-titulo">
        <div>
          <h2 className="cdoc-h">Programas</h2>
          <p className="cdoc-sub">Capítulo 3 · Programas de Controle de Qualidade · {resumoDosProgramas(programas)}</p>
          <p className="cdoc-sub">Toque no nome para completar os dados.</p>
        </div>
      </div>

      <div className="cdoc-lista">
        {programas.map((programa, indice) => {
          const definicao = DEFINICOES_PROGRAMAS_CONTROLE.find((item) => item.nome === programa.nome);
          const preencherDetalhes = programa.status === "Implantado" || programa.status === "Em implantação";
          const expandido = aberto === programa.id && preencherDetalhes;
          const estado = estadoVisualDoPrograma(programa.status);
          return (
            <div key={programa.id} className="prog-item">
              <div className="prog-linha">
                <button type="button" className="prog-nome" aria-expanded={preencherDetalhes ? expandido : undefined} disabled={!preencherDetalhes} onClick={() => setAberto(expandido ? null : programa.id)}>
                  <span className="prog-titulo">{programa.nome}</span>
                  <span className="prog-descricao">{definicao?.objetivo}</span>
                </button>
                <span className={`prog-estado-wrap prog-estado-wrap--${estado.tom}`}>
                  <Select
                    aria-label={`Situação de ${programa.nome}`}
                    value={programa.status}
                    onChange={(event) => atualizar(indice, { status: event.target.value as StatusProgramaControle })}
                    className="prog-estado"
                  >
                    {statusDisponiveis.map((status) => <option key={status} value={status}>{estadoVisualDoPrograma(status).texto}</option>)}
                  </Select>
                </span>
              </div>

              {expandido && (
                <div className="prog-detalhes">
                  <input value={programa.responsavel} onChange={(event) => atualizar(indice, { responsavel: event.target.value })} placeholder="Responsável" aria-label="Responsável" className="ui-input" />
                  <input value={programa.frequencia} onChange={(event) => atualizar(indice, { frequencia: event.target.value })} placeholder="Frequência: ex. mensal" aria-label="Frequência" className="ui-input" />

                  <div className="prog-campo">
                    <input value={programa.registro} onChange={(event) => atualizar(indice, { registro: event.target.value })} placeholder="Registro ou planilha utilizada" aria-label="Registro ou planilha utilizada" className="ui-input" />
                    <FieldVoiceTools
                      fieldKey={`programa-registro-${programa.id}`}
                      value={programa.registro}
                      onChange={(texto) => atualizar(indice, { registro: texto })}
                      contexto={`Registro ou planilha utilizada no programa de controle "${programa.nome}".`}
                    />
                  </div>

                  <input value={programa.documentoRelacionado} onChange={(event) => atualizar(indice, { documentoRelacionado: event.target.value })} placeholder="POP ou documento relacionado" aria-label="POP ou documento relacionado" className="ui-input" />

                  <div className="prog-campo prog-campo--largo">
                    <input value={programa.observacao} onChange={(event) => atualizar(indice, { observacao: event.target.value })} placeholder="Observação breve (opcional)" aria-label="Observação breve" className="ui-input" />
                    <FieldVoiceTools
                      fieldKey={`programa-observacao-${programa.id}`}
                      value={programa.observacao}
                      onChange={(texto) => atualizar(indice, { observacao: texto })}
                      contexto={`Observação técnica sobre o programa de controle "${programa.nome}". Seja objetivo e preserve os fatos informados.`}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
