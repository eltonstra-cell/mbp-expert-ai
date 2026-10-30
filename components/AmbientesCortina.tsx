"use client";

import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent as TeclaDoReact, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { filtrarAmbientes, rotulosCurtosDosAmbientes, type InfoAmbiente } from "@/lib/checklistEnvs";

type Props = {
  ambientes: InfoAmbiente[];
  atual: string | null;
  onSelecionar: (nome: string) => void;
  /** O botão que abre a lista (o seletor do ambiente atual). */
  renderBotao: (estado: { aberto: boolean; alternar: () => void }) => ReactNode;
  /** Classe extra na raiz do seletor. */
  classe?: string;
  /** Sem a caixa de busca (listas curtas, como as seções de um POP). */
  semBusca?: boolean;
  /** Mostra o rótulo inteiro, sem abreviar nomes parecidos. */
  semAbreviar?: boolean;
  /** Nome da lista para o leitor de tela (padrão "Ambientes"). */
  nomeDaLista?: string;
  /** O que vai à direita da linha quando o item não está completo (padrão: "respondidas/total"). */
  conta?: (ambiente: InfoAmbiente) => ReactNode;
};

type Posicao = { top: number; left: number; width: number; maxHeight: number };

/**
 * Lista suspensa de ambientes do checklist: abre logo abaixo da caixa "Cozinha / Produção", com a mesma largura dela (no celular, a da tela), busca
 * "Buscar entre N ambientes" no topo e UMA LINHA DE 44 px por ambiente (✓ no concluído, "respondidas/total" nos demais, o atual em destaque).
 * Sem painel lateral, sem sombra na tela e sem escurecer o resto. Fecha ao escolher, ao clicar fora ou com Esc; setas, Enter e Esc funcionam no teclado.
 * Fica num portal (posição fixa, calculada pela caixa) para não ser cortada por quem a chama.
 */
