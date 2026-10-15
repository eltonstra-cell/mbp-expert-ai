"use client";

import { useState, type ReactNode } from "react";
import FieldVoiceTools from "@/components/FieldVoiceTools";
import { RowMenu } from "@/components/ui/RowMenu";
import { Pill } from "@/components/ui/Pill";
import { SegmentedTabs } from "@/components/ui/SegmentedTabs";
import { StatStrip } from "@/components/ui/StatStrip";

export type AnaliseEvidencia = {
  id: string;
  status: "Aguardando revisão" | "Confirmada" | "Descartada" | string;
  situacao: string;
  resumo: string;
  acao: string;
  textoRevisado: string;
  revisadoPor: string;
  podeRevisar: boolean;
};

export type CartaoEvidencia = {
  id: string;
  tipo: "Foto" | "Áudio";
  nome: string;
  descricao: string;
  ambiente: string;
  quando: string;
  url: string;
  possivelNc: boolean;
  analise: AnaliseEvidencia | null;
  podeAnalisar: boolean;
  analisando: boolean;
  bloqueioIA: boolean;
  mensagemIA: string;
  podeExcluir: boolean;
  onAnalisar: () => void;
  onConfirmar: (texto: string) => void;
  onDescartar: () => void;
  onExcluir: () => void;
};

type OpcaoItem = { id: string; rotulo: string };

type Props = {
  empresa: string;
  data: string;
  totais: { evidencias: number; fotos: number; audios: number; revisar: number };
  evidencias: CartaoEvidencia[];
  podeAdicionar: boolean;
  vinculo: { ambiente: string; item: string; temItem: boolean };
  ambientes: string[];
  itens: OpcaoItem[];
  ncs: OpcaoItem[];
  ambienteSel: string;
  itemSel: string;
  ncSel: string;
  onAmbiente: (valor: string) => void;
  onItem: (valor: string) => void;
  onNc: (valor: string) => void;
  descricao: string;
  onDescricao: (valor: string) => void;
  mensagem: string;
  onFoto: (arquivo: File | undefined) => void | Promise<void>;
  onAudio: (arquivo: File | undefined) => void;
  onVoltar: () => void;
};

type Aba = "todas" | "fotos" | "audios" | "revisar";

function CameraIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h3l1.6-2h6.8L17 8h3v11H4z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M6 10a6 6 0 0 0 12 0M12 16v5M9 21h6" />
    </svg>
  );
}

