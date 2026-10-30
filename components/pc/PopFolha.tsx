"use client";

import CapaDoPop from "@/components/CapaDoPop";
import type { ModeloDaCapa } from "@/lib/capaPop";
import { FREQUENCIA_A_DEFINIR, type BlocoDaFolha, type FolhaDoPop, type TabelaDaFolha } from "@/lib/popDocumento";

type Props = {
  folha: FolhaDoPop;
  /** Leitura em página cheia (imprimível) ou pré-visualização menor ao lado do editor. */
  modo: "leitura" | "previa";
  id?: string;
  /** Capa opcional (página A4 inteira, sem cabeçalho nem numeração). Aparece apenas no papel e vira a página 1; sem ela nada muda. */
  capa?: ModeloDaCapa | null;
  /** "Imprimir para assinar": campo de assinatura do responsável no fim da folha (só no papel desta impressão). */
  assinatura?: { nome: string; cargo: string } | null;
};

function Tabela({ tabela }: { tabela: TabelaDaFolha }) {
  return (
    <div className="pfolha-tabela-area">
      <table className="pfolha-tabela">
        <caption>{tabela.titulo}</caption>
        <thead>
          <tr>
            {tabela.colunas.map((coluna) => (
              <th key={coluna} scope="col">
                {coluna}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tabela.linhas.map((linha, indice) => (
            <tr key={`${indice}-${linha.join("|")}`}>
              {linha.map((celula, posicao) => (
                <td key={`${posicao}-${celula}`}>{celula && celula !== "null" ? celula : "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {tabela.aviso && <p className="pfolha-tabela-aviso">{tabela.aviso}</p>}
    </div>
  );
}

// Passos em grupos: cada subtítulo abre um grupo (a lista numerada recomeça em 1).
function gruposDePassos(bloco: BlocoDaFolha): { inicio: number; fim: number; subtitulo?: string }[] {
  const inicios = bloco.linhas.map((_, indice) => indice).filter((indice) => indice === 0 || Boolean(bloco.subtitulos?.[indice]));
  return inicios.map((inicio, posicao) => ({ inicio, fim: inicios[posicao + 1] ?? bloco.linhas.length, subtitulo: bloco.subtitulos?.[inicio] }));
}

// A folha do POP como a pessoa vai ler. Só apresenta; nada aqui grava.
export default function PopFolha({ folha, modo, id, capa = null, assinatura = null }: Props) {
  return (
    <>
      {capa && modo === "leitura" && (
        <section className="pfolha-capa" aria-label="Capa do POP">
          <CapaDoPop modelo={capa} />
        </section>
      )}
    <article id={id} className={`pfolha pfolha--${modo}${modo === "leitura" ? " doc-impresso" : ""}`} data-empresa={folha.esquerda}>
      <header className="pfolha-topo">
        <span className="pfolha-origem">{folha.esquerda}</span>
        <span className="pfolha-versao">{folha.direita}</span>
      </header>
      <h2 className="pfolha-titulo">{folha.titulo}</h2>
      <p className="pfolha-situacao">{folha.situacao}</p>
      {folha.blocos.map((bloco) => (
        <section key={bloco.titulo} className="pfolha-bloco">
          <h3 className="pfolha-bloco-titulo">
            {bloco.titulo}
            {bloco.aviso && <span className="pfolha-aviso no-print">{bloco.aviso}</span>}
          </h3>
          {bloco.vazia ? (
            <p className="pfolha-linha is-branco">{bloco.linhas[0]}</p>
          ) : bloco.tipo === "passos" ? (
            gruposDePassos(bloco).map((grupo) => (
              <div key={grupo.inicio} className="pfolha-grupo">
                {grupo.subtitulo && <p className="pfolha-subtitulo">{grupo.subtitulo}</p>}
                <ol className="pfolha-passos">
                  {bloco.linhas.slice(grupo.inicio, grupo.fim).map((linha, posicao) => (
                    <li key={`${grupo.inicio + posicao}-${linha}`} className={linha === "(em branco)" ? "is-branco" : undefined}>
                      {linha}
                      {bloco.tabelas?.[grupo.inicio + posicao] && <Tabela tabela={bloco.tabelas[grupo.inicio + posicao]!} />}
                    </li>
                  ))}
                </ol>
              </div>
            ))
          ) : (
            bloco.linhas.map((linha, indice) => (
              <div key={`${indice}-${linha}`} className="pfolha-item">
                <p className="pfolha-linha">{linha.endsWith(FREQUENCIA_A_DEFINIR) ? <>{linha.slice(0, linha.length - FREQUENCIA_A_DEFINIR.length)}<span className="pfolha-definir">{FREQUENCIA_A_DEFINIR}</span></> : linha}</p>
                {bloco.tabelas?.[indice] && <Tabela tabela={bloco.tabelas[indice]!} />}
              </div>
            ))
          )}
        </section>
      ))}
      {folha.blocos.length === 0 && <p className="pfolha-linha is-branco">Nada preenchido ainda.</p>}
      {assinatura && (
        <section className="pfolha-assinatura" aria-label="Assinatura do responsável">
          <div className="pfolha-assinatura-linha" />
          <p className="pfolha-assinatura-texto">
            Assinatura do responsável{assinatura.nome ? `: ${assinatura.nome}` : ""}
            {assinatura.cargo ? ` · ${assinatura.cargo}` : ""}
          </p>
          <p className="pfolha-assinatura-texto">Data: ____ / ____ / ________</p>
        </section>
      )}
    </article>
    </>
  );
}
