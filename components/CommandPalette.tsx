"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NavIcon } from "@/components/NavIcons";
import { useIaPermitida } from "@/components/IaPermissionContext";
import { useVoiceCapture } from "@/components/useVoiceCapture";
import {
  ORDEM_GRUPOS_BUSCA,
  ROTULOS_GRUPO_BUSCA,
  buscar,
  sugestoes,
  type Destino,
  type GrupoBusca,
  type Resultado,
} from "@/lib/commandSearch";

type Props = {
  aberto: boolean;
  /** Abre já gravando (botão de microfone da barra). */
  comVoz: boolean;
  destinos: Destino[];
  onEscolher: (destino: Destino) => void;
  onFechar: () => void;
};

const LIMITE_POR_GRUPO: Record<GrupoBusca, number> = { ir: 6, agir: 4, itens: 8, empresas: 6 };

export default function CommandPalette({ aberto, comVoz, destinos, onEscolher, onFechar }: Props) {
  const [consulta, setConsulta] = useState("");
  const [indice, setIndice] = useState(0);
  const campoRef = useRef<HTMLInputElement | null>(null);
  const iaPermitida = useIaPermitida();
  const voz = useVoiceCapture({
    onTexto: (texto) => {
      setConsulta(texto);
      setIndice(0);
      campoRef.current?.focus();
    },
  });

  const resultados: Resultado[] = useMemo(
    () => (consulta.trim() ? buscar(consulta, destinos, { limite: 60 }) : sugestoes(destinos)),
    [consulta, destinos]
  );

  // Agrupa na ordem fixa dos grupos; a lista plana segue a mesma ordem para as setas.
  const grupos = useMemo(
    () =>
      ORDEM_GRUPOS_BUSCA.map((grupo) => ({
        grupo,
        itens: resultados.filter((r) => r.destino.grupo === grupo).slice(0, LIMITE_POR_GRUPO[grupo]),
      })).filter((g) => g.itens.length > 0),
    [resultados]
  );
  const lista = useMemo(() => grupos.flatMap((g) => g.itens), [grupos]);

  useEffect(() => {
    if (!aberto) return;
    setConsulta("");
    setIndice(0);
    voz.limparErro();
    const timer = window.setTimeout(() => campoRef.current?.focus(), 30);
    if (comVoz && iaPermitida) void voz.iniciar();
    return () => {
      window.clearTimeout(timer);
      voz.cancelar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    document.getElementById(`pc-cmd-opcao-${indice}`)?.scrollIntoView({ block: "nearest" });
  }, [indice]);

  if (!aberto) return null;

  const escolher = (resultado: Resultado | undefined) => {
    if (!resultado) return;
    onFechar();
    onEscolher(resultado.destino);
  };

  const aoTeclar = (evento: React.KeyboardEvent) => {
    if (evento.key === "Escape") {
      evento.preventDefault();
      onFechar();
    } else if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setIndice((atual) => (lista.length ? (atual + 1) % lista.length : 0));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndice((atual) => (lista.length ? (atual - 1 + lista.length) % lista.length : 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      escolher(lista[indice]);
    }
  };

  let posicao = -1;
  return (
    <div className="pc-cmd-layer" role="presentation" onKeyDown={aoTeclar}>
      <button type="button" className="pc-cmd-backdrop" aria-label="Fechar caixa inteligente" onClick={onFechar} tabIndex={-1} />
      <div className="pc-cmd" role="dialog" aria-modal="true" aria-label="Caixa inteligente">
        <div className="pc-cmd-field">
          <span className="pc-bolt" aria-hidden="true">
            <NavIcon name="raio" size={22} />
          </span>
          <input
            ref={campoRef}
            type="text"
            className="pc-cmd-input"
            placeholder="Diga o que quer fazer ou para onde quer ir"
            aria-label="Diga o que quer fazer ou para onde quer ir"
            role="combobox"
            aria-expanded="true"
            aria-controls="pc-cmd-lista"
            aria-activedescendant={lista.length ? `pc-cmd-opcao-${indice}` : undefined}
            autoComplete="off"
            spellCheck={false}
            value={consulta}
            onChange={(evento) => {
              setConsulta(evento.target.value);
              setIndice(0);
            }}
          />
          {iaPermitida && (
            <button
              type="button"
              className={`pc-mic${voz.estado === "ouvindo" ? " is-listening" : ""}`}
              aria-label={voz.estado === "ouvindo" ? "Parar de ouvir" : "Falar em vez de digitar"}
              disabled={voz.estado === "transcrevendo"}
              onClick={() => (voz.estado === "ouvindo" ? voz.parar() : void voz.iniciar())}
            >
              <NavIcon name="microfone" size={18} />
            </button>
          )}
          <button type="button" className="pc-cmd-close" onClick={onFechar} aria-label="Fechar (Esc)">
            <span className="pc-cmd-close-esc">Esc</span>
            <span className="pc-cmd-close-x" aria-hidden="true">×</span>
          </button>
        </div>

        {voz.estado === "ouvindo" && (
          <div className="pc-cmd-status" role="status">
            <span className="pc-cmd-pulse" aria-hidden="true" /> Ouvindo… (até 8 segundos; para sozinho no silêncio)
            <button type="button" className="pc-cmd-status-btn" onClick={voz.parar}>Parar</button>
          </div>
        )}
        {voz.estado === "transcrevendo" && <div className="pc-cmd-status" role="status">Transcrevendo…</div>}
        {voz.erro && (
          <div className="pc-cmd-error" role="alert">
            {voz.erro}
          </div>
        )}

        <div id="pc-cmd-lista" className="pc-cmd-list" role="listbox" aria-label="Resultados">
          {grupos.map(({ grupo, itens }) => (
            <div key={grupo} role="group" aria-label={ROTULOS_GRUPO_BUSCA[grupo]}>
              {itens.map((resultado) => {
                posicao += 1;
                const minha = posicao;
                return (
                  <button
                    key={resultado.destino.id}
                    id={`pc-cmd-opcao-${minha}`}
                    type="button"
                    role="option"
                    aria-selected={minha === indice}
                    className={`pc-cmd-option${minha === indice ? " is-selected" : ""}`}
                    onMouseMove={() => setIndice(minha)}
                    onClick={() => escolher(resultado)}
                  >
                    <span className="pc-cmd-seta" aria-hidden="true">↗</span>
                    <span className="pc-cmd-option-textos">
                      <span className="pc-cmd-option-title">{resultado.destino.titulo}</span>
                      {resultado.destino.detalhe && (
                        <span className="pc-cmd-option-detail">{resultado.destino.detalhe}</span>
                      )}
                    </span>
                    {minha === 0 && consulta.trim() && <span className="pc-cmd-enter">Enter</span>}
                  </button>
                );
              })}
            </div>
          ))}
          {lista.length === 0 && (
            <div className="pc-cmd-empty">
              {consulta.trim() ? `Nada encontrado para “${consulta.trim()}”. Tente outra palavra.` : "Digite para buscar."}
            </div>
          )}
        </div>

        <div className="pc-cmd-foot" aria-hidden="true">
          <span>Enter abre o primeiro resultado · ↑↓ navegam · Esc fecha</span>
        </div>
      </div>
    </div>
  );
}
