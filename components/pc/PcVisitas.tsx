"use client";

import { useMemo, useState } from "react";
import type { CSSProperties } from "react";
import { ListRow } from "@/components/ui/ListRow";
import { Pill } from "@/components/ui/Pill";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import type { ItemMenu } from "@/components/ui/RowMenu";
import { acoesDaVisita } from "@/lib/menuActions";
import { iniciaisDaEmpresa } from "@/lib/navigation";
import { agruparPorEmpresa, gravarGruposRecolhidos, lerGruposRecolhidos } from "@/lib/visitasLista";
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
  /** Texto ao lado da barra: "0% concluída" só quando está vazia; com evidências ou não conformidades mostra o que existe. */
  progressoTexto: string;
  /** "Aberta há 5 dias" quando passou do limite; vazio caso contrário. */
  aviso: string;
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
  historicoDesabilitado: boolean;
  novaDesabilitada: boolean;
  onHistorico: () => void;
  onNova: () => void;
  /** Nova visita já na empresa do grupo. */
  onNovaDaEmpresa: (empresaId: string) => void;
  onContinuar: (id: string) => void;
  onConcluir: (id: string) => void;
  onReabrir: (id: string) => void;
  onRelatorio: (id: string) => void;
  onArquivar: (id: string, arquivar: boolean) => void;
  onExcluir: (id: string) => void;
  /** Só o Administrador muda o limite do aviso "visita aberta há X dias". */
  diasDeAviso: number;
  podeConfigurarAviso: boolean;
  onDiasDeAviso: (dias: number) => void;
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
  onNovaDaEmpresa,
  onContinuar,
  onConcluir,
  onReabrir,
  onRelatorio,
  onArquivar,
  onExcluir,
  diasDeAviso,
  podeConfigurarAviso,
  onDiasDeAviso,
}: Props) {
  const [busca, setBusca] = useState("");
  const [recolhidos, setRecolhidos] = useState<string[]>(() => lerGruposRecolhidos());
  const [textoDias, setTextoDias] = useState(String(diasDeAviso));
  const erroDias = textoDias !== "" && (!/^\d+$/.test(textoDias) || Number(textoDias) < 1 || Number(textoDias) > 60) ? "Use de 1 a 60 dias." : "";

  const doFiltro = useMemo(
    () =>
      visitas.filter((visita) => {
        if (filtro === "Arquivadas") return visita.arquivada;
        if (visita.arquivada) return false;
        return filtro === "Todas" || visita.status === filtro;
      }),
    [visitas, filtro]
  );
  const visiveis = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return doFiltro;
    return doFiltro.filter((visita) => normalizar(`${visita.empresa} ${visita.responsavel}`).includes(termo));
  }, [doFiltro, busca]);
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
    setRecolhidos((atual) => {
      const novo = atual.includes(empresaId) ? atual.filter((id) => id !== empresaId) : [...atual, empresaId];
      gravarGruposRecolhidos(novo);
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
    return (
      <ListRow
        key={visita.id}
        faixa={visita.status === "Concluída" ? "ok" : "pend"}
        esmaecida={visita.arquivada}
        titulo={`Visita ${visita.numero} · ${visita.data}`}
        chip={visita.aviso ? <Pill tom="amber">{visita.aviso}</Pill> : undefined}
        secundario={visita.responsavel}
        meio={
          <>
            <ProgressBar percentual={visita.percentual} largura={150} rotulo={visita.progressoTexto} />
            <span className="ui-row-sub vis-progresso-texto">{visita.progressoTexto}</span>
          </>
        }
        pilulas={<Pill tom={visita.status === "Concluída" ? "ok" : "pend"}>{visita.arquivada ? "Arquivada" : visita.status}</Pill>}
        acao={
          visita.arquivada ? (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onArquivar(visita.id, false)}>
              Desarquivar
            </button>
          ) : visita.status === "Em andamento" ? (
            <>
              {visita.podeContinuar && (
                <button type="button" className="ui-btn ui-btn--criar" onClick={() => onContinuar(visita.id)}>
                  Continuar →
                </button>
              )}
              {visita.podeArquivar && visita.aviso && (
                <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onArquivar(visita.id, true)}>
                  Arquivar
                </button>
              )}
            </>
          ) : visita.podeReabrir ? (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onReabrir(visita.id)}>
              Reabrir
            </button>
          ) : visita.podeRelatorio ? (
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => onRelatorio(visita.id)}>
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
          <p className="ui-subtitle">Por empresa · ativa: {empresaAtiva}</p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onHistorico} disabled={historicoDesabilitado}>
            Histórico da empresa
          </button>
          <button type="button" className="ui-btn ui-btn--criar" onClick={onNova} disabled={novaDesabilitada}>
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
            { id: "Todas", rotulo: "Todas", contagem: naoArquivadas.length },
            { id: "Em andamento", rotulo: "Em andamento", contagem: naoArquivadas.filter((v) => v.status === "Em andamento").length },
            { id: "Concluída", rotulo: "Concluídas", contagem: naoArquivadas.filter((v) => v.status === "Concluída").length },
            ...(visitas.some((visita) => visita.arquivada) ? [{ id: "Arquivadas" as const, rotulo: "Arquivadas", contagem: visitas.filter((v) => v.arquivada).length }] : []),
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
        {podeConfigurarAviso && (
          <label className="vis-aviso-config">
            <span className="ui-row-sub">Avisar visita aberta após</span>
            <input
              className={`ui-input vis-aviso-dias${erroDias ? " is-invalid" : ""}`}
              inputMode="numeric"
              value={textoDias}
              aria-label="Dias para avisar visita aberta"
              aria-invalid={Boolean(erroDias)}
              onChange={(evento) => {
                const texto = evento.target.value.replace(/\D/g, "").slice(0, 2);
                setTextoDias(texto);
                const n = Number(texto);
                if (texto && n >= 1 && n <= 60) onDiasDeAviso(n);
              }}
            />
            <span className="ui-row-sub">dias</span>
            {erroDias && <span className="ui-field-error">{erroDias}</span>}
          </label>
        )}
      </div>

      <div className="ui-scroll">
        {grupos.map((grupo) => {
          const recolhido = recolhidos.includes(grupo.empresaId);
          const primeira = grupo.itens[0];
          const emAndamento = grupo.itens.filter((visita) => visita.status === "Em andamento").length;
          return (
            <section key={grupo.empresaId} className="vis-grupo" aria-label={`Visitas de ${grupo.empresa}`}>
              <div className="vis-grupo-topo">
                <button type="button" className="vis-grupo-alternar" aria-expanded={!recolhido} onClick={() => alternarGrupo(grupo.empresaId)}>
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
                  {grupo.ativa && <Pill tom="brand">Empresa ativa</Pill>}
                  <span aria-hidden="true" className="vis-grupo-seta">
                    {recolhido ? "▾" : "▴"}
                  </span>
                </button>
                {primeira.podeCriarNesta && !primeira.arquivada && (
                  <button type="button" className="ui-btn ui-btn--criar ui-btn--small" onClick={() => onNovaDaEmpresa(grupo.empresaId)}>
                    + Nova visita
                  </button>
                )}
              </div>
              {!recolhido && <div className="ui-list vis-grupo-lista">{grupo.itens.map(linha)}</div>}
            </section>
          );
        })}
        {visiveis.length === 0 && <div className="ui-empty">Nenhuma visita encontrada.</div>}
      </div>
    </section>
  );
}
