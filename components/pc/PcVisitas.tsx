"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { RowMenu, type ItemMenu } from "@/components/ui/RowMenu";
import { acoesDaVisita } from "@/lib/menuActions";
import { iniciaisDaEmpresa } from "@/lib/navigation";
import { agruparPorEmpresa, gravarGruposAlternados, grupoRecolhido, lerGruposAlternados, rotuloDoBotaoDaVisita, situacaoDaLinhaDeVisita } from "@/lib/visitasLista";
import { quantidade } from "@/lib/plural";

export type LinhaVisita = {
  id: string;
  empresaId: string;
  empresa: string;
  empresaAtiva: boolean;
  /** Cor da empresa (campo cor ou a derivada do id). */
  cor: string;
  numero: number | string;
  data: string;
  responsavel: string;
  percentual: number;
  /** Quantas evidências e não conformidades a visita tem (colunas fixas da linha). */
  evidencias: number;
  naoConformidades: number;
  /** "Aberta há 5 dias" quando passou do limite; vazio caso contrário. */
  aviso: string;
  /** Dias desde a data da visita (regra fixa de 60 dias). */
  diasAberta: number;
  status: "Em andamento" | "Concluída";
  arquivada: boolean;
  podeContinuar: boolean;
  podeConcluir: boolean;
  podeReabrir: boolean;
  podeRelatorio: boolean;
  podeArquivar: boolean;
  podeExcluir: boolean;
  /** Pode criar visita nesta empresa. */
  podeCriarNesta: boolean;
};

export type FiltroVisitas = "Todas" | "Em andamento" | "Concluída" | "Arquivadas";

type Props = {
  empresaAtiva: string;
  visitas: LinhaVisita[];
  filtro: FiltroVisitas;
  onFiltro: (filtro: FiltroVisitas) => void;
  novaDesabilitada: boolean;
  onNova: () => void;
  onContinuar: (id: string) => void;
  onConcluir: (id: string) => void;
  onReabrir: (id: string) => void;
  onRelatorio: (id: string) => void;
  onArquivar: (id: string, arquivar: boolean) => void;
  onExcluir: (id: string) => void;
};

function Chevron({ aberto }: { aberto: boolean }) {
  return (
    <svg className="vis-chevron" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={aberto ? "M6 15l6-6 6 6" : "M9 6l6 6-6 6"} />
    </svg>
  );
}

