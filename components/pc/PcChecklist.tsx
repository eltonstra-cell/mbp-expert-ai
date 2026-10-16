"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { InfoAmbiente } from "@/lib/checklistEnvs";
import type { ChecklistStatus } from "@/types";

export type ItemDaFila = { id: string; status: ChecklistStatus };

export type ApoioDoItem = {
  /** Orientação do item ("O que verificar"). */
  orientacao?: string;
  /** Referência e, se existir nos dados, o trecho da norma. */
  baseLegal?: { referencia: string; trecho?: string };
  /** POP sugerido para o critério do item. */
  pop?: { codigo: string; titulo: string; situacao: string };
  /** Resultado do mesmo item na visita anterior da empresa. */
  ultimaVisita?: { data: string; status: string; observacao: string };
  evidencias: { id: string; url: string; tipo: string; nome: string }[];
};

type Props = {
  titulo: string;
  subtitulo: string;
  ambientes: InfoAmbiente[];
  ambienteAtual: string;
  onAmbiente: (nome: string) => void;
  fila: ItemDaFila[];
  itemAtualId: string;
  onItem: (id: string) => void;
  onVoltar: () => void;
  principal: ReactNode;
  apoio: ApoioDoItem;
};

const CLASSE_DO_STATUS: Record<ChecklistStatus, string> = {
  Conforme: "is-ok",
  "Não Conforme": "is-nc",
  "Não se aplica": "is-na",
  Pendente: "is-pend",
};

const SITUACAO_DO_POP: Record<string, string> = {
  "a-criar": "ainda não criado",
  rascunho: "em rascunho",
  aprovado: "aprovado",
};

