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
  /** "pc": as duas colunas aparecem sempre, lado a lado, com todas as fotos numa fileira que rola na horizontal e o botão "+ Foto". */
  variante?: "padrao" | "pc";
};

function Coluna({ titulo, fotos, todas }: { titulo: string; fotos: FotoDoPar[]; todas: boolean }) {
  const mostradas = todas ? fotos : fotos.slice(0, 1);
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

// Par antes/depois da correção: o antes é a evidência da não conformidade; o depois é anexado ao resolver.
export default function AntesDepois({ antes, depois, podeAdicionar, resolvida, onFotoDepois, variante = "padrao" }: Props) {
  const entrada = useRef<HTMLInputElement | null>(null);
  const pc = variante === "pc";
  const vazio = antes.length + depois.length === 0;
  return (
    <div className={`ad${vazio && !pc ? " ad--vazio" : ""}${pc ? " ad--pc" : ""}`} aria-label="Antes e depois da correção">
      {vazio && !pc ? (
        <span className="ui-row-sub ad-contagem">Antes 0 · Depois 0</span>
      ) : (
        <div className="ad-par">
          <Coluna titulo="Antes" fotos={antes} todas={pc} />
          <Coluna titulo="Depois" fotos={depois} todas={pc} />
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
              + Foto
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
