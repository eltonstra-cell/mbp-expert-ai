"use client";

import { useState } from "react";
import { montarDossie, opcoesPadraoDoDossie, type DadosDoDossie, type OpcoesDoDossie } from "@/lib/dossie";

type Props = {
  dados: DadosDoDossie;
  urlDaFoto: (pathname: string) => string;
  onImprimir: () => void;
  onVoltar: () => void;
};

const ROTULOS: { chave: keyof OpcoesDoDossie; rotulo: string; aviso?: string }[] = [
  { chave: "relatorios", rotulo: "Relatórios emitidos (últimos 12 meses)" },
  { chave: "pops", rotulo: "POPs aprovados (versão vigente)" },
  { chave: "registros", rotulo: "Registros por POP" },
  { chave: "comprovantes", rotulo: "Comprovantes de terceiros" },
  { chave: "capacitacao", rotulo: "Capacitação nominal", aviso: "traz nome e cargo das pessoas" },
  { chave: "fotos", rotulo: "Fotos dos relatórios", aviso: "desligadas por padrão: dado pessoal e arquivo grande" },
];

// Dossiê para fiscalização: escolha o que entra, veja o índice e imprima (Salvar como PDF). Só a empresa ativa.
export default function PcDossie({ dados, urlDaFoto, onImprimir, onVoltar }: Props) {
  const [opcoes, setOpcoes] = useState<OpcoesDoDossie>(opcoesPadraoDoDossie);
  const [gerado, setGerado] = useState(false);
  const dossie = montarDossie(dados, opcoes);
  const nenhuma = !Object.values(opcoes).some(Boolean);
  return (
    <section className="ui-screen dossie-tela" aria-label="Dossiê para fiscalização">
      <div className="ui-head no-print">
        <div>
          <h1 className="ui-title">Dossiê para fiscalização</h1>
          <p className="ui-subtitle">{dossie.empresaNome} · um PDF com índice, só desta empresa</p>
        </div>
        <div className="ui-head-actions">
          {gerado && (
            <button type="button" className="ui-btn ui-btn--primary" onClick={onImprimir}>
              Imprimir ou salvar PDF
            </button>
          )}
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Voltar
          </button>
        </div>
      </div>

      <div className="ui-card dossie-opcoes no-print" role="group" aria-label="O que entra no dossiê">
        <h2 className="ui-card-title">O que entra</h2>
        {ROTULOS.map((item) => (
          <label key={item.chave} className="pc-check priv-aceite">
            <input
              type="checkbox"
              checked={opcoes[item.chave]}
              onChange={(evento) => {
                setOpcoes({ ...opcoes, [item.chave]: evento.target.checked });
                setGerado(false);
              }}
            />
            <span>
              {item.rotulo}
              {item.aviso ? <span className="ui-row-sub"> · {item.aviso}</span> : null}
            </span>
          </label>
        ))}
        {nenhuma && <span className="ui-field-error">Escolha ao menos uma parte.</span>}
        <div className="comp-form-acoes">
          <button type="button" className="ui-btn ui-btn--save" disabled={nenhuma} onClick={() => setGerado(true)}>
            Montar dossiê
          </button>
        </div>
      </div>

      {gerado && (
        <article id="dossie-pagina" className="dossie-pagina" data-empresa={dossie.empresaNome}>
          <header className="dossie-capa">
            <h2 className="resumo-titulo">Dossiê · {dossie.empresaNome}</h2>
            <span className="ui-row-sub">Gerado em {dossie.geradoEm.split("-").reverse().join("/")}</span>
          </header>
          <nav aria-label="Índice" className="dossie-indice">
            <h3 className="resumo-sub">Índice</h3>
            <ol>
              {dossie.indice.map((item, indice) => (
                <li key={item.id}>
                  {indice + 1}. {item.titulo}
                </li>
              ))}
            </ol>
          </nav>
          {dossie.secoes.map((secao, indice) => (
            <section key={secao.id} className="dossie-secao">
              <h3 className="resumo-sub">
                {indice + 1}. {secao.titulo}
              </h3>
              {secao.linhas.map((linha, i) => (
                <p key={i} className="dossie-linha">
                  {linha}
                </p>
              ))}
              {secao.fotos && secao.fotos.length > 0 && (
                <div className="dossie-fotos">
                  {secao.fotos.map((foto) => (
                    <figure key={foto.id}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={urlDaFoto(foto.pathname)} alt={foto.legenda} />
                      <figcaption>{foto.legenda}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </section>
          ))}
          <footer className="resumo-rodape">Não é assinatura digital com certificado ICP-Brasil. Reúne o que está cadastrado no Ponto Certo; confira antes de entregar.</footer>
        </article>
      )}
    </section>
  );
}
