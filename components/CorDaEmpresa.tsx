"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { PALETA_EMPRESA } from "@/lib/empresaCor";

type BolinhasProps = {
  valor: string;
  onEscolher: (cor: string) => void;
  /** "janela": 4 por 2 de 30px; "folha": 4 por 2 de 44px com o nome embaixo; "linha": fileira simples (formulário). */
  variante?: "janela" | "folha" | "linha";
  rotulo?: string;
};

// Bolinhas da paleta fixa. Cada uma tem nome acessível e responde ao teclado (Tab e Enter/Espaço).
export function BolinhasDeCor({ valor, onEscolher, variante = "linha", rotulo = "Cor da empresa" }: BolinhasProps) {
  return (
    <div className={`cor-bolinhas cor-bolinhas--${variante}`} role="group" aria-label={rotulo}>
      {PALETA_EMPRESA.map((opcao) => {
        const marcada = valor.toUpperCase() === opcao.hex;
        return (
          <button
            key={opcao.hex}
            type="button"
            className={`cor-bolinha${marcada ? " is-on" : ""}`}
            aria-label={opcao.nome}
            aria-pressed={marcada}
            title={opcao.nome}
            data-cor={opcao.hex}
            onClick={() => onEscolher(opcao.hex)}
          >
            <span className="cor-bolinha-disco" style={{ background: opcao.hex }} />
            {variante === "folha" && <span className="cor-bolinha-nome">{opcao.nome}</span>}
          </button>
        );
      })}
    </div>
  );
}

type JanelaProps = {
  nome: string;
  iniciais: string;
  cor: string;
  /** Posição do avatar tocado (PC e tablet: a janelinha abre logo abaixo dele). */
  ancora: { left: number; top: number; bottom: number } | null;
  onEscolher: (cor: string) => void;
  onFechar: () => void;
};

const LARGURA_JANELA = 204;

// Escolha da cor da empresa: janelinha ancorada no avatar (PC e tablet) ou folha de baixo para cima (celular).
export function CorDaEmpresaJanela({ nome, iniciais, cor, ancora, onEscolher, onFechar }: JanelaProps) {
  const [celular, setCelular] = useState(() => (typeof window === "undefined" ? false : window.matchMedia("(max-width: 767px)").matches));
  const raiz = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const consulta = window.matchMedia("(max-width: 767px)");
    const mudou = () => setCelular(consulta.matches);
    consulta.addEventListener("change", mudou);
    return () => consulta.removeEventListener("change", mudou);
  }, []);

  useEffect(() => {
    const aoTecla = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", aoTecla);
    window.addEventListener("resize", onFechar);
    window.addEventListener("scroll", onFechar, true);
    return () => {
      window.removeEventListener("keydown", aoTecla);
      window.removeEventListener("resize", onFechar);
      window.removeEventListener("scroll", onFechar, true);
    };
  }, [onFechar]);

  useEffect(() => {
    const alvo = raiz.current?.querySelector<HTMLButtonElement>(".cor-bolinha.is-on") || raiz.current?.querySelector<HTMLButtonElement>(".cor-bolinha");
    alvo?.focus();
  }, []);

  const escolher = (nova: string) => {
    onEscolher(nova);
    onFechar();
  };

  if (celular) {
    return createPortal(
      <div className="cor-fundo cor-fundo--folha" onClick={onFechar}>
        <div ref={raiz} className="cor-folha" role="dialog" aria-label="Cor da empresa" onClick={(evento) => evento.stopPropagation()}>
          <span className="cor-folha-alca" aria-hidden="true" />
          <div className="cor-folha-topo">
            <span className="cor-folha-avatar" style={{ "--emp-cor": cor } as CSSProperties} aria-hidden="true">
              {iniciais}
            </span>
            <span className="cor-folha-textos">
              <span className="cor-folha-titulo">Cor da empresa</span>
              <span className="cor-folha-nome">{nome}</span>
            </span>
          </div>
          <BolinhasDeCor valor={cor} onEscolher={escolher} variante="folha" />
        </div>
      </div>,
      document.body
    );
  }

  const esquerda = ancora ? Math.max(8, Math.min(ancora.left, window.innerWidth - LARGURA_JANELA - 8)) : 8;
  const topo = ancora ? ancora.bottom + 8 : 80;
  return createPortal(
    <div className="cor-fundo" onClick={onFechar}>
      <div ref={raiz} className="cor-janela" role="dialog" aria-label="Cor da empresa" style={{ left: esquerda, top: topo, width: LARGURA_JANELA }} onClick={(evento) => evento.stopPropagation()}>
        <span className="cor-janela-titulo">Cor da empresa</span>
        <BolinhasDeCor valor={cor} onEscolher={escolher} variante="janela" />
      </div>
    </div>,
    document.body
  );
}
