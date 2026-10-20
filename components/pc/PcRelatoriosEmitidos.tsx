"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import type { RelatorioEmitido } from "@/types";

function dataHoraBr(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.toLocaleDateString("pt-BR")} ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}
const dataBr = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");

type ListaProps = {
  empresa: string;
  relatorios: RelatorioEmitido[];
  urlDaFoto: (pathname: string) => string;
  onImprimir: () => void;
  onVoltar: () => void;
};

// Relatórios emitidos da empresa: cada versão fica guardada, nunca é alterada. Abrir mostra o instantâneo.
export default function PcRelatoriosEmitidos({ empresa, relatorios, urlDaFoto, onImprimir, onVoltar }: ListaProps) {
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const ordenados = [...relatorios].sort((a, b) => b.emitidoEm.localeCompare(a.emitidoEm));
  const aberto = ordenados.find((item) => item.id === abertoId);

  if (aberto) {
    const c = aberto.instantaneo.conformidade;
    return (
      <section className="ui-screen" aria-label={`Relatório ${aberto.numero}`}>
        <div className="ui-head no-print">
          <div>
            <h1 className="ui-title">
              {aberto.numero} · versão {aberto.versao}
            </h1>
            <p className="ui-subtitle">Emitido em {dataHoraBr(aberto.emitidoEm)}. O conteúdo abaixo não muda.</p>
          </div>
          <div className="ui-head-actions">
            <button type="button" className="ui-btn ui-btn--primary" onClick={onImprimir}>
              Imprimir ou salvar PDF
            </button>
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setAbertoId(null)}>
              ← Lista
            </button>
          </div>
        </div>
        <article id="relatorio-emitido-doc" className="resumo-pagina" data-empresa={empresa}>
          <header className="resumo-topo">
            <h2 className="resumo-titulo">
              Relatório {aberto.numero} · versão {aberto.versao}
            </h2>
            <span className="ui-row-sub">
              {aberto.instantaneo.empresa.nome} · CNPJ {aberto.instantaneo.empresa.cnpj} · visita de {dataBr(aberto.instantaneo.visita.data)} · responsável {aberto.instantaneo.visita.responsavel}
            </span>
            {aberto.motivoDaNovaVersao && <span className="ui-row-sub">Motivo da versão {aberto.versao}: {aberto.motivoDaNovaVersao}</span>}
          </header>
          <p className="resumo-texto">
            Conformidade: {c.percentual === null ? "sem itens respondidos" : `${c.percentual}% (${c.conformes} de ${c.respondidos} itens respondidos; ${c.naoConformes} não conformes)`}.
          </p>
          <h3 className="resumo-sub">Não conformidades</h3>
          {aberto.instantaneo.ncs.length === 0 ? (
            <p className="resumo-texto">Nenhuma não conformidade registrada.</p>
          ) : (
            <ul className="resumo-lista">
              {aberto.instantaneo.ncs.map((nc) => (
                <li key={nc.id}>
                  <span>
                    {nc.titulo} · {nc.ambiente} · {nc.criticidade} · {nc.status}
                    {nc.acaoCorretiva ? ` · ação: ${nc.acaoCorretiva}` : ""}
                    {nc.prazo ? ` · prazo ${dataBr(nc.prazo)}` : ""}
                  </span>{" "}
                  {nc.status === "Resolvida" && nc.semComprovacao && <Pill tom="amber">Sem comprovação</Pill>}
                </li>
              ))}
            </ul>
          )}
          <h3 className="resumo-sub">Fotos citadas</h3>
          {aberto.instantaneo.evidencias.length === 0 ? (
            <p className="resumo-texto">Nenhuma foto.</p>
          ) : (
            <ul className="resumo-lista">
              {aberto.instantaneo.evidencias.map((ev) => (
                <li key={ev.id}>
                  {ev.ambiente || "Sem ambiente"} · {dataHoraBr(ev.criadoEm)}
                  {ev.registradoPorNome ? ` · ${ev.registradoPorNome}` : ""}
                  {ev.papel === "depois" ? " · depois" : ""} <Pill tom="info">em relatório emitido</Pill>
                  {ev.blobPathname ? (
                    <>
                      {" "}
                      <a className="no-print" href={urlDaFoto(ev.blobPathname)} target="_blank" rel="noopener noreferrer">
                        abrir
                      </a>
                    </>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <div className="emitido-assinatura">
            <span>
              Assinado por <b>{aberto.assinatura.nome}</b> ({aberto.assinatura.cargo}) · {aberto.assinatura.crn}
              {aberto.assinatura.crnPendente ? " (preencher no cadastro do RT)" : ""}
            </span>
            <span className="ui-row-sub">{aberto.aviso}</span>
          </div>
        </article>
      </section>
    );
  }

  return (
    <section className="ui-screen" aria-label="Relatórios emitidos">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Relatórios emitidos</h1>
          <p className="ui-subtitle">{empresa} · cada versão fica guardada e não muda</p>
        </div>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
          ← Voltar
        </button>
      </div>
      {ordenados.length === 0 ? (
        <div className="ui-empty">Nenhum relatório emitido. Emita pelo Relatório da visita (RT ou Administrador).</div>
      ) : (
        <div className="ui-list">
          {ordenados.map((item) => (
            <article key={item.id} className="ui-card emitido-linha">
              <div className="emitido-textos">
                <span className="emitido-numero">
                  {item.numero} · versão {item.versao}
                </span>
                <span className="ui-row-sub">
                  Emitido em {dataHoraBr(item.emitidoEm)} · visita de {dataBr(item.instantaneo.visita.data)} · {item.assinatura.nome}, {item.assinatura.crn}
                </span>
              </div>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setAbertoId(item.id)}>
                Abrir
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
