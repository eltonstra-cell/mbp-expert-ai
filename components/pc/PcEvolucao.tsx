"use client";

import { useMemo, useState } from "react";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { MENSAGEM_POUCOS_DADOS, evolucaoDaEmpresa, rotuloDoMes, type PeriodoEmMeses } from "@/lib/evolucao";
import type { NaoConformidade, Visita } from "@/types";

type Props = {
  empresa: string;
  visitas: Visita[];
  ncs: NaoConformidade[];
  hoje: string;
  onVoltar: () => void;
};

// Evolução da empresa: conformidade por mês e por ambiente, reincidentes e tempo para resolver. Sem dado suficiente, não compara.
export default function PcEvolucao({ empresa, visitas, ncs, hoje, onVoltar }: Props) {
  const [periodo, setPeriodo] = useState<PeriodoEmMeses>(6);
  const evolucao = useMemo(() => evolucaoDaEmpresa({ visitas, ncs, hoje, periodo }), [visitas, ncs, hoje, periodo]);
  return (
    <section className="ui-screen evol" aria-label="Evolução">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Evolução</h1>
          <p className="ui-subtitle">Conformidade, reincidentes e tempo para resolver</p>
        </div>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
          ← Voltar
        </button>
      </div>
      <SegmentedTabs<"6" | "12"> rotulo="Período" valor={String(periodo) as "6" | "12"} onChange={(valor) => setPeriodo(valor === "12" ? 12 : 6)} abas={[{ id: "6", rotulo: "6 meses" }, { id: "12", rotulo: "12 meses" }]} />
      {evolucao.mensagemDeDados && <div className="priv-faixa" role="status"><span>{evolucao.mensagemDeDados} É preciso ter itens respondidos em ao menos dois meses.</span></div>}

      <div className="evol-cols">
        <div className="ui-card evol-card">
          <h2 className="ui-card-title">Conformidade por mês</h2>
          <ul className="evol-serie">
            {evolucao.serie.map((mes) => (
              <li key={mes.mes} className="evol-mes">
                <span className="evol-mes-rotulo">{mes.rotulo}</span>
                {mes.percentual === null ? <span className="ui-row-sub">sem visita</span> : <ProgressBar percentual={mes.percentual} rotulo={`Conformidade de ${mes.rotulo}`} tom={mes.percentual >= 80 ? "ok" : "brand"} />}
                <span className="ui-row-sub evol-mes-valor">{mes.percentual === null ? "—" : `${mes.percentual}% (${mes.conformes}/${mes.respondidos})`}</span>
                {mes.percentual !== null && !mes.suficiente && <span className="ui-row-sub">poucos dados</span>}
              </li>
            ))}
          </ul>
        </div>

        <div className="ui-card evol-card">
          <h2 className="ui-card-title">Por ambiente em {rotuloDoMes(evolucao.mesAtual)}</h2>
          {evolucao.ambientes.length === 0 ? (
            <p className="ui-row-sub">Nenhum item respondido neste mês.</p>
          ) : (
            <ul className="evol-lista">
              {evolucao.ambientes.map((item) => (
                <li key={item.ambiente} className="evol-linha">
                  <span className="evol-nome">{item.ambiente}</span>
                  <span className="ui-row-sub">{item.percentual === null ? "—" : `${item.percentual}% (${item.conformes}/${item.respondidos})`}</span>
                  {!item.suficiente ? (
                    <Pill tom="na">{MENSAGEM_POUCOS_DADOS}</Pill>
                  ) : item.variacao === null ? (
                    <Pill tom="na">Sem mês anterior para comparar</Pill>
                  ) : (
                    <Pill tom={item.variacao > 0 ? "ok" : item.variacao < 0 ? "nc" : "na"}>
                      {item.variacao > 0 ? "+" : ""}
                      {item.variacao} pontos vs {rotuloDoMes(item.mesComparado as string)}
                    </Pill>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ui-card evol-card">
          <h2 className="ui-card-title">Reincidentes</h2>
          <p className="ui-row-sub">Mesma não conformidade em 3 visitas ou mais, no mesmo ambiente.</p>
          {evolucao.reincidentes.length === 0 ? (
            <p className="ui-row-sub">Nenhuma reincidência.</p>
          ) : (
            <ul className="evol-lista">
              {evolucao.reincidentes.slice(0, 5).map((item) => (
                <li key={item.chave} className="evol-linha">
                  <span className="evol-nome">{item.titulo}</span>
                  <span className="ui-row-sub">{item.ambiente}</span>
                  <Pill tom="nc">{item.visitas} visitas</Pill>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ui-card evol-card">
          <h2 className="ui-card-title">Correções</h2>
          <p className="evol-numero">{evolucao.resolvidasNoMes}</p>
          <p className="ui-row-sub">resolvidas em {rotuloDoMes(evolucao.mesAtual)}</p>
          <p className="evol-numero">{evolucao.tempoMedioParaResolverDias === null ? "—" : `${evolucao.tempoMedioParaResolverDias} dias`}</p>
          <p className="ui-row-sub">
            {evolucao.tempoMedioParaResolverDias === null
              ? `tempo médio para resolver: ${MENSAGEM_POUCOS_DADOS} (são necessárias 3 correções resolvidas)`
              : `tempo médio para resolver, de ${evolucao.resolvidasNoTempoMedio} correções resolvidas`}
          </p>
        </div>
      </div>
    </section>
  );
}
