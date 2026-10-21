"use client";

import { useState } from "react";
import { Pill } from "@/components/ui/Pill";
import type { RelatorioEmitido } from "@/types";
import { avisoDeRelatorioParcial, coberturaDoChecklist, textoDasRespostas, textoDoPercentualConforme, textoRespondidos } from "@/lib/cobertura";
import { quantidade } from "@/lib/plural";
import { formatarData, formatarDataHora } from "@/lib/dataLocal";
import { TODAS_AS_SECOES } from "@/lib/relatorioEmitido";
import type { CabecalhoDeImpressao } from "@/lib/printFooter";

const dataHoraBr = (iso: string) => formatarDataHora(iso) || iso;
const dataBr = (iso: string) => formatarData(iso);

type ListaProps = {
  empresa: string;
  relatorios: RelatorioEmitido[];
  urlDaFoto: (pathname: string) => string;
  onImprimir: (titulo: string, cabecalho: CabecalhoDeImpressao) => void;
  onVoltar: () => void;
};

/** Cabeçalho que se repete em todas as páginas do PDF: empresa, CNPJ, número, emissão, versão e motivo da versão. */
export function cabecalhoDoRelatorio(relatorio: RelatorioEmitido): CabecalhoDeImpressao {
  const inst = relatorio.instantaneo;
  return {
    esquerda: [inst.empresa.nome, `CNPJ ${inst.empresa.cnpj}`],
    direita: [
      `${relatorio.numero} · versão ${relatorio.versao}`,
      `Emitido em ${dataHoraBr(relatorio.emitidoEm)}`,
      ...(relatorio.motivoDaNovaVersao ? [`Motivo da versão: ${relatorio.motivoDaNovaVersao}`] : []),
    ],
    rodape: relatorio.aviso,
  };
}

