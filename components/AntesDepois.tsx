"use client";

import { useRef } from "react";

export type FotoDoPar = { id: string; url: string; nome: string; quando: string };

type Props = {
  antes: FotoDoPar[];
  depois: FotoDoPar[];
  /** Quem pode anexar a foto do depois (mesma permissão de evidências). */
  podeAdicionar: boolean;
  resolvida: boolean;
  online?: boolean;
  onFotoDepois: (arquivo: File) => void;
};

function Coluna({ titulo, fotos }: { titulo: string; fotos: FotoDoPar[] }) {
  return (
    <div className="ad-coluna">
      <span className="ui-eyebrow">
        {titulo} · {fotos.length}
      </span>
      {fotos.length === 0 ? (
        <span className="ad-vazio ui-row-sub">Sem foto</span>
      ) : (
        <a href={fotos[0].url || undefined} target="_blank" rel="noreferrer" className="ad-foto" aria-label={`${titulo}: abrir a foto`}>
          {fotos[0].url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={fotos[0].url} alt={`${titulo} da correção`} />
          ) : (
            <span className="ui-row-sub">Foto no aparelho</span>
          )}
        </a>
      )}
      {fotos[0] && <span className="ui-row-sub">{fotos[0].quando}</span>}
    </div>
  );
}

// Par antes/depois da correção: o antes é a evidência da não conformidade; o depois é anexado ao resolver.
export default function AntesDepois({ antes, depois, podeAdicionar, resolvida, onFotoDepois }: Props) {
  const entrada = useRef<HTMLInputElement | null>(null);
  return (
    <div className={`ad${antes.length + depois.length === 0 ? " ad--vazio" : ""}`} aria-label="Antes e depois da correção">
      {antes.length + depois.length === 0 ? (
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
          <button type="button" className="ui-btn ui-btn--secondary ui-btn--small ad-botao" onClick={() => entrada.current?.click()}>
            Adicionar foto do depois
          </button>
        </>
      )}
    </div>
  );
}
