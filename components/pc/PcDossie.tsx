"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { montarDossie, opcoesPadraoDoDossie, type DadosDoDossie, type OpcoesDoDossie } from "@/lib/dossie";
import { paginasDasSecoes } from "@/lib/indicePaginas";
import { quantidade } from "@/lib/plural";
import type { CabecalhoDeImpressao } from "@/lib/printFooter";

type Props = {
  dados: DadosDoDossie;
  urlDaFoto: (pathname: string) => string;
  onImprimir: (titulo: string, cabecalho: CabecalhoDeImpressao) => void;
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

const dataBr = (iso: string) => iso.split("-").reverse().join("/");

// Dossiê para fiscalização: escolha o que entra, veja o índice (com contagem e página de cada parte) e imprima (Salvar como PDF).
export default function PcDossie({ dados, urlDaFoto, onImprimir, onVoltar }: Props) {
  const [opcoes, setOpcoes] = useState<OpcoesDoDossie>(opcoesPadraoDoDossie);
  const [gerado, setGerado] = useState(false);
  const [paginas, setPaginas] = useState<{ inicio: number[]; total: number } | null>(null);
  const paginaRef = useRef<HTMLElement | null>(null);
  const dossie = useMemo(() => montarDossie(dados, opcoes), [dados, opcoes]);
  const nenhuma = !Object.values(opcoes).some(Boolean);

  // Mede cada parte na largura do papel e calcula em que página ela cai (o navegador só conta ao imprimir).
  useLayoutEffect(() => {
    if (!gerado || !paginaRef.current) {
      setPaginas(null);
      return;
    }
    const raiz = paginaRef.current;
    const capa = raiz.querySelector<HTMLElement>("[data-dossie-capa]");
    const secoes = Array.from(raiz.querySelectorAll<HTMLElement>("[data-dossie-secao]"));
    const aguardar = Promise.all(Array.from(raiz.querySelectorAll("img")).map((img) => (img.complete ? Promise.resolve() : new Promise<void>((resolver) => { img.onload = () => resolver(); img.onerror = () => resolver(); }))));
    let ativo = true;
    const calcular = () => {
      if (!ativo) return;
      setPaginas(paginasDasSecoes(capa?.offsetHeight || 0, secoes.map((secao) => secao.offsetHeight)));
    };
    calcular();
    void aguardar.then(calcular);
    return () => {
      ativo = false;
    };
  }, [gerado, dossie]);

  function montar() {
    setGerado(true);
    window.setTimeout(() => paginaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  function imprimir() {
    onImprimir(`Dossie - ${dossie.empresaNome}`, {
      esquerda: [dossie.empresaNome, `CNPJ ${dados.empresa.cnpj}`],
      direita: ["Dossiê para fiscalização", `Gerado em ${dataBr(dossie.geradoEm)}`],
    });
  }

  return (
    <section className="ui-screen dossie-tela" aria-label="Dossiê para fiscalização">
      <div className="ui-head no-print">
        <h1 className="sr-only">Dossiê para fiscalização</h1>
        <div className="ui-head-actions">
          {gerado && (
            <button type="button" className="ui-btn ui-btn--criar" onClick={imprimir}>
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
          <label key={item.chave} className="dossie-opcao">
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
              {item.aviso ? <span className="dossie-opcao-aviso"> · {item.aviso}</span> : null}
            </span>
          </label>
        ))}
        {nenhuma && <span className="ui-field-error">Escolha ao menos uma parte.</span>}
        <div className="comp-form-acoes">
          <button type="button" className="ui-btn ui-btn--save" disabled={nenhuma} onClick={montar}>
            Montar dossiê
          </button>
        </div>
      </div>

      {gerado && (
        <div className="dossie-aviso no-print" role="status">
          <span>Dossiê montado logo abaixo. Confira o índice e use “Imprimir ou salvar PDF”.</span>
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => paginaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}>
            Ver o dossiê ↓
          </button>
        </div>
      )}

      {gerado && (
        <article id="dossie-pagina" ref={paginaRef} className="dossie-pagina doc-impresso" data-empresa={dossie.empresaNome}>
          <div data-dossie-capa>
            <header className="dossie-capa">
              <h2 className="resumo-titulo">Dossiê · {dossie.empresaNome}</h2>
              <span className="doc-linha">CNPJ {dados.empresa.cnpj} · gerado em {dataBr(dossie.geradoEm)}</span>
            </header>
            <nav aria-label="Índice" className="dossie-indice">
              <h3 className="resumo-sub">Índice</h3>
              <ol className="dossie-indice-lista">
                {dossie.indice.map((item, indice) => (
                  <li key={item.id}>
                    <span className="dossie-indice-titulo">
                      {indice + 1}. {item.titulo}
                    </span>
                    <span className="dossie-indice-contagem">{item.id === "fotos" ? quantidade(item.contagem, "foto", "fotos") : quantidade(item.contagem, "item", "itens")}</span>
                    <span className="dossie-indice-pagina">{paginas ? `pág. ${paginas.inicio[indice]}` : ""}</span>
                  </li>
                ))}
              </ol>
              {paginas && <p className="doc-linha">Páginas calculadas pelo tamanho de cada parte (A4, cada parte em página nova): total de {quantidade(paginas.total, "página", "páginas")}. A numeração impressa no rodapé é a do navegador.</p>}
            </nav>
          </div>
          {dossie.secoes.map((secao, indice) => (
            <section key={secao.id} className="dossie-secao" data-dossie-secao>
              <h3 className="resumo-sub">
                {indice + 1}. {secao.titulo} <span className="dossie-secao-contagem">({secao.id === "fotos" ? quantidade(secao.contagem, "foto", "fotos") : quantidade(secao.contagem, "item", "itens")})</span>
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
                      <img src={urlDaFoto(foto.pathname)} alt={foto.legenda} loading="eager" />
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