// Relatórios emitidos da empresa: cada versão fica guardada, nunca é alterada. Abrir mostra o instantâneo.
export default function PcRelatoriosEmitidos({ empresa, relatorios, urlDaFoto, onImprimir, onVoltar }: ListaProps) {
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const ordenados = [...relatorios].sort((a, b) => b.emitidoEm.localeCompare(a.emitidoEm));
  const aberto = ordenados.find((item) => item.id === abertoId);

  if (aberto) {
    const inst = aberto.instantaneo;
    const secoes = inst.secoes || TODAS_AS_SECOES;
    const cobertura = coberturaDoChecklist(inst.itens);
    const parcial = avisoDeRelatorioParcial(cobertura);
    const itemPorId = new Map(inst.itens.map((item) => [item.id, item]));
    const ncPorId = new Map(inst.ncs.map((nc) => [nc.id, nc]));
    const ambientes = Array.from(new Set(inst.itens.map((item) => item.ambiente)));
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
            <button type="button" className="ui-btn ui-btn--criar" onClick={() => onImprimir(`Relatorio ${aberto.numero} v${aberto.versao}`, cabecalhoDoRelatorio(aberto))}>
              Imprimir ou salvar PDF
            </button>
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setAbertoId(null)}>
              ← Lista
            </button>
          </div>
        </div>
        <article id="relatorio-emitido-doc" className="resumo-pagina doc-impresso" data-empresa={empresa}>
          <header className="resumo-topo">
            <h2 className="resumo-titulo">
              Relatório {aberto.numero} · versão {aberto.versao}
            </h2>
            <span className="doc-linha">
              {inst.empresa.nome} · CNPJ {inst.empresa.cnpj} · visita de {dataBr(inst.visita.data)} · responsável {inst.visita.responsavel}
            </span>
            <span className="doc-linha">Emitido em {dataHoraBr(aberto.emitidoEm)}</span>
            {aberto.motivoDaNovaVersao && <span className="doc-linha">Motivo da versão {aberto.versao}: {aberto.motivoDaNovaVersao}</span>}
          </header>

          {parcial && (
            <div className="doc-parcial" role="note">
              {parcial}
            </div>
          )}

          {secoes.resumo && (
            <section className="doc-secao">
              <h3 className="resumo-sub">Resumo da visita</h3>
              <p className="resumo-texto">
                {textoDoPercentualConforme(cobertura)}. {textoRespondidos(cobertura)}: {textoDasRespostas(cobertura)}.
              </p>
              {inst.visita.observacoes && <p className="resumo-texto">Observações: {inst.visita.observacoes}</p>}
              {inst.visita.conclusao && <p className="resumo-texto">Conclusão: {inst.visita.conclusao}</p>}
            </section>
          )}

          {secoes.ambientes && (
            <section className="doc-secao">
              <h3 className="resumo-sub">Resultado por ambiente</h3>
              {ambientes.length === 0 ? (
                <p className="resumo-texto">Nenhum ambiente avaliado.</p>
              ) : (
                <table className="doc-tabela">
                  <thead>
                    <tr>
                      <th>Ambiente</th>
                      <th>Respondidos</th>
                      <th>Conformes</th>
                      <th>Não conformes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ambientes.map((nome) => {
                      const c = coberturaDoChecklist(inst.itens.filter((item) => item.ambiente === nome));
                      return (
                        <tr key={nome}>
                          <td>{nome}</td>
                          <td>{textoRespondidos(c)}</td>
                          <td>{c.conformes}</td>
                          <td>{c.naoConformes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {secoes.ncs && (
            <section className="doc-secao">
              <h3 className="resumo-sub">Correções</h3>
              {inst.ncs.length === 0 ? (
                <p className="resumo-texto">Nenhuma não conformidade registrada.</p>
              ) : (
                <>
                  <p className="resumo-texto">{quantidade(inst.ncs.length, "não conformidade registrada", "não conformidades registradas")}.</p>
                  <ul className="resumo-lista doc-lista">
                    {inst.ncs.map((nc) => (
                      <li key={nc.id}>
                        <span className="doc-nc-titulo">{nc.titulo}</span>
                        <span className="doc-linha">
                          {nc.ambiente} · {nc.criticidade} · {nc.status}
                        </span>
                        <span className="doc-linha">
                          Ação: {nc.acaoCorretiva || "não definida"} · Responsável: {nc.responsavelAcao || "não definido"} · Prazo: {nc.prazo ? dataBr(nc.prazo) : "não definido"}
                          {nc.resolvidaEm ? ` · Resolvida em ${dataBr(nc.resolvidaEm)}` : ""}
                        </span>
                        {nc.status === "Resolvida" && nc.semComprovacao && <Pill tom="amber">Sem comprovação</Pill>}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          {secoes.evidencias && (
            <section className="doc-secao">
              <h3 className="resumo-sub">Fotos citadas</h3>
              {inst.evidencias.length === 0 ? (
                <p className="resumo-texto">Nenhuma foto.</p>
              ) : (
                <div className="doc-fotos">
                  {inst.evidencias.map((ev) => {
                    const item = ev.checklistItemId ? itemPorId.get(ev.checklistItemId) : undefined;
                    const nc = ev.ncId ? ncPorId.get(ev.ncId) : undefined;
                    return (
                      <figure key={ev.id} className="doc-foto">
                        {ev.blobPathname ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={urlDaFoto(ev.blobPathname)} alt={item?.titulo || nc?.titulo || ev.descricao || "Foto da visita"} loading="eager" />
                        ) : (
                          <div className="doc-foto-vazia">Sem arquivo</div>
                        )}
                        <figcaption>
                          <strong>{item ? `Item: ${item.titulo}` : nc ? `Correção: ${nc.titulo}` : ev.descricao || "Foto da visita"}</strong>
                          <span>
                            {ev.ambiente || "Sem ambiente"} · {dataHoraBr(ev.criadoEm)}
                            {ev.registradoPorNome ? ` · ${ev.registradoPorNome}` : ""}
                            {ev.papel === "depois" ? " · depois da correção" : ""}
                          </span>
                        </figcaption>
                      </figure>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {secoes.pops && (
            <section className="doc-secao">
              <h3 className="resumo-sub">POPs da empresa</h3>
              {(inst.pops || []).length === 0 ? (
                <p className="resumo-texto">{inst.pops ? "Nenhum POP cadastrado." : "Sem informação de POPs neste relatório."}</p>
              ) : (
                <ul className="resumo-lista doc-lista">
                  {(inst.pops || []).map((pop, indice) => (
                    <li key={`${pop.codigo}-${indice}`}>
                      <span className="doc-nc-titulo">
                        {pop.codigo ? `${pop.codigo} · ` : ""}
                        {pop.titulo}
                      </span>
                      <span className="doc-linha">
                        Versão {pop.versao} · {pop.situacao}
                        {pop.aprovadoPor ? ` · aprovado por ${pop.aprovadoPor}${pop.aprovadoEm ? ` em ${dataBr(pop.aprovadoEm)}` : ""}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="emitido-assinatura">
            <span>
              Assinado por <b>{aberto.assinatura.nome}</b>, {aberto.assinatura.cargo} · {aberto.assinatura.crn}
            </span>
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
        <div className="ui-scroll">
          <div className="ui-list">
            {ordenados.map((item) => (
              <article key={item.id} className="ui-card emitido-linha">
                <div className="emitido-textos">
                  <span className="emitido-numero">
                    {item.numero} · versão {item.versao}
                  </span>
                  <span className="doc-linha">
                    Emitido em {dataHoraBr(item.emitidoEm)} · visita de {dataBr(item.instantaneo.visita.data)} · {item.assinatura.nome}, {item.assinatura.crn}
                  </span>
                  {item.motivoDaNovaVersao && <span className="doc-linha">Motivo da versão {item.versao}: {item.motivoDaNovaVersao}</span>}
                </div>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setAbertoId(item.id)}>
                  Abrir
                </button>
              </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