// Abas de ambiente numa faixa só; os que não cabem ficam no "+ N ambientes".
function AbasDeAmbiente({ ambientes, atual, onSelecionar }: { ambientes: InfoAmbiente[]; atual: string; onSelecionar: (nome: string) => void }) {
  const faixaRef = useRef<HTMLDivElement | null>(null);
  const [cabem, setCabem] = useState(ambientes.length);
  const [aberto, setAberto] = useState(false);

  useLayoutEffect(() => {
    const faixa = faixaRef.current;
    if (!faixa) return;
    const medir = () => {
      const filhos = [...faixa.querySelectorAll<HTMLElement>("[data-aba]")];
      if (filhos.length === 0) return;
      const reservaDoMais = 120;
      let soma = 0;
      let quantas = 0;
      for (const filho of filhos) {
        soma += filho.offsetWidth + 8;
        if (soma > faixa.clientWidth - (filhos.length > quantas + 1 ? reservaDoMais : 0)) break;
        quantas += 1;
      }
      setCabem(Math.max(1, quantas));
    };
    medir();
    if (typeof ResizeObserver === "undefined") return;
    const observador = new ResizeObserver(medir);
    observador.observe(faixa);
    return () => observador.disconnect();
  }, [ambientes]);

  useEffect(() => {
    if (!aberto) return;
    const fechar = () => setAberto(false);
    window.addEventListener("mousedown", fechar);
    return () => window.removeEventListener("mousedown", fechar);
  }, [aberto]);

  const indiceAtual = ambientes.findIndex((info) => info.nome === atual);
  // O ambiente atual nunca fica escondido: entra no lugar da última aba visível.
  const visiveis = ambientes.slice(0, cabem);
  if (indiceAtual >= cabem && cabem > 0) visiveis[cabem - 1] = ambientes[indiceAtual];
  const escondidos = ambientes.filter((info) => !visiveis.includes(info));

  return (
    <div className="chk-pc-abas" role="tablist" aria-label="Ambientes">
      <div className="chk-pc-abas-faixa" ref={faixaRef}>
        {(cabem >= ambientes.length ? ambientes : visiveis).map((info) => (
          <button
            key={info.nome}
            type="button"
            role="tab"
            data-aba={info.nome}
            aria-selected={info.nome === atual}
            className={`chk-pc-aba${info.nome === atual ? " is-on" : ""}${info.naoConformes > 0 ? " tem-nc" : ""}`}
            onClick={() => onSelecionar(info.nome)}
          >
            <span>{info.rotulo}</span>
            <span className="chk-pc-aba-n">
              {info.respondidos}/{info.total}
            </span>
          </button>
        ))}
        {/* Mede todas as abas antes de decidir quantas cabem. */}
        {cabem < ambientes.length &&
          ambientes.slice(cabem).map((info) => (
            <span key={`medida-${info.nome}`} data-aba={info.nome} className="chk-pc-aba chk-pc-aba--medida" aria-hidden="true">
              {info.rotulo} {info.respondidos}/{info.total}
            </span>
          ))}
      </div>
      {escondidos.length > 0 && (
        <div className="chk-pc-mais" onMouseDown={(evento) => evento.stopPropagation()}>
          <button type="button" className="chk-pc-aba" aria-haspopup="menu" aria-expanded={aberto} onClick={() => setAberto((atualAberto) => !atualAberto)}>
            + {escondidos.length} ambiente{escondidos.length === 1 ? "" : "s"}
          </button>
          {aberto && (
            <div className="chk-pc-mais-lista" role="menu">
              {escondidos.map((info) => (
                <button
                  key={info.nome}
                  type="button"
                  role="menuitem"
                  className="ui-menu-item"
                  onClick={() => {
                    setAberto(false);
                    onSelecionar(info.nome);
                  }}
                >
                  {info.rotulo} · {info.respondidos}/{info.total}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CartaoDeApoio({ titulo, tom, children }: { titulo: string; tom: string; children: ReactNode }) {
  return (
    <section className={`chk-apoio-cartao chk-apoio-cartao--${tom}`}>
      <h3 className="chk-apoio-titulo">{titulo}</h3>
      {children}
    </section>
  );
}

// Cada cartão só aparece se houver dado real para ele.
function PainelDeApoio({ apoio }: { apoio: ApoioDoItem }) {
  const vazio = !apoio.orientacao && !apoio.baseLegal && !apoio.pop && !apoio.ultimaVisita && apoio.evidencias.length === 0;
  return (
    <aside className="chk-apoio" aria-label="Apoio ao item">
      {apoio.orientacao && (
        <CartaoDeApoio titulo="O que verificar" tom="azul">
          <p className="chk-apoio-texto">{apoio.orientacao}</p>
        </CartaoDeApoio>
      )}
      {apoio.baseLegal && (
        <CartaoDeApoio titulo="Base legal" tom="ambar">
          <p className="chk-apoio-texto">{apoio.baseLegal.referencia}</p>
          {apoio.baseLegal.trecho && <p className="chk-apoio-texto">{apoio.baseLegal.trecho}</p>}
        </CartaoDeApoio>
      )}
      {apoio.pop && (
        <CartaoDeApoio titulo="POP relacionado" tom="violeta">
          <p className="chk-apoio-texto">
            {apoio.pop.codigo ? `${apoio.pop.codigo} · ` : ""}
            {apoio.pop.titulo}
          </p>
          <p className="ui-row-sub">{SITUACAO_DO_POP[apoio.pop.situacao] ? `POP ${SITUACAO_DO_POP[apoio.pop.situacao]}` : ""}</p>
        </CartaoDeApoio>
      )}
      {apoio.ultimaVisita && (
        <CartaoDeApoio titulo="Na última visita" tom="turquesa">
          <p className="chk-apoio-texto">
            {apoio.ultimaVisita.status} · {apoio.ultimaVisita.data}
          </p>
          {apoio.ultimaVisita.observacao && <p className="chk-apoio-texto">{apoio.ultimaVisita.observacao}</p>}
        </CartaoDeApoio>
      )}
      {apoio.evidencias.length > 0 && (
        <CartaoDeApoio titulo="Evidências deste item" tom="verde">
          <div className="chk-apoio-fotos">
            {apoio.evidencias.slice(0, 6).map((evidencia) =>
              evidencia.tipo === "Foto" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={evidencia.id} src={evidencia.url} alt={evidencia.nome} className="chk-apoio-foto" />
              ) : (
                <span key={evidencia.id} className="chk-apoio-foto chk-apoio-foto--audio">
                  Áudio
                </span>
              )
            )}
          </div>
        </CartaoDeApoio>
      )}
      {vazio && <p className="ui-row-sub">Sem material de apoio para este item.</p>}
    </aside>
  );
}

export default function PcChecklist({ titulo, subtitulo, ambientes, ambienteAtual, onAmbiente, fila, itemAtualId, onItem, onVoltar, principal, apoio }: Props) {
  return (
    <section className="ui-screen chk-pc" aria-label="Checklist">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">{titulo}</h1>
          <p className="ui-subtitle">{subtitulo}</p>
        </div>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
          ← Central da visita
        </button>
      </div>

      <AbasDeAmbiente ambientes={ambientes} atual={ambienteAtual} onSelecionar={onAmbiente} />

      <div className="chk-pc-fila" role="group" aria-label="Itens do ambiente">
        {fila.map((item, indice) => (
          <button
            key={item.id}
            type="button"
            className={`chk-pc-num ${CLASSE_DO_STATUS[item.status]}${item.id === itemAtualId ? " is-atual" : ""}`}
            aria-current={item.id === itemAtualId ? "true" : undefined}
            aria-label={`Item ${indice + 1}: ${item.status}`}
            onClick={() => onItem(item.id)}
          >
            {indice + 1}
          </button>
        ))}
      </div>

      <div className="chk-pc-corpo">
        <div className="chk-pc-principal">{principal}</div>
        <PainelDeApoio apoio={apoio} />
      </div>
    </section>
  );
}
