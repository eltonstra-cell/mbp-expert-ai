"use client";

import type { FolhaDoPop, TabelaDaFolha } from "@/lib/popDocumento";

type Props = {
  folha: FolhaDoPop;
  /** Leitura em página cheia (imprimível) ou pré-visualização menor ao lado do editor. */
  modo: "leitura" | "previa";
  id?: string;
  /** Capa opcional: uma página só com código, título, empresa e versão. Aparece apenas no papel. */
  comCapa?: boolean;
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
                <td key={`${posicao}-${celula}`}>{celula}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {tabela.aviso && <p className="pfolha-tabela-aviso">{tabela.aviso}</p>}
    </div>
  );
}

// A folha do POP como a pessoa vai ler. Só apresenta; nada aqui grava.
export default function PopFolha({ folha, modo, id, comCapa = false }: Props) {
  return (
    <article id={id} className={`pfolha pfolha--${modo}${modo === "leitura" ? " doc-impresso" : ""}`} data-empresa={folha.esquerda}>
      {comCapa && modo === "leitura" && (
        <section className="pfolha-capa" aria-label="Capa do POP">
          {folha.capa.codigo && <span className="pfolha-capa-codigo">{folha.capa.codigo}</span>}
          <h2 className="pfolha-capa-titulo">{folha.capa.titulo}</h2>
          <span className="pfolha-capa-empresa">{folha.capa.empresa}</span>
          <span className="pfolha-capa-versao">{folha.capa.versao}</span>
        </section>
      )}
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
            <ol className="pfolha-passos">
              {bloco.linhas.map((linha, indice) => (
                <li key={`${indice}-${linha}`} className={linha === "(em branco)" ? "is-branco" : undefined}>
                  {linha}
                  {bloco.tabelas?.[indice] && <Tabela tabela={bloco.tabelas[indice]!} />}
                </li>
              ))}
            </ol>
          ) : (
            bloco.linhas.map((linha, indice) => (
              <div key={`${indice}-${linha}`} className="pfolha-item">
                <p className="pfolha-linha">{linha}</p>
                {bloco.tabelas?.[indice] && <Tabela tabela={bloco.tabelas[indice]!} />}
              </div>
            ))
          )}
        </section>
      ))}
      {folha.blocos.length === 0 && <p className="pfolha-linha is-branco">Nada preenchido ainda.</p>}
    </article>
  );
}
