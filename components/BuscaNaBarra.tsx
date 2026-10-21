"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NavIcon } from "@/components/NavIcons";
import { useVoiceCapture } from "@/components/useVoiceCapture";
import { ORDEM_GRUPOS_BUSCA, buscar, type Destino, type GrupoBusca, type Resultado } from "@/lib/commandSearch";
import { lerRecentes, registrarRecente, type Recente } from "@/lib/buscaRecentes";

// Exemplos que trocam a cada poucos segundos (só o texto de ajuda; nada é buscado sozinho).
const EXEMPLOS = ["nova visita, POPs, correções abertas", "relatório emitido, dossiê, norma", "ambientes, comprovantes, pessoas", "central da empresa, dados, responsável"];
const LIMITE_POR_GRUPO: Record<GrupoBusca, number> = { ir: 6, agir: 4, itens: 8, empresas: 6 };

export type AtalhoDaBusca = { id: string; rotulo: string; onClick: () => void };

type Props = {
  destinos: Destino[];
  /** Os quatro atalhos (Nova visita, Central da Empresa, Correções abertas, Relatórios): chips no painel da busca. */
  atalhos: AtalhoDaBusca[];
  /** Quem está usando (para guardar os recentes só dele neste aparelho). */
  usuarioId?: string | null;
  /** Avisa que a pessoa começou ou terminou de usar a busca (a tela só monta o índice enquanto está em uso). */
  onAtiva: (ativa: boolean) => void;
  onEscolher: (destino: Destino) => void;
  /** Mostra o microfone (só quem pode usar IA). */
  micDisponivel: boolean;
  /** Muda a cada Ctrl K: leva o foco para a barra. */
  pedidoDeFoco: number;
};

