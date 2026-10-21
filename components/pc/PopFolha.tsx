"use client";

import type { FolhaDoPop } from "@/lib/popDocumento";

type Props = {
  folha: FolhaDoPop;
  /** Leitura em página cheia (imprimível) ou pré-visualização menor ao lado do editor. */
  modo: "leitura" | "previa";
  id?: string;
};

// A folha do POP como a pessoa vai ler. Só apresenta; nada aqui grava.
export default function PopFolha({ folha, modo, id }: Props) {
  return (
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
            <ol className="pfolha-passos">
              {bloco.linhas.map((linha, indice) => (
                <li key={`${indice}-${linha}`} className={linha === "(em branco)" ? "is-branco" : undefined}>
                  {linha}
                </li>
              ))}
            </ol>
          ) : (
            bloco.linhas.map((linha, indice) => (
              <p key={`${indice}-${linha}`} className="pfolha-linha">
                {linha}
              </p>
            ))
          )}
        </section>
      ))}
      {folha.blocos.length === 0 && <p className="pfolha-linha is-branco">Nada preenchido ainda.</p>}
    </article>
  );
}