export default function AmbientesCortina({ ambientes, atual, onSelecionar, renderBotao, classe = "", semBusca = false, semAbreviar = false, nomeDaLista = "Ambientes", conta }: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [pronto, setPronto] = useState(false);
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [realce, setRealce] = useState(0);
  const raizRef = useRef<HTMLDivElement | null>(null);
  const listaRef = useRef<HTMLDivElement | null>(null);
  const buscaRef = useRef<HTMLInputElement | null>(null);
  const origemRef = useRef<HTMLElement | null>(null);

  useEffect(() => setPronto(true), []);

  const visiveis = filtrarAmbientes(ambientes, busca);
  const nomesCurtos = rotulosCurtosDosAmbientes(ambientes.map((ambiente) => ambiente.rotulo));
  const nomeCurtoDe = (nome: string) => (semAbreviar ? ambientes.find((ambiente) => ambiente.nome === nome)?.rotulo || nome : nomesCurtos[ambientes.findIndex((ambiente) => ambiente.nome === nome)] || nome);

  const fechar = (devolverFoco = true) => {
    setAberto(false);
    setBusca("");
    setPosicao(null);
    if (devolverFoco) origemRef.current?.focus();
  };

  const medir = () => {
    const caixa = raizRef.current?.querySelector<HTMLElement>("button");
    if (!caixa) return;
    const r = caixa.getBoundingClientRect();
    // A altura máxima é o espaço livre até o fim da tela (ou até a barra de baixo, quando há).
    const barra = document.querySelector<HTMLElement>(".campo-bar");
    const topoDaBarra = barra ? barra.getBoundingClientRect().top : 0;
    const fimDaTela = barra && topoDaBarra > r.bottom ? topoDaBarra : window.innerHeight;
    const estreito = window.innerWidth < 520;
    setPosicao({
      top: r.bottom + 4,
      left: estreito ? 8 : r.left,
      width: estreito ? window.innerWidth - 16 : r.width,
      maxHeight: Math.max(160, fimDaTela - r.bottom - 4 - 8),
    });
  };

  useLayoutEffect(() => {
    if (!aberto) return;
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const indice = filtrarAmbientes(ambientes, "").findIndex((ambiente) => ambiente.nome === atual);
    setRealce(Math.max(0, indice));
    // No toque, focar a busca abriria o teclado por cima da lista: só o mouse e o teclado físico começam na busca.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) buscaRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, posicao !== null]);

  useEffect(() => setRealce(0), [busca]);

  useEffect(() => {
    if (!aberto) return;
    listaRef.current?.querySelector(".is-realce")?.scrollIntoView({ block: "nearest" });
  }, [aberto, realce, posicao]);

  // Clicar fora fecha (sem tirar o foco do que foi clicado); Esc fecha e devolve o foco à caixa.
  useEffect(() => {
    if (!aberto) return;
    const aoTocar = (evento: PointerEvent) => {
      const alvo = evento.target as Node;
      if (listaRef.current?.contains(alvo) || raizRef.current?.contains(alvo)) return;
      fechar(false);
    };
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fechar();
      }
    };
    document.addEventListener("pointerdown", aoTocar, true);
    window.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("pointerdown", aoTocar, true);
      window.removeEventListener("keydown", aoTeclar);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const escolher = (nome: string) => {
    fechar();
    onSelecionar(nome);
  };

  const aoTeclarNaLista = (evento: TeclaDoReact) => {
    if (visiveis.length === 0) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setRealce((valor) => Math.min(visiveis.length - 1, valor + 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setRealce((valor) => Math.max(0, valor - 1));
    } else if (evento.key === "Home") {
      evento.preventDefault();
      setRealce(0);
    } else if (evento.key === "End") {
      evento.preventDefault();
      setRealce(visiveis.length - 1);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      escolher(visiveis[Math.min(realce, visiveis.length - 1)].nome);
    }
  };

  const lista = posicao && (
    <div className="amb-lista" ref={listaRef} style={{ top: posicao.top, left: posicao.left, width: posicao.width, maxHeight: posicao.maxHeight }} onKeyDown={aoTeclarNaLista}>
      {!semBusca && <label className="amb-lista-busca">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
          <circle cx="8" cy="8" r="5.2" />
          <path d="M12 12l3.6 3.6" />
        </svg>
        <input
          ref={buscaRef}
          type="search"
          role="combobox"
          aria-expanded="true"
          aria-controls="amb-lista-opcoes"
          aria-activedescendant={visiveis[realce] ? `amb-op-${realce}` : undefined}
          placeholder={`Buscar entre ${ambientes.length} ambientes`}
          aria-label={`Buscar entre ${ambientes.length} ambientes`}
          value={busca}
          onChange={(evento) => setBusca(evento.target.value)}
        />
      </label>}
      <ul className="amb-lista-opcoes" id="amb-lista-opcoes" role="listbox" aria-label={nomeDaLista}>
        {visiveis.length === 0 ? (
          <li className="amb-lista-vazio" role="presentation">Nenhum ambiente encontrado</li>
        ) : (
          visiveis.map((ambiente, indice) => {
            const completo = ambiente.total > 0 && ambiente.respondidos >= ambiente.total;
            const ehAtual = ambiente.nome === atual;
            return (
              <li
                key={ambiente.nome}
                id={`amb-op-${indice}`}
                role="option"
                aria-selected={ehAtual}
                title={ambiente.rotulo}
                className={`amb-lista-linha${ehAtual ? " is-atual" : ""}${completo ? " is-completo" : ""}${indice === realce ? " is-realce" : ""}`}
                onMouseMove={() => setRealce(indice)}
                onClick={() => escolher(ambiente.nome)}
              >
                <span className="amb-lista-nome">{nomeCurtoDe(ambiente.nome)}</span>
                {completo ? (
                  <span className="amb-lista-feito" aria-label="concluído">✓</span>
                ) : conta ? (
                  conta(ambiente)
                ) : (
                  <span className="amb-lista-conta">
                    {ambiente.respondidos}/{ambiente.total}
                    <span className="sr-only"> respondidas</span>
                  </span>
                )}
                {ambiente.naoConformes > 0 && <span className="sr-only">{ambiente.naoConformes === 1 ? ", 1 não conformidade" : `, ${ambiente.naoConformes} não conformidades`}</span>}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );

  return (
    <div className={`amb-seletor${aberto ? " is-aberto" : ""} ${classe}`.trim()} ref={raizRef}>
      {renderBotao({
        aberto,
        alternar: () => {
          if (aberto) {
            fechar();
            return;
          }
          origemRef.current = document.activeElement as HTMLElement | null;
          setAberto(true);
        },
      })}
      {aberto && pronto && lista && createPortal(lista, document.body)}
    </div>
  );
}