function Cartao({ ev, onAmpliar }: { ev: CartaoEvidencia; onAmpliar: (url: string, legenda: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState("");
  const analise = ev.analise;
  const aguardando = analise?.status === "Aguardando revisão";
  const mostrarFaixaIA = ev.tipo === "Foto" && ev.podeAnalisar && !aguardando;

  return (
    <article className="pc-ev-card">
      <div className="pc-ev-main">
        {ev.tipo === "Foto" ? (
          <button type="button" className="pc-ev-thumb" onClick={() => onAmpliar(ev.url, ev.descricao || ev.nome)} aria-label="Ampliar foto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {ev.url ? <img src={ev.url} alt={ev.descricao || "Evidência fotográfica"} /> : null}
          </button>
        ) : (
          <div className="pc-ev-audio">
            <audio controls src={ev.url} />
          </div>
        )}
        <div className="pc-ev-body">
          <div className="pc-ev-pills">
            <Pill tom="info">{ev.tipo}</Pill>
            <Pill tom="na">{ev.ambiente || "Sem ambiente"}</Pill>
            {aguardando && <Pill tom="lilas">IA aguardando revisão</Pill>}
            {ev.possivelNc && <Pill tom="nc">Possível NC</Pill>}
          </div>
          <div className="pc-ev-title">{ev.descricao || ev.nome}</div>
          <div className="ui-row-sub">
            {ev.nome} · {ev.quando}
          </div>
        </div>
        {ev.podeExcluir && (
          <RowMenu itens={[{ rotulo: "Excluir evidência", perigo: true, onClick: ev.onExcluir }]} />
        )}
      </div>

      {ev.mensagemIA && <div className="pc-ev-note">{ev.mensagemIA}</div>}

      {mostrarFaixaIA && (
        <div className="pc-ev-ai-strip">
          <span>Análise assistida por IA · não cria nem altera uma NC sozinha.</span>
          <button type="button" className="pc-ai-btn" disabled={ev.analisando || ev.bloqueioIA} onClick={ev.onAnalisar}>
            {ev.analisando ? "Analisando..." : analise ? "✦ Analisar novamente" : "✦ Analisar com IA"}
          </button>
        </div>
      )}

      {analise && (
        <div className="pc-ev-ai-box">
          <div className="pc-ev-pills">
            <Pill tom={analise.status === "Confirmada" ? "ok" : analise.status === "Descartada" ? "na" : "pend"}>{analise.status}</Pill>
            {analise.situacao && <Pill tom={analise.situacao === "Conforme" ? "ok" : analise.situacao === "Atenção" ? "pend" : analise.situacao === "Possível não conformidade" ? "nc" : "na"}>{analise.situacao}</Pill>}
          </div>
          <p className="pc-ev-summary">{analise.resumo}</p>
          {analise.acao && (
            <p className="ui-row-sub">
              Ação sugerida: {analise.acao}
            </p>
          )}
          {aguardando && analise.podeRevisar && (
            <>
              {editando && (
                <span className="ui-field-wrap ui-field-wrap--area">
                  <textarea className="ui-input pc-input-tools" rows={3} value={texto} onChange={(evento) => setTexto(evento.target.value)} aria-label="Texto da análise" />
                  <span className="ui-field-tools">
                    <FieldVoiceTools
                      fieldKey={`analise-${analise.id}`}
                      value={texto}
                      onChange={setTexto}
                      contexto="Texto técnico de análise de evidência fotográfica em segurança dos alimentos."
                    />
                  </span>
                </span>
              )}
              <div className="pc-ev-actions">
                <button type="button" className="ui-btn ui-btn--save ui-btn--small" onClick={() => ev.onConfirmar(editando ? texto : analise.textoRevisado)}>
                  Confirmar
                </button>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary ui-btn--small"
                  onClick={() => {
                    if (!editando) setTexto(analise.textoRevisado);
                    setEditando((aberto) => !aberto);
                  }}
                >
                  {editando ? "Fechar edição" : "Editar texto"}
                </button>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={ev.onDescartar}>
                  Descartar
                </button>
              </div>
            </>
          )}
          {aguardando && !analise.podeRevisar && <p className="ui-row-sub">Aguarda revisão de um Administrador ou Consultor/RT.</p>}
          {analise.status === "Confirmada" && (
            <p className="ui-row-sub">Confirmada por {analise.revisadoPor || "profissional"}: {analise.textoRevisado}</p>
          )}
          {analise.status === "Descartada" && <p className="ui-row-sub">Sugestão descartada. Não integra o registro técnico.</p>}
        </div>
      )}
    </article>
  );
}

export default function PcEvidencias({
  empresa,
  data,
  totais,
  evidencias,
  podeAdicionar,
  vinculo,
  ambientes,
  itens,
  ncs,
  ambienteSel,
  itemSel,
  ncSel,
  onAmbiente,
  onItem,
  onNc,
  descricao,
  onDescricao,
  mensagem,
  onFoto,
  onAudio,
  onVoltar,
}: Props) {
  const [aba, setAba] = useState<Aba>("todas");
  const [trocando, setTrocando] = useState(false);
  const [ampliada, setAmpliada] = useState<{ url: string; legenda: string } | null>(null);

  const visiveis = evidencias.filter((ev) =>
    aba === "todas" ? true : aba === "fotos" ? ev.tipo === "Foto" : aba === "audios" ? ev.tipo === "Áudio" : ev.analise?.status === "Aguardando revisão"
  );

  const campoDescricao: ReactNode = (
    <span className="ui-field-wrap ui-field-wrap--area">
      <textarea
        className="ui-input pc-input-tools"
        rows={3}
        value={descricao}
        onChange={(evento) => onDescricao(evento.target.value)}
        placeholder="Ex.: embalagem avariada identificada no recebimento..."
        aria-label="Descrição da evidência"
      />
      <span className="ui-field-tools">
        <FieldVoiceTools
          fieldKey="evidencia-descricao"
          value={descricao}
          onChange={onDescricao}
          contexto="Descrição curta de uma evidência registrada durante inspeção de Boas Práticas."
        />
      </span>
    </span>
  );

  return (
    <section className="ui-screen" aria-label="Evidências da visita">
      <div className="ui-head">
        <div>
          <h1 className="ui-title">Evidências</h1>
          <p className="ui-subtitle">
            {empresa} · {data}
          </p>
        </div>
        <div className="ui-head-actions">
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onVoltar}>
            ← Central
          </button>
        </div>
      </div>

      <StatStrip
        rotulo="Resumo das evidências"
        itens={[
          { rotulo: "Evidências", valor: totais.evidencias, tom: "na" },
          { rotulo: "Fotos", valor: totais.fotos, tom: "info" },
          { rotulo: "Áudios", valor: totais.audios, tom: "brand" },
          { rotulo: "IA para revisar", valor: totais.revisar, tom: "lilas" },
        ]}
      />

      <p className="ui-note">Antes de usar a IA, evite enquadrar rostos, crachás e documentos pessoais.</p>

      <div className={`pc-ev-cols${podeAdicionar ? "" : " is-single"}`}>
        {podeAdicionar && (
          <div className="ui-card pc-ev-new">
            <h2 className="ui-card-title">Nova evidência</h2>
            <div className="pc-ev-capture">
              <label className="pc-capture pc-capture--photo">
                <CameraIcon /> Tirar foto
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={async (evento) => {
                    const entrada = evento.currentTarget;
                    await onFoto(entrada.files?.[0]);
                    entrada.value = "";
                  }}
                />
              </label>
              <label className="pc-capture pc-capture--audio">
                <MicIcon /> Gravar áudio
                <input
                  type="file"
                  accept="audio/*"
                  className="sr-only"
                  onChange={(evento) => {
                    onAudio(evento.target.files?.[0]);
                    evento.currentTarget.value = "";
                  }}
                />
              </label>
            </div>

            <div className="pc-ev-link">
              <div>
                <div className="ui-eyebrow">Vinculada a</div>
                <div className="pc-ev-link-text">
                  {vinculo.ambiente || "Sem ambiente"}
                  {vinculo.temItem ? ` · ${vinculo.item}` : " · sem item específico"}
                </div>
              </div>
              <button type="button" className="pc-link-btn" onClick={() => setTrocando((aberto) => !aberto)}>
                {trocando ? "Fechar" : "Trocar"}
              </button>
            </div>

            {trocando && (
              <div className="pc-ev-swap">
                <label className="pc-field">
                  <span className="ui-eyebrow">Ambiente</span>
                  <select className="ui-input" value={ambienteSel} onChange={(evento) => onAmbiente(evento.target.value)}>
                    <option value="">Sem ambiente específico</option>
                    {ambientes.map((nome) => (
                      <option key={nome} value={nome}>
                        {nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pc-field">
                  <span className="ui-eyebrow">Item do checklist</span>
                  <select className="ui-input" value={itemSel} onChange={(evento) => onItem(evento.target.value)}>
                    <option value="">Nenhum item específico</option>
                    {itens.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.rotulo}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="pc-field">
                  <span className="ui-eyebrow">Não conformidade</span>
                  <select className="ui-input" value={ncSel} onChange={(evento) => onNc(evento.target.value)}>
                    <option value="">Nenhuma NC específica</option>
                    {ncs.map((nc) => (
                      <option key={nc.id} value={nc.id}>
                        {nc.rotulo}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            <label className="pc-field">
              <span className="ui-eyebrow">Descrição</span>
              {campoDescricao}
            </label>

            {mensagem && (
              <div className="ui-note" role="status">
                {mensagem}
              </div>
            )}
          </div>
        )}

        <div className="pc-ev-list">
          <div className="ui-head">
            <SegmentedTabs<Aba>
              rotulo="Filtrar evidências"
              valor={aba}
              onChange={setAba}
              abas={[
                { id: "todas", rotulo: "Todas", contagem: totais.evidencias },
                { id: "fotos", rotulo: "Fotos", contagem: totais.fotos },
                { id: "audios", rotulo: "Áudios", contagem: totais.audios },
                { id: "revisar", rotulo: "IA para revisar", contagem: totais.revisar },
              ]}
            />
          </div>
          <div className="ui-scroll pc-ev-scroll">
            {visiveis.length === 0 ? (
              <div className="ui-empty">
                {evidencias.length === 0 ? "Nenhuma evidência registrada. Adicione uma foto ou áudio durante a inspeção." : "Nenhuma evidência neste filtro."}
              </div>
            ) : (
              visiveis.map((ev) => <Cartao key={ev.id} ev={ev} onAmpliar={(url, legenda) => setAmpliada({ url, legenda })} />)
            )}
          </div>
        </div>
      </div>

      {ampliada && (
        <div className="pc-lightbox" role="dialog" aria-label="Foto ampliada" onClick={() => setAmpliada(null)}>
          <div className="pc-lightbox-box" onClick={(evento) => evento.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ampliada.url} alt={ampliada.legenda} />
            <div className="pc-lightbox-bar">
              <span>{ampliada.legenda}</span>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setAmpliada(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
