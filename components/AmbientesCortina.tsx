"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { filtrarAmbientes, resumoDaJanelaDeAmbientes, rotulosCurtosDosAmbientes, type InfoAmbiente } from "@/lib/checklistEnvs";

type Props = {
  ambientes: InfoAmbiente[];
  atual: string | null;
  onSelecionar: (nome: string) => void;
  /** O botão que abre a janela (o seletor do ambiente atual). */
  renderBotao: (estado: { aberto: boolean; alternar: () => void }) => ReactNode;
  /** Classe extra na raiz do seletor. */
  classe?: string;
};

const FOCAVEIS = 'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Janela de ambientes do checklist: "Ambientes · N ambientes · M concluídos", busca e UMA LINHA DE 44 px por ambiente (✓ no concluído, "respondidas/total" nos demais,
 * o atual em destaque). No PC abre como painel à direita; no tablet e no celular, de baixo (a troca é só de CSS, `.amb-janela`). Escolher fecha e volta.
 * Fica num portal no corpo da página para não depender da altura de quem a chama.
 */
export default function AmbientesCortina({ ambientes, atual, onSelecionar, renderBotao, classe = "" }: Props) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [pronto, setPronto] = useState(false);
  const janelaRef = useRef<HTMLDivElement | null>(null);
  const buscaRef = useRef<HTMLInputElement | null>(null);
  const atualRef = useRef<HTMLButtonElement | null>(null);
  const origemRef = useRef<HTMLElement | null>(null);

  useEffect(() => setPronto(true), []);

  const fechar = () => {
    setAberto(false);
    setBusca("");
    // O foco volta ao seletor que abriu a janela.
    origemRef.current?.focus();
  };

  useEffect(() => {
    if (!aberto) return;
    // No toque, focar a busca abriria o teclado por cima da lista: só o mouse e o teclado físico começam na busca.
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) buscaRef.current?.focus();
    else janelaRef.current?.focus();
    atualRef.current?.scrollIntoView({ block: "nearest" });
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        evento.preventDefault();
        fechar();
        return;
      }
      if (evento.key !== "Tab" || !janelaRef.current) return;
      const alvos = [...janelaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS)];
      if (alvos.length === 0) return;
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      if (evento.shiftKey && (document.activeElement === primeiro || document.activeElement === janelaRef.current)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const visiveis = filtrarAmbientes(ambientes, busca);
  const nomesCurtos = rotulosCurtosDosAmbientes(ambientes.map((ambiente) => ambiente.rotulo));
  const nomeCurtoDe = (nome: string) => nomesCurtos[ambientes.findIndex((ambiente) => ambiente.nome === nome)] || nome;

  const janela = (
    <div className="amb-janela-camada">
      <button type="button" className="amb-janela-fundo" tabIndex={-1} aria-label="Fechar a lista de ambientes" onClick={fechar} />
      <div className="amb-janela" role="dialog" aria-modal="true" aria-label="Escolher ambiente" tabIndex={-1} ref={janelaRef}>
        <span className="amb-janela-alca" aria-hidden="true" />
        <header className="amb-janela-topo">
          <div className="amb-janela-titulos">
            <h2 className="amb-janela-titulo">Ambientes</h2>
            <p className="amb-janela-resumo">{resumoDaJanelaDeAmbientes(ambientes)}</p>
          </div>
          <button type="button" className="amb-janela-fechar" aria-label="Fechar" onClick={fechar}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" focusable="false">
              <path d="M4 4l10 10M14 4L4 14" />
            </svg>
          </button>
        </header>
        <label className="amb-janela-busca">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true" focusable="false">
            <circle cx="8" cy="8" r="5.2" />
            <path d="M12 12l3.6 3.6" />
          </svg>
          <input ref={buscaRef} type="search" placeholder="Buscar ambiente" aria-label="Buscar ambiente" value={busca} onChange={(evento) => setBusca(evento.target.value)} />
        </label>
        <ul className="amb-janela-lista">
          {visiveis.length === 0 ? (
            <li className="amb-janela-vazio">Nenhum ambiente encontrado</li>
          ) : (
            visiveis.map((ambiente) => {
              const completo = ambiente.total > 0 && ambiente.respondidos >= ambiente.total;
              const ehAtual = ambiente.nome === atual;
              return (
                <li key={ambiente.nome}>
                  <button
                    type="button"
                    ref={ehAtual ? atualRef : undefined}
                    className={`amb-janela-linha${ehAtual ? " is-atual" : ""}${completo ? " is-completo" : ""}`}
                    aria-current={ehAtual ? "true" : undefined}
                    title={ambiente.rotulo}
                    onClick={() => {
                      fechar();
                      onSelecionar(ambiente.nome);
                    }}
                  >
                    <span className="amb-janela-nome">{nomeCurtoDe(ambiente.nome)}</span>
                    {completo ? (
                      <span className="amb-janela-feito" aria-label={`${ambiente.rotulo} concluído`}>✓</span>
                    ) : (
                      <span className="amb-janela-conta">
                        {ambiente.respondidos}/{ambiente.total}
                        <span className="sr-only"> respondidas</span>
                      </span>
                    )}
                    {ambiente.naoConformes > 0 && <span className="sr-only">{ambiente.naoConformes === 1 ? ", 1 não conformidade" : `, ${ambiente.naoConformes} não conformidades`}</span>}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <div className={`amb-seletor ${classe}`.trim()}>
      {renderBotao({
        aberto,
        alternar: () => {
          if (!aberto) origemRef.current = document.activeElement as HTMLElement | null;
          setAberto((valor) => !valor);
        },
      })}
      {aberto && pronto && createPortal(janela, document.body)}
    </div>
  );
}
