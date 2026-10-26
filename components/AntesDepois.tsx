"use client";

import { useRef, useState } from "react";

export type FotoDoPar = { id: string; url: string; nome: string; quando: string };

type Props = {
  antes: FotoDoPar[];
  depois: FotoDoPar[];
  /** Quem pode anexar a foto do depois (mesma permissão de evidências). */
  podeAdicionar: boolean;
  resolvida: boolean;
  online?: boolean;
  onFotoDepois: (arquivo: File) => void;
  /** "pc": UMA fileira compacta (miniaturas com a legenda "Antes" ou "Depois", que rolam na horizontal se houver muitas, e o botão "+ Foto" fixo à direita, fora da área que rola). A tela de Correções só mostra o bloco quando há foto; o acréscimo vazio é um link no fim do detalhe. */
  variante?: "padrao" | "pc";
};

function Coluna({ titulo, fotos }: { titulo: string; fotos: FotoDoPar[] }) {
  const mostradas = fotos.slice(0, 1);
  return (
    <div className="ad-coluna">
      <span className="ui-eyebrow">
        {titulo} · {fotos.length}
      </span>
      {fotos.length === 0 ? (
        <span className="ad-vazio ui-row-sub">Sem foto</span>
      ) : (
        <div className="ad-fileira">
          {mostradas.map((foto) => (
            <span key={foto.id} className="ad-item">
              <a href={foto.url || undefined} target="_blank" rel="noreferrer" className="ad-foto" aria-label={`${titulo}: abrir a foto`}>
                {foto.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={foto.url} alt={`${titulo} da correção`} />
                ) : (
                  <span className="ui-row-sub">Foto no aparelho</span>
                )}
              </a>
              <span className="ui-row-sub">{foto.quando}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function MiniaturaCompacta({ titulo, foto }: { titulo: "Antes" | "Depois"; foto: FotoDoPar }) {
  const [quebrada, setQuebrada] = useState(false);
  const dica = foto.quando ? `${titulo} · ${foto.quando}` : titulo;
  const conteudo = (
    <>
      {foto.url && !quebrada ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto.url} alt={`${titulo} da correção`} onError={() => setQuebrada(true)} />
      ) : (
        <span className="ui-row-sub ad-sem-imagem">{foto.url ? "Foto indisponível" : "Foto no aparelho"}</span>
      )}
      <span className="ad-legenda" aria-hidden="true">
        {titulo}
      </span>
    </>
  );
  // Sem url (foto só no aparelho) não há para onde abrir: não é link.
  if (!foto.url) {
    return (
      <span role="img" className="ad-foto ad-foto--mini" aria-label={`Foto ${titulo} no aparelho`} title={dica}>
        {conteudo}
      </span>
    );
  }
  return (
    <a href={foto.url} target="_blank" rel="noreferrer" className="ad-foto ad-foto--mini" aria-label={`${titulo}: abrir a foto`} title={dica}>
      {conteudo}
    </a>
  );
}

// Par antes/depois da correção: o antes é a evidência da não conformidade; o depois é anexado ao resolver.
export default function AntesDepois({ antes, depois, podeAdicionar, resolvida, onFotoDepois, variante = "padrao" }: Props) {
  const entrada = useRef<HTMLInputElement | null>(null);
  const pc = variante === "pc";
  const vazio = antes.length + depois.length === 0;
  return (
    <div className={`ad${vazio && !pc ? " ad--vazio" : ""}${pc ? " ad--pc" : ""}`} aria-label="Antes e depois da correção">
      {pc ? (
        <div className="ad-rolagem">
          <div className="ad-linha">
            {antes.map((foto) => (
              <MiniaturaCompacta key={foto.id} titulo="Antes" foto={foto} />
            ))}
            {depois.map((foto) => (
              <MiniaturaCompacta key={foto.id} titulo="Depois" foto={foto} />
            ))}
          </div>
        </div>
      ) : vazio ? (
        <span className="ui-row-sub ad-contagem">Antes 0 · Depois 0</span>
      ) : (
        <div className="ad-par">
          <Coluna titulo="Antes" fotos={antes} />
          <Coluna titulo="Depois" fotos={depois} />
        </div>
      )}
      {resolvida && depois.length === 0 && <span className="ui-field-error ad-aviso">Resolvida sem foto do depois: o relatório mostra “sem comprovação”.</span>}
      {podeAdicionar && (
        <>
          <input ref={entrada} type="file" accept="image/*" capture="environment" hidden onChange={(evento) => {
            const arquivo = evento.target.files?.[0];
            evento.target.value = "";
            if (arquivo) onFotoDepois(arquivo);
          }} />
          {pc ? (
            <button type="button" className="ad-foto-mais" aria-label="Adicionar foto do depois" title="Adicionar foto do depois" onClick={() => entrada.current?.click()}>
              {depois.length === 0 ? "+ Foto do depois" : "+ Foto"}
            </button>
          ) : (
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small ad-botao" onClick={() => entrada.current?.click()}>
              Adicionar foto do depois
            </button>
          )}
        </>
      )}
    </div>
  );
}
