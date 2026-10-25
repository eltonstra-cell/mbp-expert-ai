"use client";

import { useState, type ReactNode } from "react";
import FotoAmpliada from "@/components/FotoAmpliada";
import AmbientesCortina from "@/components/AmbientesCortina";
import type { InfoAmbiente } from "@/lib/checklistEnvs";
import { progressoDaCaminhada, textoDaCaminhada } from "@/lib/caminhada";
import { legendaDaEvidencia, rotuloDoSegmento } from "@/lib/checklistSegmentos";
import type { ChecklistStatus } from "@/types";

export type ItemDaFila = { id: string; status: ChecklistStatus; /** Reprovou nas últimas visitas. */ reprovou?: boolean; /** Não se aplica em todas as visitas recentes: fica no bloco recolhido. */ recolhido?: boolean };

export type ApoioDoItem = {
  /** De onde vem a pergunta ("Derivada do Manual, cap. 1, item 2.5", "Parcial: …" ou "Fonte não registrada"). */
  fonte?: string;
  /** Orientação do item ("O que verificar"). */
  orientacao?: string;
  /** Referência e, se existir nos dados, o trecho da norma. */
  baseLegal?: { referencia: string; trecho?: string };
  /** POP sugerido para o critério do item. */
  pop?: { codigo: string; titulo: string; situacao: string };
  /** "Pela 2ª vez": só quando o item está Não conforme e o critério já reprovou antes. */
  reincidencia?: string;
  /** Resultado do mesmo item na visita anterior da empresa. */
  ultimaVisita?: { data: string; status: string; observacao: string };
  evidencias: { id: string; url: string; tipo: string; nome: string; criadoEm?: string }[];
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
  /** Pular o ambiente atual: abre o próximo sem marcar nada (os itens ficam pendentes). */
  onPularAmbiente?: (proximo: string) => void;
  /** "Marcar o restante como Conforme" do ambiente atual; o número é quantos itens o lote marcaria. */
  restanteDoLote?: { quantos: number; onMarcar: () => void };
  /** "Ditar o ambiente" (voz com conferência). */
  ditado?: ReactNode;
  /** Sem apoio (tablet), o painel da direita não aparece. */
  apoio?: ApoioDoItem;
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

// Um único seletor ("Recebimento 9/12 ▾") que abre a cortina com uma linha por ambiente.
function SeletorDeAmbiente({
  ambientes,
  atual,
  posicao,
  total,
  onSelecionar,
}: {
  ambientes: InfoAmbiente[];
  atual: string;
  posicao: number;
  total: number;
  onSelecionar: (nome: string) => void;
}) {
  const info = ambientes.find((ambiente) => ambiente.nome === atual);
  return (
    <AmbientesCortina
      ambientes={ambientes}
      atual={atual}
      onSelecionar={onSelecionar}
      classe="amb-seletor--pc"
      renderBotao={({ aberto, alternar }) => (
        <button type="button" className="chk-sel-botao" aria-haspopup="dialog" aria-expanded={aberto} onClick={alternar}>
          <span className="chk-sel-nome">{info?.rotulo || atual}</span>
          <span className="chk-sel-pos">
            {info ? `${info.respondidos}/${info.total}` : `${posicao}/${total}`} respondidos
          </span>
          <span aria-hidden="true">▾</span>
        </button>
      )}
    />
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
  const [ampliadaId, setAmpliadaId] = useState<string | null>(null);
  const ampliada = apoio.evidencias.find((evidencia) => evidencia.id === ampliadaId && evidencia.tipo === "Foto");
  const vazio = !apoio.reincidencia && !apoio.orientacao && !apoio.baseLegal && !apoio.pop && !apoio.ultimaVisita && apoio.evidencias.length === 0;
  return (
    <aside className="chk-apoio" aria-label="Apoio ao item">
      {apoio.fonte && <p className="chk-apoio-fonte">Fonte: {apoio.fonte}</p>}
      {apoio.reincidencia && (
        <CartaoDeApoio titulo="Reincidência" tom="ambar">
          <p className="chk-apoio-texto">{apoio.reincidencia}</p>
        </CartaoDeApoio>
      )}
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
            {apoio.evidencias.slice(0, 6).map((evidencia) => {
              const legenda = legendaDaEvidencia(evidencia.tipo, evidencia.criadoEm || "");
              return evidencia.tipo === "Foto" ? (
                <figure key={evidencia.id} className="chk-apoio-evid">
                  <button type="button" className="chk-apoio-foto-botao" onClick={() => setAmpliadaId(evidencia.id)} aria-label="Ampliar foto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={evidencia.url} alt="Foto do item" className="chk-apoio-foto" />
                  </button>
                  <figcaption>{legenda}</figcaption>
                </figure>
              ) : (
                <figure key={evidencia.id} className="chk-apoio-evid">
                  <span className="chk-apoio-foto chk-apoio-foto--audio" aria-hidden="true">
                    {evidencia.tipo === "Áudio" ? "🎙" : "📄"}
                  </span>
                  <figcaption>{legenda}</figcaption>
                </figure>
              );
            })}
          </div>
        </CartaoDeApoio>
      )}
      {vazio && <p className="ui-row-sub">Sem material de apoio para este item.</p>}
      {ampliada && <FotoAmpliada url={ampliada.url} descricao={ampliada.nome} onFechar={() => setAmpliadaId(null)} />}
    </aside>
  );
}

