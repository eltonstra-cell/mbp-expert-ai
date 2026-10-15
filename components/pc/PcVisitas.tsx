"use client";

import { useMemo, useState } from "react";
import { NavIcon } from "@/components/NavIcons";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import type { ItemMenu } from "@/components/ui/RowMenu";

export type LinhaVisita = {
  id: string;
  empresa: string;
  empresaAtiva: boolean;
  numero: number | string;
  data: string;
  responsavel: string;
  percentual: number;
  status: "Em andamento" | "Concluída";
  podeContinuar: boolean;
  podeConcluir: boolean;
  podeReabrir: boolean;
  podeRelatorio: boolean;
  podeExcluir: boolean;
};

export type FiltroVisitas = "Todas" | "Em andamento" | "Concluída";

type Props = {
  empresaAtiva: string;
  visitas: LinhaVisita[];
  filtro: FiltroVisitas;
  onFiltro: (filtro: FiltroVisitas) => void;
  historicoDesabilitado: boolean;
  novaDesabilitada: boolean;
  onHistorico: () => void;
  onNova: () => void;
  onContinuar: (id: string) => void;
  onConcluir: (id: string) => void;
  onReabrir: (id: string) => void;
  onRelatorio: (id: string) => void;
  onExcluir: (id: string) => void;
};

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase("pt-BR");
}

export default function PcVisitas({
  empresaAtiva,
  visitas,
  filtro,
  onFiltro,
  historicoDesabilitado,
  novaDesabilitada,
  onHistorico,
  onNova,
  onContinuar,
  onConcluir,
  onReabrir,
  onRelatorio,
  onExcluir,
}: Props) {
  const [busca, setBusca] = useState("");

  const doFiltro = useMemo(
    () => visitas.filter((visita) => filtro === "Todas" || visita.status === filtro),
    [visitas, filtro]
  );
  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return doFiltro;
    return doFiltro.filter((visita) => normalizar(`${visita.empresa} ${visita.responsavel}`).includes(termo));
  }, [doFiltro, busca]);

  const emAndamento = visiveis.filter((visita) => visita.status === "Em andamento");
  const concluidas = visiveis.filter((visita) => visita.status === "Concluída");

  const linha = (visita: LinhaVisita) => {
    const menu: ItemMenu[] = [];
    if (visita.status === "Em andamento" && visita.podeConcluir) {
      menu.push({ rotulo: "Concluir visita", onClick: () => onConcluir(visita.id), confirmar: "Concluir esta visita?" });
    }
    if (visita.podeExcluir) {
      menu.push({ rotulo: "Excluir visita…", perigo: true, onClick: () => onExcluir(visita.id) });
    }
    return (
      <ListRow
        key={visita.id}
        faixa={visita.status === "Concluída" ? "ok" : "pend"}
        icone={<NavIcon name="visitas" size={22} strokeWidth={1.9} />}
        titulo={visita.empresa}
        chip={visita.empresaAtiva ? <Pill tom="brand">Empresa ativa</Pill> : undefined}
        secundario={`Visita ${visita.numero} · ${visita.data} · ${visita.responsavel}`}
        meio={
          <>
            <ProgressBar percentual={visita.percentual} largura={150} rotulo={`${visita.percentual}% concluída`} />
            <span className="ui-row-sub">{visita.percentual}% concluída</span>
          </>
        }
        pilulas={<Pill tom={visita.status === "Concluída" ? "ok" : "pend"}>{visita.status}</Pill>}
        acao={
          visita.status === "Em andamento" ? (
            visita.podeContinuar ? (
              <button type="button" className="ui-btn ui-btn--primary" onClick={() => onContinuar(visita.id)}>
                Continuar →
              </button>
            ) : undefined
          ) : visita.podeReabrir ? (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onReabrir(visita.id)}>
              Reabrir
            </button>
          ) : visita.podeRelatorio ? (
            <button type="button" className="ui-btn ui-btn--primary" onClick={() => onRelatorio(visita.id)}>
              Abrir relatório →
            </button>
          ) : undefined
        }
        menu={menu}
      />
    );
  };

  return (
    <section className="ui-screen" aria-label="Visitas técnicas">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Visitas técnicas</h1>
          <p className="ui-subtitle">Todas as empresas · ativa: {empresaAtiva}</p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onHistorico} disabled={historicoDesabilitado}>
            Histórico da empresa
          </button>
          <button type="button" className="ui-btn ui-btn--primary" onClick={onNova} disabled={novaDesabilitada}>
            + Nova visita
          </button>
        </div>
      </div>

      <div className="ui-toolbar">
        <SegmentedTabs<FiltroVisitas>
          rotulo="Situação das visitas"
          valor={filtro}
          onChange={onFiltro}
          abas={[
            { id: "Todas", rotulo: "Todas", contagem: visitas.length },
            { id: "Em andamento", rotulo: "Em andamento", contagem: visitas.filter((v) => v.status === "Em andamento").length },
            { id: "Concluída", rotulo: "Concluídas", contagem: visitas.filter((v) => v.status === "Concluída").length },
          ]}
        />
        <input
          type="search"
          className="ui-input pc-search"
          placeholder="Buscar por empresa ou responsável"
          aria-label="Buscar visitas por empresa ou responsável"
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
      </div>

      <div className="ui-scroll">
        {emAndamento.length > 0 && (
          <>
            <div className="ui-group-title">Em andamento · {emAndamento.length}</div>
            <div className="ui-list">{emAndamento.map(linha)}</div>
          </>
        )}
        {concluidas.length > 0 && (
          <>
            <div className="ui-group-title">Concluídas · {concluidas.length}</div>
            <div className="ui-list">{concluidas.map(linha)}</div>
          </>
        )}
        {visiveis.length === 0 && <div className="ui-empty">Nenhuma visita encontrada.</div>}
      </div>
    </section>
  );
}