export default function PcVisitas({ empresaAtiva, visitas, filtro, onFiltro, novaDesabilitada, onNova, onContinuar, onConcluir, onReabrir, onRelatorio, onArquivar, onExcluir }: Props) {
  const [alternados, setAlternados] = useState<string[]>(() => lerGruposAlternados());

  const doFiltro = useMemo(
    () =>
      visitas.filter((visita) => {
        if (filtro === "Arquivadas") return visita.arquivada;
        if (visita.arquivada) return false;
        return filtro === "Todas" || visita.status === filtro;
      }),
    [visitas, filtro]
  );
  const visiveis = doFiltro;
  const grupos = useMemo(
    () =>
      agruparPorEmpresa(visiveis).map((grupo) => ({
        ...grupo,
        // Dentro do grupo, o que está em andamento vem primeiro.
        itens: [...grupo.itens].sort((a, b) => Number(b.status === "Em andamento") - Number(a.status === "Em andamento")),
      })),
    [visiveis]
  );
  const naoArquivadas = visitas.filter((visita) => !visita.arquivada);

  function alternarGrupo(empresaId: string) {
    setAlternados((atual) => {
      const novo = atual.includes(empresaId) ? atual.filter((id) => id !== empresaId) : [...atual, empresaId];
      gravarGruposAlternados(novo);
      return novo;
    });
  }

  const linha = (visita: LinhaVisita) => {
    const menu: ItemMenu[] = acoesDaVisita({
      status: visita.status,
      podeContinuar: visita.podeContinuar,
      podeRelatorio: visita.podeRelatorio,
      podeConcluir: visita.podeConcluir,
      podeExcluir: visita.podeExcluir,
      podeArquivar: visita.podeArquivar,
      arquivada: visita.arquivada,
    }).map((acao): ItemMenu => {
      switch (acao) {
        case "abrir":
          return { rotulo: "Abrir visita", onClick: () => onContinuar(visita.id) };
        case "relatorio":
          return { rotulo: "Ver relatório", onClick: () => onRelatorio(visita.id) };
        case "encerrar":
          return { rotulo: "Encerrar visita", onClick: () => onConcluir(visita.id), confirmar: "Encerrar esta visita?" };
        case "arquivar":
          return { rotulo: "Arquivar", onClick: () => onArquivar(visita.id, true), confirmar: "Arquivar esta visita? Ela sai da lista, mas continua guardada com tudo o que tem." };
        case "desarquivar":
          return { rotulo: "Desarquivar", onClick: () => onArquivar(visita.id, false) };
        default:
          return { rotulo: "Excluir visita…", perigo: true, onClick: () => onExcluir(visita.id) };
      }
    });
    const concluida = visita.status === "Concluída" && !visita.arquivada;
    const situacao = situacaoDaLinhaDeVisita({ status: visita.status, percentual: visita.percentual, diasAberta: visita.diasAberta });
    const faixa = visita.arquivada ? "pend" : situacao === "pronta" || situacao === "concluida" ? "ok" : situacao === "atrasada" ? "atrasada" : "pend";
    const textoDaSituacao = visita.arquivada ? "" : situacao === "pronta" ? "pronta para finalizar" : situacao === "atrasada" ? `aberta há ${quantidade(visita.diasAberta, "dia", "dias")}` : "";
    const rotuloDoBotao = rotuloDoBotaoDaVisita(situacao, visita.percentual);
    const emAndamento = !visita.arquivada && visita.status === "Em andamento";
    const aoToque = situacao === "pronta" ? () => onConcluir(visita.id) : () => onContinuar(visita.id);
    const podeAgir = situacao === "pronta" ? visita.podeConcluir : visita.podeContinuar;
    return (
      <div key={visita.id} className={`vis-linha vis-linha--${visita.arquivada ? "arquivada" : situacao}${visita.arquivada ? " is-arquivada" : ""}`}>
        <span className={`vis-faixa vis-faixa--${faixa}`} aria-hidden="true" />
        <div className="vis-col-titulo">
          <span className="vis-titulo-linha">
            <span className="vis-titulo">{`Visita ${visita.numero} · ${visita.data}`}</span>
            {concluida && <Pill tom="ok">Concluída</Pill>}
            {visita.arquivada && <Pill tom="na">Arquivada</Pill>}
          </span>
          <span className="ui-row-sub">
            {visita.responsavel}
            {textoDaSituacao ? (
              <>
                {" · "}
                <span className={`vis-situacao vis-situacao--${situacao}`}>{textoDaSituacao}</span>
              </>
            ) : (
              visita.aviso && (
                <>
                  {" · "}
                  <span className="vis-aviso-terra">{visita.aviso}</span>
                </>
              )
            )}
          </span>
        </div>
        <div className="vis-col-barra">
          <ProgressBar percentual={visita.percentual} largura={140} tom={situacao === "pronta" || situacao === "concluida" ? "ok" : "brand"} rotulo={`${visita.percentual}% concluída`} />
          <span className="vis-pct">{visita.percentual}%</span>
        </div>
        <div className="vis-col-contagem">
          <span className="vis-conta">{quantidade(visita.evidencias, "evidência", "evidências")}</span>
          <span className={`vis-conta vis-conta--nc${visita.naoConformidades === 0 ? " is-zero" : ""}`}>▲ {visita.naoConformidades} NC</span>
        </div>
        <div className="vis-col-fim">
        <div className="vis-col-acao">
          {visita.arquivada ? (
            visita.podeArquivar && (
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onArquivar(visita.id, false)}>
                Desarquivar
              </button>
            )
          ) : visita.status === "Em andamento" ? (
            podeAgir && (
              <button type="button" className="ui-btn ui-btn--criar ui-btn--small vis-botao-linha" onClick={aoToque}>
                {rotuloDoBotao}
              </button>
            )
          ) : visita.podeReabrir ? (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onReabrir(visita.id)}>
              Reabrir
            </button>
          ) : visita.podeRelatorio ? (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onRelatorio(visita.id)}>
              Abrir relatório →
            </button>
          ) : null}
        </div>
        <div className="vis-col-menu">
          <RowMenu itens={menu} />
        </div>
        </div>
        {emAndamento && podeAgir && (
          <>
            <button type="button" className="vis-abrir-linha" onClick={aoToque} aria-label={`${rotuloDoBotao} a visita ${visita.numero}`} />
            <span className="vis-seta" aria-hidden="true">›</span>
          </>
        )}
      </div>
    );
  };

  return (
    <section className="ui-screen" aria-label="Visitas técnicas">
      <h1 className="sr-only">Visitas</h1>

      <div className="ui-toolbar vis-toolbar">
        <div className="vis-abas-bloco">
        <SegmentedTabs<FiltroVisitas>
          rotulo="Situação das visitas"
          valor={filtro}
          onChange={onFiltro}
          abas={[
            { id: "Todas", rotulo: "Todas", contagem: naoArquivadas.length, tom: "todas" },
            { id: "Em andamento", rotulo: "Em andamento", curto: "Andamento", contagem: naoArquivadas.filter((v) => v.status === "Em andamento").length, tom: "andamento" },
            { id: "Concluída", rotulo: "Concluídas", contagem: naoArquivadas.filter((v) => v.status === "Concluída").length, tom: "concluida" },
            { id: "Arquivadas", rotulo: "Arquivadas", contagem: visitas.filter((v) => v.arquivada).length, tom: "arquivada" },
          ]}
        />
        </div>
        <span className="vis-toolbar-fim">
          <button type="button" className="ui-btn ui-btn--criar" onClick={onNova} disabled={novaDesabilitada}>
            + Nova visita
          </button>
        </span>
      </div>

      <div className="ui-scroll vis-rolagem">
        {grupos.map((grupo) => {
          const recolhido = grupoRecolhido(grupo.ativa, alternados.includes(grupo.empresaId));
          const primeira = grupo.itens[0];
          const emAndamento = grupo.itens.filter((visita) => visita.status === "Em andamento").length;
          return (
            <section key={grupo.empresaId} className="vis-grupo" aria-label={`Visitas de ${grupo.empresa}`}>
              <button type="button" className={`vis-grupo-alternar vis-grupo-inteiro${grupo.ativa ? " is-ativa" : ""}`} style={grupo.ativa ? ({ "--emp-cor": primeira.cor } as CSSProperties) : undefined} aria-expanded={!recolhido} aria-current={grupo.ativa ? "true" : undefined} onClick={() => alternarGrupo(grupo.empresaId)}>
                <span className="ui-avatar ui-avatar--round emp-avatar-cor" style={{ "--emp-cor": primeira.cor } as CSSProperties} aria-hidden="true">
                  {iniciaisDaEmpresa(grupo.empresa)}
                </span>
                <span className="vis-grupo-textos">
                  <span className="vis-grupo-nome">{grupo.empresa}</span>
                  <span className="ui-row-sub">
                    {quantidade(grupo.itens.length, "visita", "visitas")}
                    {emAndamento > 0 ? ` · ${emAndamento} em andamento` : ""}
                  </span>
                </span>
                {grupo.ativa && <span className="sr-only">Empresa ativa</span>}
                <Chevron aberto={!recolhido} />
              </button>
              {!recolhido && <div className="vis-grupo-lista">{grupo.itens.map(linha)}</div>}
            </section>
          );
        })}
        {visiveis.length === 0 && <div className="ui-empty">Nenhuma visita encontrada.</div>}
      </div>
    </section>
  );
}
