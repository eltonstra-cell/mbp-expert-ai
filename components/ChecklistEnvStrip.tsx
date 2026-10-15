"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  agruparPorSituacao,
  filtrarAmbientes,
  quantidadeDeAmbientes,
  type InfoAmbiente,
} from "@/lib/checklistEnvs";

type Props = {
  ambientes: InfoAmbiente[];
  atual: string | null;
  onSelecionar: (nome: string) => void;
};

type Modo = "situacao" | "ordem";

// Faixa de pílulas em ordem FIXA (a da visita) com o painel "Ver todos".
export default function ChecklistEnvStrip({ ambientes, atual, onSelecionar }: Props) {
  const [painelAberto, setPainelAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [modo, setModo] = useState<Modo>("situacao");
  const rolagemRef = useRef<HTMLDivElement | null>(null);
  const raizRef = useRef<HTMLDivElement | null>(null);
  const buscaRef = useRef<HTMLInputElement | null>(null);

  // Ao trocar de ambiente, a faixa rola sozinha até o atual.
  useEffect(() => {
    const rolagem = rolagemRef.current;
    if (!rolagem || !atual) return;
    const pilula = [...rolagem.querySelectorAll<HTMLElement>("[data-env]")].find((el) => el.dataset.env === atual);
    if (!pilula) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rolagem.scrollTo({
      left: pilula.offsetLeft - (rolagem.clientWidth - pilula.offsetWidth) / 2,
      behavior: reduzir ? "auto" : "smooth",
    });
  }, [atual]);

  useEffect(() => {
    if (!painelAberto) return;
    buscaRef.current?.focus();
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setPainelAberto(false);
    };
    const aoClicarFora = (evento: MouseEvent) => {
      if (raizRef.current && !raizRef.current.contains(evento.target as Node)) setPainelAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("mousedown", aoClicarFora);
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("mousedown", aoClicarFora);
    };
  }, [painelAberto]);

  const rolarFaixa = (direcao: 1 | -1) => {
    const rolagem = rolagemRef.current;
    if (!rolagem) return;
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    rolagem.scrollBy({ left: direcao * rolagem.clientWidth * 0.7, behavior: reduzir ? "auto" : "smooth" });
  };

  const filtrados = useMemo(() => filtrarAmbientes(ambientes, busca), [ambientes, busca]);
  const grupos = useMemo(() => agruparPorSituacao(filtrados), [filtrados]);
  const total = quantidadeDeAmbientes(ambientes);

  const escolher = (nome: string) => {
    setPainelAberto(false);
    setBusca("");
    onSelecionar(nome);
  };

  const celula = (info: InfoAmbiente) => (
    <button
      key={info.nome}
      type="button"
      className={`pc-env-cell${atual === info.nome ? " is-active" : ""}`}
      aria-current={atual === info.nome ? "true" : undefined}
      onClick={() => escolher(info.nome)}
    >
      {info.situacao === "nc" && <i className="pc-env-dot" aria-hidden="true" />}
      <span className="pc-env-cell-name">{info.rotulo}</span>
      <span className="pc-env-cell-count">
        {info.respondidos}/{info.total}
      </span>
    </button>
  );

  return (
    <div className="pc-envstrip" ref={raizRef}>
      <div className="pc-envbar">
        <button type="button" className="pc-env-arrow" aria-label="Rolar ambientes para a esquerda" onClick={() => rolarFaixa(-1)}>
          ‹
        </button>
        <div className="pc-env-scroll" ref={rolagemRef} role="list" aria-label="Ambientes da visita">
          {ambientes.map((info) => (
            <button
              key={info.nome}
              type="button"
              role="listitem"
              data-env={info.nome}
              className={`pc-env-pill${atual === info.nome ? " is-active" : ""}`}
              aria-current={atual === info.nome ? "true" : undefined}
              onClick={() => onSelecionar(info.nome)}
            >
              {info.situacao === "nc" && <i className="pc-env-dot" aria-label="com não conformidade" />}
              {info.rotulo}
            </button>
          ))}
        </div>
        <button type="button" className="pc-env-arrow" aria-label="Rolar ambientes para a direita" onClick={() => rolarFaixa(1)}>
          ›
        </button>
        <button
          type="button"
          className="pc-env-all"
          aria-expanded={painelAberto}
          aria-haspopup="dialog"
          onClick={() => setPainelAberto((aberto) => !aberto)}
        >
          Ver todos ({total}) ▾
        </button>
      </div>

      {painelAberto && (
        <div className="pc-env-panel" role="dialog" aria-label="Todos os ambientes">
          <div className="pc-env-panel-head">
            <input
              ref={buscaRef}
              type="search"
              className="pc-env-search"
              placeholder="Buscar ambiente"
              aria-label="Buscar ambiente"
              value={busca}
              onChange={(evento) => setBusca(evento.target.value)}
            />
            <div className="pc-env-toggle" role="group" aria-label="Ordenar ambientes">
              <button type="button" className={modo === "ordem" ? "is-active" : ""} aria-pressed={modo === "ordem"} onClick={() => setModo("ordem")}>
                Ordem da visita
              </button>
              <button type="button" className={modo === "situacao" ? "is-active" : ""} aria-pressed={modo === "situacao"} onClick={() => setModo("situacao")}>
                Por situação
              </button>
            </div>
            <button type="button" className="pc-env-close" onClick={() => setPainelAberto(false)}>
              Fechar
            </button>
          </div>
          <div className="pc-env-panel-body">
            {modo === "situacao" ? (
              grupos.map((grupo) => (
                <section key={grupo.situacao} className="pc-env-group">
                  <h3 className="pc-env-group-title">
                    {grupo.rotulo} <span>({grupo.itens.length})</span>
                  </h3>
                  {grupo.itens.length === 0 ? (
                    <p className="pc-env-none">Nenhum ainda</p>
                  ) : (
                    <div className="pc-env-grid">{grupo.itens.map(celula)}</div>
                  )}
                </section>
              ))
            ) : filtrados.length === 0 ? (
              <p className="pc-env-none">Nenhum ambiente encontrado</p>
            ) : (
              <div className="pc-env-grid">{filtrados.map(celula)}</div>
            )}
            {modo === "situacao" && filtrados.length === 0 && <p className="pc-env-none">Nenhum ambiente encontrado</p>}
          </div>
        </div>
      )}
    </div>
  );
}