export default function PcChecklist({ titulo, subtitulo, ambientes, ambienteAtual, onAmbiente, fila, itemAtualId, onItem, onVoltar, principal, apoio, onPularAmbiente, restanteDoLote, ditado }: Props) {
  const [recolhidosAbertos, setRecolhidosAbertos] = useState(false);
  const caminhada = progressoDaCaminhada(ambientes, ambienteAtual);
  const recolhidos = fila.filter((item) => item.recolhido && item.id !== itemAtualId);
  const textoCaminhada = textoDaCaminhada(caminhada);
  return (
    <section className="ui-screen chk-pc" aria-label="Checklist">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">{titulo}</h1>
          <p className="ui-subtitle">{subtitulo}</p>
          {(ditado || (restanteDoLote && restanteDoLote.quantos > 0)) && (
            <div className="chk-acoes-ambiente">
              {ditado}
              {restanteDoLote && restanteDoLote.quantos > 0 && (
                <button type="button" className="chk-acao chk-acao--conforme" onClick={restanteDoLote.onMarcar}>
                  Marcar o restante como Conforme ({restanteDoLote.quantos})
                </button>
              )}
            </div>
          )}
          {textoCaminhada && (
            <p className="chk-caminhada" role="status">
              {textoCaminhada}
              {onPularAmbiente && caminhada.nomeDoProximo && (
                <>
                  {" · "}
                  <button type="button" className="pc-link-btn" onClick={() => onPularAmbiente(caminhada.nomeDoProximo as string)}>Pular ambiente</button>
                </>
              )}
            </p>
          )}
        </div>
        <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
          ← Central da visita
        </button>
      </div>

      <div className="chk-pc-linha">
        <SeletorDeAmbiente
          ambientes={ambientes}
          atual={ambienteAtual}
          posicao={Math.max(1, fila.findIndex((item) => item.id === itemAtualId) + 1)}
          total={fila.length}
          onSelecionar={onAmbiente}
        />
        <div className="chk-pc-fila" role="group" aria-label="Itens do ambiente">
          {fila.map((item, indice) =>
            item.recolhido && !recolhidosAbertos && item.id !== itemAtualId ? null : (
              <button
                key={item.id}
                type="button"
                className={`chk-pc-num ${CLASSE_DO_STATUS[item.status]}${item.id === itemAtualId ? " is-atual" : ""}${item.reprovou ? " is-reprovou" : ""}`}
                aria-current={item.id === itemAtualId ? "true" : undefined}
                aria-label={`${rotuloDoSegmento(indice, item.status)}${item.reprovou ? ". Reprovou nas últimas visitas" : ""}`}
                title={item.reprovou ? "Reprovou nas últimas visitas" : undefined}
                onClick={() => onItem(item.id)}
              >
                {indice + 1}
              </button>
            )
          )}
          {recolhidos.length > 0 && (
            <button type="button" className="pc-link-btn chk-pc-recolhidos" aria-expanded={recolhidosAbertos} onClick={() => setRecolhidosAbertos((aberto) => !aberto)}>
              {recolhidosAbertos ? "Recolher" : `${recolhidos.length} ${recolhidos.length === 1 ? "item recolhido" : "itens recolhidos"}`} {recolhidosAbertos ? "▴" : "▾"}
            </button>
          )}
        </div>
      </div>

      <div className={`chk-pc-corpo${apoio ? "" : " chk-pc-corpo--sem-apoio"}`}>
        <div className="chk-pc-principal">{principal}</div>
        {apoio && <PainelDeApoio apoio={apoio} />}
      </div>
    </section>
  );
}
