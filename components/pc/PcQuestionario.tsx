"use client";

import { useState } from "react";
import {
  MENSAGEM_JUSTIFICATIVA,
  ORIGEM_DA_PERGUNTA,
  adicionarPergunta,
  desligarPergunta,
  moverPergunta,
  perguntasVigentes,
  religarPergunta,
  removerOuDesativarPergunta,
} from "@/lib/questionarioAmbiente";
import type { ConfigQuestionario, PerguntaDoQuestionario } from "@/types";

type Props = {
  ambiente: string;
  config: ConfigQuestionario;
  /** A pergunta já apareceu em alguma visita da empresa? Então só pode ser desativada. */
  foiUsada: (pergunta: PerguntaDoQuestionario) => boolean;
  quem: { id?: string; nome?: string };
  onSalvar: (config: ConfigQuestionario) => void;
  onFechar: () => void;
};

const POR_PAGINA = 5;

// Questionário do ambiente (só no PC; só Administrador e RT): modelo da norma + perguntas da empresa.
export default function PcQuestionario({ ambiente, config, foiUsada, quem, onSalvar, onFechar }: Props) {
  const [pagina, setPagina] = useState(0);
  const [desligando, setDesligando] = useState<string | null>(null);
  const [justificativa, setJustificativa] = useState("");
  const [tocado, setTocado] = useState(false);
  const [nova, setNova] = useState("");
  const [novaTocada, setNovaTocada] = useState(false);
  const [erroNova, setErroNova] = useState("");
  const agora = () => new Date().toISOString();

  const lista = [...config.perguntas].sort((a, b) => a.ordem - b.ordem);
  const totalPaginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const ativas = perguntasVigentes(config).length;
  const erroJustificativa = desligando && justificativa.trim().length < 5 ? MENSAGEM_JUSTIFICATIVA : "";

  function confirmarDesligar(pergunta: PerguntaDoQuestionario) {
    const resultado = desligarPergunta(config, pergunta.id, quem, agora(), justificativa);
    if (!resultado.ok) {
      setTocado(true);
      return;
    }
    onSalvar(resultado.config);
    setDesligando(null);
    setJustificativa("");
    setTocado(false);
  }

  function adicionar() {
    setNovaTocada(true);
    const resultado = adicionarPergunta(config, { id: crypto.randomUUID(), titulo: nova }, agora());
    if (!resultado.ok) {
      setErroNova(resultado.erro);
      return;
    }
    onSalvar(resultado.config);
    setNova("");
    setNovaTocada(false);
    setErroNova("");
    setPagina(Math.ceil(resultado.config.perguntas.length / POR_PAGINA) - 1);
  }

  return (
    <div className="pc-modal-layer" role="presentation">
      <div className="pc-modal-backdrop" onClick={onFechar} />
      <section className="pc-modal quest" role="dialog" aria-modal="true" aria-label={`Questionário de ${ambiente}`}>
        <h2 className="pc-modal-title">Questionário · {ambiente}</h2>
        <p className="ui-row-sub">
          {ativas} de {lista.length} perguntas ligadas. Vale para as próximas visitas; as visitas já iniciadas mantêm as perguntas que já usam. Pergunta usada em visita nunca é apagada, só desativada.
        </p>
        <ul className="quest-lista">
          {lista.slice(paginaAtual * POR_PAGINA, (paginaAtual + 1) * POR_PAGINA).map((pergunta) => {
            const usada = foiUsada(pergunta);
            const posicao = lista.findIndex((item) => item.id === pergunta.id);
            return (
              <li key={pergunta.id} className={`quest-item${pergunta.ativa ? "" : " is-desligada"}`}>
                <div className="quest-textos">
                  <span className="quest-titulo">{pergunta.titulo}</span>
                  <span className="ui-row-sub">
                    <span className={`quest-origem quest-origem--${pergunta.origem}`}>{ORIGEM_DA_PERGUNTA[pergunta.origem]}</span>{" "}
                    {pergunta.nova && (
                      <>
                        <span className="quest-nova">Nova no modelo</span>{" "}
                        <button type="button" className="pc-link-btn" onClick={() => onSalvar({ ...config, perguntas: config.perguntas.map((item) => (item.id === pergunta.id ? { ...item, nova: false } : item)) })}>
                          Marcar como vista
                        </button>{" "}
                      </>
                    )}
                    {pergunta.referencia ? (
                      <>
                        Fonte: {pergunta.referencia}
                        <span className="em-breve pop-conferir"> conferir</span>
                      </>
                    ) : (
                      "Sem fonte cadastrada"
                    )}
                    {usada ? " · já usada em visita" : ""}
                  </span>
                  {!pergunta.ativa && (
                    <span className="ui-row-sub">
                      Desligada{pergunta.justificativaDeDesligar ? `: ${pergunta.justificativaDeDesligar}` : ""}
                    </span>
                  )}
                </div>
                <div className="quest-acoes">
                  <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label="Subir a pergunta" disabled={posicao === 0} onClick={() => onSalvar(moverPergunta(config, pergunta.id, -1, agora()))}>
                    ↑
                  </button>
                  <button type="button" className="ui-btn ui-btn--soft ui-btn--small" aria-label="Descer a pergunta" disabled={posicao === lista.length - 1} onClick={() => onSalvar(moverPergunta(config, pergunta.id, 1, agora()))}>
                    ↓
                  </button>
                  {pergunta.ativa ? (
                    <button
                      type="button"
                      className="ui-btn ui-btn--secondary ui-btn--small"
                      onClick={() => {
                        if (pergunta.origem === "modelo") {
                          setDesligando(pergunta.id);
                          setJustificativa("");
                          setTocado(false);
                        } else {
                          const resultado = removerOuDesativarPergunta(config, pergunta.id, usada, quem, agora());
                          if (resultado.ok) onSalvar(resultado.config);
                        }
                      }}
                    >
                      {pergunta.origem === "empresa" && !usada ? "Remover" : "Desligar"}
                    </button>
                  ) : (
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => onSalvar(religarPergunta(config, pergunta.id, agora()))}>
                      Ligar
                    </button>
                  )}
                </div>
                {desligando === pergunta.id && (
                  <div className="quest-justificativa">
                    <label className="pc-field">
                      <span className="ui-eyebrow">Por que desligar esta pergunta do modelo?</span>
                      <input className={`ui-input${tocado && erroJustificativa ? " is-invalid" : ""}`} value={justificativa} onChange={(evento) => setJustificativa(evento.target.value)} aria-invalid={Boolean(tocado && erroJustificativa)} autoFocus />
                      {(tocado || justificativa) && erroJustificativa && <span className="ui-field-error">{erroJustificativa}</span>}
                    </label>
                    <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setDesligando(null)}>
                      Cancelar
                    </button>
                    <button type="button" className="ui-btn ui-btn--save ui-btn--small" onClick={() => confirmarDesligar(pergunta)}>
                      Desligar e registrar
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {totalPaginas > 1 && (
          <div className="pop-passos-pagina" role="group" aria-label="Páginas das perguntas">
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={paginaAtual === 0} onClick={() => setPagina(paginaAtual - 1)}>
              ‹ Anteriores
            </button>
            <span className="ui-row-sub">
              {paginaAtual + 1} de {totalPaginas}
            </span>
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" disabled={paginaAtual >= totalPaginas - 1} onClick={() => setPagina(paginaAtual + 1)}>
              Próximas ›
            </button>
          </div>
        )}
        <div className="quest-nova">
          <label className="pc-field">
            <span className="ui-eyebrow">Nova pergunta da empresa</span>
            <input className={`ui-input${novaTocada && erroNova ? " is-invalid" : ""}`} value={nova} onChange={(evento) => { setNova(evento.target.value); setErroNova(""); }} placeholder="Ex.: A balança está calibrada e limpa?" aria-invalid={Boolean(novaTocada && erroNova)} />
            {novaTocada && erroNova && <span className="ui-field-error">{erroNova}</span>}
          </label>
          <button type="button" className="ui-btn ui-btn--criar ui-btn--small" onClick={adicionar}>
            + Adicionar
          </button>
        </div>
        <div className="pc-modal-foot">
          <span />
          <div className="ui-footer-actions">
            <button type="button" className="ui-btn ui-btn--save" onClick={onFechar}>
              Pronto
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
