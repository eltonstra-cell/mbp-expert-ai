"use client";

import Select from "@/components/Select";
import { useEffect } from "react";
import type { FluxoOperacional } from "@/types";
import {
  DEFINICOES_FLUXOS_OPERACIONAIS,
  PERGUNTAS_POR_FLUXO,
  obterSetorSugeridoParaFluxo,
} from "@/lib/operationalFlows";
import { aplicarEscolhaDeFluxos } from "@/lib/escolhaEmJanela";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import EscolhaEmJanela from "@/components/EscolhaEmJanela";

type Props = {
  fluxos: FluxoOperacional[];
  setores: string[];
  onChange: (fluxos: FluxoOperacional[]) => void;
  aberto?: boolean;
  /** Ids dos fluxos marcados no último salvo (para o chip "Falta salvar"). */
  fluxosSalvos?: string[];
};

export default function OperationalFlowsFields({ fluxos, setores, onChange, fluxosSalvos }: Props) {
  useEffect(() => {
    let alterou = false;
    const corrigidos = fluxos.map((fluxo) => {
      if (!fluxo.aplicavel || setores.includes(fluxo.setorVinculado)) return fluxo;
      const setorSugerido = obterSetorSugeridoParaFluxo(fluxo.tipo, setores, fluxo.setorVinculado);
      // Fluxo que o Manual não liga a um setor oficial volta a "sem setor" (o RT escolhe); nada é adivinhado.
      if (setorSugerido === fluxo.setorVinculado) return fluxo;
      alterou = true;
      return { ...fluxo, setorVinculado: setorSugerido };
    });
    if (alterou) onChange(corrigidos);
  }, [fluxos, setores, onChange]);

  function atualizar(indice: number, alteracao: Partial<FluxoOperacional>) {
    onChange(fluxos.map((fluxo, atual) => atual === indice ? { ...fluxo, ...alteracao } : fluxo));
  }

  return (
    <div className="cen-cadastro">
      <EscolhaEmJanela
        titulo="Fluxos operacionais"
        apoio="Marque os fluxos que existem na sua empresa."
        opcoes={fluxos.map((fluxo) => ({ id: fluxo.id, titulo: fluxo.tipo, descricao: DEFINICOES_FLUXOS_OPERACIONAIS.find((item) => item.tipo === fluxo.tipo)?.orientacao }))}
        marcadas={fluxos.filter((fluxo) => fluxo.aplicavel).map((fluxo) => fluxo.id)}
        palavra="fluxos marcados"
        rotuloDoBotao="Escolher fluxos"
        vazio="Nenhum fluxo marcado"
        salvas={fluxosSalvos}
        onAplicar={(ids) => {
          const proximos = aplicarEscolhaDeFluxos(fluxos, setores, ids);
          if (proximos !== fluxos) onChange(proximos);
        }}
      />

      {/* Os detalhes (setor, responsável, descrição e controles) continuam à mão, só dos fluxos marcados. */}
      {fluxos.map((fluxo, indice) =>
        fluxo.aplicavel ? (
          <section key={fluxo.id} className="cad-cartao" aria-label={`Detalhes do fluxo ${fluxo.tipo}`}>
            <div className="cad-titulo">{fluxo.tipo}</div>
            <div className="grid min-w-0 gap-2 md:grid-cols-2">
              <label className="cad-rotulado">
                <span>Setor onde ocorre</span>
                <Select value={fluxo.setorVinculado} onChange={(event) => atualizar(indice, { setorVinculado: event.target.value })} className="cad-input" aria-invalid={!fluxo.setorVinculado}>
                  {!fluxo.setorVinculado && <option value="">Escolha o setor deste fluxo</option>}
                  {setores.length === 0 && fluxo.setorVinculado && <option value={fluxo.setorVinculado}>{fluxo.setorVinculado}</option>}
                  {setores.map((setor) => <option key={setor} value={setor}>{setor}</option>)}
                </Select>
                {!fluxo.setorVinculado && <span className="ui-field-error" role="status">Escolha o setor deste fluxo. Sem setor, ele não soma perguntas na visita.</span>}
                {fluxo.setorVinculado && <span className="cad-dica">Adiciona {PERGUNTAS_POR_FLUXO} perguntas à visita deste setor.</span>}
              </label>

              <label className="cad-rotulado">
                <span>Responsável</span>
                <input value={fluxo.responsavel} onChange={(event) => atualizar(indice, { responsavel: event.target.value })} placeholder="Nome ou função" className="ui-input cad-input" />
              </label>

              <div className="cad-rotulado md:col-span-2">
                <label htmlFor={`fluxo-descricao-${fluxo.id}`}>Como acontece nesta empresa?</label>
                <textarea id={`fluxo-descricao-${fluxo.id}`} rows={2} value={fluxo.descricao} onChange={(event) => atualizar(indice, { descricao: event.target.value })} placeholder="Descrição curta do fluxo" className="ui-input cad-obs-texto" />
                <FieldVoiceTools
                  fieldKey={`fluxo-descricao-${fluxo.id}`}
                  value={fluxo.descricao}
                  onChange={(texto) => atualizar(indice, { descricao: texto })}
                  contexto={`Descrição do fluxo operacional "${fluxo.tipo}" em um estabelecimento de alimentos. Preserve exatamente o processo informado.`}
                />
              </div>

              <div className="cad-rotulado md:col-span-2">
                <label htmlFor={`fluxo-controles-${fluxo.id}`}>Controles e registros usados</label>
                <input id={`fluxo-controles-${fluxo.id}`} value={fluxo.controlesRegistros} onChange={(event) => atualizar(indice, { controlesRegistros: event.target.value })} placeholder="Ex.: planilha de temperatura e recebimento" className="ui-input cad-input" />
                <FieldVoiceTools
                  fieldKey={`fluxo-controles-${fluxo.id}`}
                  value={fluxo.controlesRegistros}
                  onChange={(texto) => atualizar(indice, { controlesRegistros: texto })}
                  contexto={`Controles e registros usados no fluxo operacional "${fluxo.tipo}".`}
                />
              </div>
            </div>
          </section>
        ) : null
      )}
    </div>
  );
}
