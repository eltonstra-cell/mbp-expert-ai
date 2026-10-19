"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { InfoAmbiente } from "@/lib/checklistEnvs";

type Props = {
  ambientes: InfoAmbiente[];
  atual: string | null;
  onSelecionar: (nome: string) => void;
  /** O botão que abre e fecha a cortina (o seletor do ambiente atual). */
  renderBotao: (estado: { aberto: boolean; alternar: () => void }) => ReactNode;
  /** `seletor--pc` ancora a cortina na linha inteira em vez de no botão. */
  classe?: string;
};

/** Cortina com UMA LINHA POR AMBIENTE: nome | barra | respondidos | selo de NCs. Nome nunca cortado. */
export default function AmbientesCortina({ ambientes, atual, onSelecionar, renderBotao, classe = "" }: Props) {
  const [aberto, setAberto] = useState(false);
  const raizRef = useRef<HTMLDivElement | null>(null);
  const cortinaRef = useRef<HTMLDivElement | null>(null);

  // A cortina nunca passa do espaço que existe: sem rolagem para 12 ambientes quando couber.
  useLayoutEffect(() => {
    if (!aberto) return;
    const ajustar = () => {
      const cortina = cortinaRef.current;
      if (!cortina) return;
      const limite = cortina.closest<HTMLElement>(".campo-tela--fixa")?.getBoundingClientRect().bottom ?? window.innerHeight;
      const reservaDaBarra = document.documentElement.dataset.modo === "campo" && !cortina.closest(".campo-tela--fixa") ? 92 : 0;
      cortina.style.maxHeight = `${Math.max(160, limite - cortina.getBoundingClientRect().top - 10 - reservaDaBarra)}px`;
    };
    ajustar();
    window.addEventListener("resize", ajustar);
    return () => window.removeEventListener("resize", ajustar);
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setAberto(false);
    };
    const aoTocarFora = (evento: Event) => {
      if (raizRef.current && !raizRef.current.contains(evento.target as Node)) setAberto(false);
    };
    window.addEventListener("keydown", aoTeclar);
    window.addEventListener("mousedown", aoTocarFora);
    window.addEventListener("touchstart", aoTocarFora, { passive: true });
    return () => {
      window.removeEventListener("keydown", aoTeclar);
      window.removeEventListener("mousedown", aoTocarFora);
      window.removeEventListener("touchstart", aoTocarFora);
    };
  }, [aberto]);

  return (
    <div className={`amb-seletor ${classe}`.trim()} ref={raizRef}>
      {renderBotao({ aberto, alternar: () => setAberto((valor) => !valor) })}
      {aberto && (
        <div className="amb-cortina" role="dialog" aria-label="Escolher ambiente" ref={cortinaRef}>
          <ul className="amb-lista">
            {ambientes.map((ambiente) => {
              const percentual = ambiente.total ? Math.round((ambiente.respondidos / ambiente.total) * 100) : 0;
              const completo = ambiente.total > 0 && ambiente.respondidos >= ambiente.total;
              return (
                <li key={ambiente.nome} className="amb-item">
                  <button
                    type="button"
                    className={`amb-linha${ambiente.nome === atual ? " is-atual" : ""}${completo ? " is-completo" : ""}`}
                    aria-current={ambiente.nome === atual ? "true" : undefined}
                    onClick={() => {
                      setAberto(false);
                      onSelecionar(ambiente.nome);
                    }}
                  >
                    <span className="amb-nome">{ambiente.rotulo}</span>
                    <span className="amb-barra" aria-hidden="true">
                      <span style={{ width: `${percentual}%` }} />
                    </span>
                    <span className="amb-cnt">
                      {completo && (
                        <span className="amb-check" aria-label="completo">
                          ✓
                        </span>
                      )}
                      {ambiente.respondidos}/{ambiente.total}
                      <span className="amb-cnt-longo"> respondidos</span>
                    </span>
                    {ambiente.naoConformes > 0 ? (
                      <span className="amb-selo">
                        {ambiente.naoConformes} NC{ambiente.naoConformes === 1 ? "" : "s"}
                      </span>
                    ) : (
                      <span className="amb-sem">Sem NCs</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
