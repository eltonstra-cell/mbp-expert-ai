"use client";

import { useState } from "react";
import { pacoteDoTipo, rotuloDoTipo } from "@/lib/tiposDeEstabelecimento";
import type { TipoFluxoOperacional } from "@/types";

export type EscolhaDoPacote = {
  ambientes: string[];
  equipamentos: { nome: string; ambiente: string; quantidade: number }[];
  fluxos: TipoFluxoOperacional[];
};

type Props = {
  tipo: string;
  /** Ambientes que já estão marcados na empresa (não são propostos de novo). */
  ambientesDaEmpresa: string[];
  /** "Ambiente|nome" dos equipamentos que já existem. */
  equipamentosDaEmpresa: string[];
  fluxosAplicaveis: TipoFluxoOperacional[];
  onAplicar: (escolha: EscolhaDoPacote) => void;
  onDesfazer: () => void;
  aplicadoAgora: boolean;
};

const chaveEq = (ambiente: string, nome: string) => `${ambiente}|${nome.toLocaleLowerCase("pt-BR")}`;

// "Para este tipo, o app propõe": ambientes, equipamentos e fluxos já marcados; o RT desmarca o que não existe e confirma. As perguntas não mudam.
export default function PacoteDoTipoPainel({ tipo, ambientesDaEmpresa, equipamentosDaEmpresa, fluxosAplicaveis, onAplicar, onDesfazer, aplicadoAgora }: Props) {
  const pacote = pacoteDoTipo(tipo);
  const ambientesNovos = pacote.ambientes.filter((ambiente) => !ambientesDaEmpresa.includes(ambiente));
  const equipamentosNovos = pacote.equipamentos.filter((item) => !equipamentosDaEmpresa.includes(chaveEq(item.ambiente, item.nome)));
  const fluxosNovos = pacote.fluxos.filter((fluxo) => !fluxosAplicaveis.includes(fluxo));
  const [desmarcados, setDesmarcados] = useState<Set<string>>(new Set());
  const [aberto, setAberto] = useState(false);
  const alternar = (chave: string) =>
    setDesmarcados((atual) => {
      const novo = new Set(atual);
      if (novo.has(chave)) novo.delete(chave);
      else novo.add(chave);
      return novo;
    });
  const total = ambientesNovos.length + equipamentosNovos.length + fluxosNovos.length;

  if (aplicadoAgora) {
    return (
      <section className="pacote-tipo md:col-span-2" role="status">
        <span>Pacote de {rotuloDoTipo(tipo)} aplicado. Confira nas abas Ambientes, Equipamentos e Fluxos; o que veio da sugestão fica marcado como “sugerido”.</span>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onDesfazer}>Desfazer</button>
      </section>
    );
  }
  if (total === 0) return null;

  return (
    <section className="pacote-tipo md:col-span-2" aria-label="Sugestão para o tipo de estabelecimento">
      <div className="pacote-tipo-topo">
        <span><strong>{rotuloDoTipo(tipo)}</strong>: o app propõe {ambientesNovos.length} {ambientesNovos.length === 1 ? "ambiente" : "ambientes"}, {equipamentosNovos.length} {equipamentosNovos.length === 1 ? "equipamento" : "equipamentos"} e {fluxosNovos.length} {fluxosNovos.length === 1 ? "fluxo" : "fluxos"}. Nada é criado sem a sua confirmação.</span>
        <button type="button" className="ui-btn ui-btn--secondary" aria-expanded={aberto} onClick={() => setAberto((valor) => !valor)}>{aberto ? "Recolher" : "Ver e escolher"}</button>
      </div>
      {aberto && (
        <div className="pacote-tipo-corpo">
          {[
            { titulo: "Ambientes", itens: ambientesNovos.map((a) => ({ chave: `a:${a}`, texto: a })) },
            { titulo: "Equipamentos", itens: equipamentosNovos.map((e) => ({ chave: `e:${chaveEq(e.ambiente, e.nome)}`, texto: `${e.nome} · ${e.ambiente}` })) },
            { titulo: "Fluxos", itens: fluxosNovos.map((f) => ({ chave: `f:${f}`, texto: f })) },
          ].map((grupo) => (
            <fieldset key={grupo.titulo} className="pacote-tipo-grupo">
              <legend>{grupo.titulo}</legend>
              {grupo.itens.length === 0 && <span className="ui-row-sub">Nada novo a propor.</span>}
              <div className="pacote-tipo-itens">
                {grupo.itens.map((item) => (
                  <label key={item.chave} className="pacote-tipo-item">
                    <input type="checkbox" checked={!desmarcados.has(item.chave)} onChange={() => alternar(item.chave)} />
                    <span>{item.texto}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <div className="pacote-tipo-acoes">
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={() =>
                onAplicar({
                  ambientes: ambientesNovos.filter((a) => !desmarcados.has(`a:${a}`)),
                  equipamentos: equipamentosNovos.filter((e) => !desmarcados.has(`e:${chaveEq(e.ambiente, e.nome)}`)),
                  fluxos: fluxosNovos.filter((f) => !desmarcados.has(`f:${f}`)),
                })
              }
            >
              Aplicar o que está marcado
            </button>
            <button type="button" className="ui-btn ui-btn--secondary" onClick={() => setAberto(false)}>Agora não</button>
          </div>
        </div>
      )}
    </section>
  );
}