// A busca vive na própria linha do topo, à direita do nome da página. Ao clicar, abre um painel colado embaixo (8 px), da mesma largura:
// com a barra vazia mostra os atalhos e os recentes; ao digitar, os resultados.
export default function BuscaNaBarra({ destinos, atalhos, usuarioId, onAtiva, onEscolher, micDisponivel, pedidoDeFoco }: Props) {
  const [consulta, setConsulta] = useState("");
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [exemplo, setExemplo] = useState(0);
  const [recentes, setRecentes] = useState<Recente[]>([]);
  const campoRef = useRef<HTMLInputElement | null>(null);
  const raizRef = useRef<HTMLDivElement | null>(null);

  const voz = useVoiceCapture({
    limiteMs: 10000,
    onTexto: (texto) => {
      setConsulta(texto);
      setIndice(0);
      abrir();
      campoRef.current?.focus();
    },
  });

  function abrir() {
    if (!aberto) setRecentes(lerRecentes(usuarioId));
    setAberto(true);
    onAtiva(true);
  }
  function fechar() {
    setAberto(false);
    onAtiva(false);
  }

  useEffect(() => {
    const timer = window.setInterval(() => setExemplo((atual) => (atual + 1) % EXEMPLOS.length), 4500);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!pedidoDeFoco) return;
    campoRef.current?.focus();
    campoRef.current?.select();
    abrir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoDeFoco]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (evento: MouseEvent) => {
      if (raizRef.current?.contains(evento.target as Node)) return;
      fechar();
    };
    window.addEventListener("mousedown", aoClicarFora);
    return () => window.removeEventListener("mousedown", aoClicarFora);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const digitando = consulta.trim().length > 0;
  const resultados: Resultado[] = useMemo(() => (aberto && digitando ? buscar(consulta, destinos, { limite: 60 }) : []), [aberto, digitando, consulta, destinos]);
  const doBuscar = useMemo(
    () => ORDEM_GRUPOS_BUSCA.flatMap((grupo) => resultados.filter((resultado) => resultado.destino.grupo === grupo).slice(0, LIMITE_POR_GRUPO[grupo])),
    [resultados]
  );
  // Sem texto, a lista navegável são os recentes que ainda existem para esta pessoa (a rota é o id do destino).
  const doRecentes = useMemo(
    () =>
      recentes
        .map((recente) => destinos.find((destino) => destino.id === recente.rota))
        .filter((destino): destino is Destino => Boolean(destino))
        .map((destino): Resultado => ({ destino, pontos: 0 })),
    [recentes, destinos]
  );
  const lista = digitando ? doBuscar : doRecentes;

  useEffect(() => {
    document.getElementById(`pc-busca-opcao-${indice}`)?.scrollIntoView({ block: "nearest" });
  }, [indice]);

  function escolher(resultado: Resultado | undefined) {
    if (!resultado) return;
    registrarRecente(resultado.destino, usuarioId);
    fechar();
    setConsulta("");
    campoRef.current?.blur();
    onEscolher(resultado.destino);
  }

  function aoTeclar(evento: React.KeyboardEvent) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      fechar();
      campoRef.current?.focus();
    } else if (evento.key === "ArrowDown") {
      evento.preventDefault();
      if (!aberto) abrir();
      setIndice((atual) => (lista.length ? (atual + 1) % lista.length : 0));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndice((atual) => (lista.length ? (atual - 1 + lista.length) % lista.length : 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      escolher(lista[indice]);
    }
  }

  return (
    <div className="pc-busca" ref={raizRef} onKeyDown={aoTeclar}>
      <div className={`pc-smartbar${aberto ? " is-aberta" : ""}`}>
        <span className="pc-bolt" aria-hidden="true">
          <NavIcon name="raio" size={20} />
        </span>
        <input
          id="pc-busca-input"
          ref={campoRef}
          type="text"
          className="pc-busca-input"
          placeholder={`Ex.: ${EXEMPLOS[exemplo]}`}
          aria-label="Busca inteligente: diga o que quer fazer ou para onde quer ir"
          role="combobox"
          aria-expanded={aberto}
          aria-controls="pc-busca-lista"
          aria-activedescendant={aberto && lista.length ? `pc-busca-opcao-${indice}` : undefined}
          autoComplete="off"
          spellCheck={false}
          value={consulta}
          onFocus={abrir}
          onClick={abrir}
          onChange={(evento) => {
            setConsulta(evento.target.value);
            setIndice(0);
            abrir();
          }}
        />
        <kbd className="pc-kbd">Ctrl K</kbd>
        {micDisponivel && (
          <button
            type="button"
            className={`pc-mic${voz.estado === "ouvindo" ? " is-listening" : ""}`}
            aria-label={voz.estado === "ouvindo" ? "Parar de ouvir" : "Falar em vez de digitar"}
            disabled={voz.estado === "transcrevendo"}
            onClick={() => (voz.estado === "ouvindo" ? voz.parar() : void voz.iniciar())}
          >
            <NavIcon name="microfone" size={16} />
          </button>
        )}
        <button
          type="button"
          className="pc-go"
          onClick={() => {
            if (lista.length && digitando) escolher(lista[indice]);
            else {
              campoRef.current?.focus();
              abrir();
            }
          }}
        >
          Ir →
        </button>
      </div>

      {aberto && (
        <div className="pc-busca-painel" id="pc-busca-lista" role="listbox" aria-label="Resultados">
          {voz.estado === "ouvindo" && (
            <div className="pc-cmd-status" role="status">
              <span className="pc-cmd-pulse" aria-hidden="true" /> Ouvindo… (até 10 segundos)
              <button type="button" className="pc-cmd-status-btn" onClick={voz.parar}>
                Parar
              </button>
            </div>
          )}
          {voz.estado === "transcrevendo" && <div className="pc-cmd-status" role="status">Transcrevendo…</div>}
          {voz.erro && <div className="pc-cmd-error" role="alert">{voz.erro}</div>}

          {!digitando && atalhos.length > 0 && (
            <div className="pc-busca-bloco" role="group" aria-label="Atalhos">
              <span className="pc-busca-titulo">Atalhos</span>
              <div className="pc-busca-chips">
                {atalhos.map((atalho) => (
                  <button
                    key={atalho.id}
                    type="button"
                    className="pc-atalho"
                    onClick={() => {
                      fechar();
                      atalho.onClick();
                    }}
                  >
                    {atalho.rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!digitando && doRecentes.length > 0 && <span className="pc-busca-titulo">Recentes</span>}

          {lista.map((resultado, posicao) => (
            <button
              key={resultado.destino.id}
              id={`pc-busca-opcao-${posicao}`}
              type="button"
              role="option"
              aria-selected={posicao === indice}
              className={`pc-cmd-option${posicao === indice ? " is-selected" : ""}`}
              onMouseMove={() => setIndice(posicao)}
              onClick={() => escolher(resultado)}
            >
              <span className="pc-cmd-seta" aria-hidden="true">↗</span>
              <span className="pc-cmd-option-textos">
                <span className="pc-cmd-option-title">{resultado.destino.titulo}</span>
                {resultado.destino.detalhe && <span className="pc-cmd-option-detail">{resultado.destino.detalhe}</span>}
              </span>
              {posicao === indice && digitando && <span className="pc-cmd-enter">Enter</span>}
            </button>
          ))}
          {digitando && lista.length === 0 && <div className="pc-cmd-empty">{`Nada encontrado para “${consulta.trim()}”. Tente outra palavra.`}</div>}
          <div className="pc-cmd-foot" aria-hidden="true">
            <span>Digite para buscar · ↑↓ navegam · Enter abre · Esc fecha</span>
          </div>
        </div>
      )}
    </div>
  );
}
