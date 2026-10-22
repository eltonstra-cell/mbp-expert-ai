"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ProcedimentoOperacionalPadronizado } from "@/types";
import { avisoDeModeloJaCriado, buscarModelos, codigoEmUso, modeloPorId, proximoCodigoLivre, rotuloDoFormato, totalDePassos, type ModeloDePop, type ResultadoDaCriacao } from "@/lib/popModelos";
import { quantidade } from "@/lib/plural";

type Props = {
  pops: ProcedimentoOperacionalPadronizado[];
  /** Cria o POP e devolve o resultado; em caso de erro a janela mostra o aviso junto do campo. */
  onCriar: (modeloId: string, codigo: string, titulo: string) => ResultadoDaCriacao;
  onCancelar: () => void;
  /** Link discreto "Começar em branco": leva ao fluxo de POP em branco. */
  onEmBranco?: () => void;
};

// "Adicionar POP": janela (modal) sobre a tela. Título, busca e Cancelar fixos; lista de modelos com rolagem por dentro; prévia à direita;
// "Criar POP" fixo e sempre visível. A rolagem da página de fundo fica travada. Em tela estreita (< 900 px): lista em tela cheia e, ao escolher, a prévia numa segunda etapa.
export default function PcModelosPop({ pops, onCriar, onCancelar, onEmBranco }: Props) {
  const [consulta, setConsulta] = useState("");
  const [escolhidoId, setEscolhidoId] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<"lista" | "previa">("lista");
  const [codigo, setCodigo] = useState(() => proximoCodigoLivre(pops));
  const [titulo, setTitulo] = useState("");
  const [erro, setErro] = useState<{ campo: "titulo" | "codigo"; aviso: string } | null>(null);
  const [montado, setMontado] = useState(false);
  const janelaRef = useRef<HTMLElement | null>(null);
  const modelos = useMemo(() => buscarModelos(consulta), [consulta]);
  const escolhido: ModeloDePop | undefined = modeloPorId(escolhidoId || undefined);

  useEffect(() => {
    setMontado(true);
    // Trava a rolagem da página de fundo: sobra a rolagem da lista.
    const html = document.documentElement;
    const antesBody = document.body.style.overflow;
    const antesHtml = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = antesBody;
      html.style.overflow = antesHtml;
    };
  }, []);

  // Sempre o "Cancelar" mais recente (a função do pai muda a cada renderização, e a janela não deve refocar por isso).
  const cancelarRef = useRef(onCancelar);
  cancelarRef.current = onCancelar;
  useEffect(() => {
    if (montado) janelaRef.current?.querySelector<HTMLInputElement>("input[type='search']")?.focus();
  }, [montado]);

  useEffect(() => {
    if (!montado) return;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        cancelarRef.current();
        return;
      }
      if (evento.key !== "Tab") return;
      const focaveis = Array.from(janelaRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), [href]") || []).filter((el) => el.offsetParent !== null);
      if (focaveis.length === 0) return;
      const primeiro = focaveis[0];
      const ultimo = focaveis[focaveis.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [montado]);

  function escolher(modelo: ModeloDePop) {
    setEscolhidoId(modelo.id);
    setTitulo(modelo.titulo);
    setCodigo(proximoCodigoLivre(pops));
    setErro(null);
    setEtapa("previa");
  }

  const erroDoCodigo = erro?.campo === "codigo" ? erro.aviso : codigoEmUso(pops, codigo) ? "Este código já está sendo utilizado em outro POP." : "";
  const erroDoTitulo = erro?.campo === "titulo" ? erro.aviso : "";
  const jaCriado = escolhido ? avisoDeModeloJaCriado(pops, escolhido.id) : "";

  function criar() {
    if (!escolhido) return;
    const resultado = onCriar(escolhido.id, codigo, titulo);
    if (!resultado.ok) setErro({ campo: resultado.campo, aviso: resultado.aviso });
  }

  const janela = (
    <div className="pc-modal-layer mdl-camada" role="presentation">
      <div className="pc-modal-backdrop" onClick={onCancelar} />
      <section ref={janelaRef} className="mdl-janela" role="dialog" aria-modal="true" aria-labelledby="mdl-titulo" data-etapa={etapa}>
        <header className="mdl-cabeca">
          <h2 id="mdl-titulo" className="mdl-titulo">
            Adicionar POP
          </h2>
          <input className="ui-input mdl-busca" type="search" value={consulta} onChange={(evento) => setConsulta(evento.target.value)} placeholder="Buscar modelo" aria-label="Buscar modelo de POP" />
          <button type="button" className="ui-btn ui-btn--secondary" onClick={onCancelar}>
            Cancelar
          </button>
        </header>

        <div className="mdl-corpo">
          <div className="mdl-lista-area">
            <ul className="mdl-lista" aria-label="Modelos de POP">
              {modelos.map((modelo) => (
                <li key={modelo.id}>
                  <button type="button" className={`mdl-item${escolhido?.id === modelo.id ? " is-ativo" : ""}`} aria-pressed={escolhido?.id === modelo.id} onClick={() => escolher(modelo)}>
                    <span className="mdl-item-titulo">{modelo.titulo}</span>
                    <span className="mdl-item-formato">{rotuloDoFormato(modelo)}</span>
                  </button>
                </li>
              ))}
              {modelos.length === 0 && <li className="ui-empty">Nenhum modelo com essa busca.</li>}
            </ul>
          </div>

          <div className="mdl-detalhe">
            <button type="button" className="ui-btn ui-btn--secondary ui-btn--small mdl-voltar-lista" onClick={() => setEtapa("lista")}>
              ← Voltar à lista
            </button>
            {!escolhido ? (
              <p className="ficha-vazio">Escolha um modelo na lista para ver a prévia.</p>
            ) : (
              <>
                <div className="mdl-selecionado" role="status">
                  <span className="mdl-selecionado-marca" aria-hidden="true">
                    ✓
                  </span>
                  <span>
                    Modelo selecionado: <b>{escolhido.titulo}</b>
                  </span>
                </div>
                <div className="mdl-previa-bloco">
                  <p className="mdl-previa-rotulo">Objetivos</p>
                  <ul className="mdl-previa">
                    {escolhido.secoes.objetivos.map((objetivo) => (
                      <li key={objetivo}>{objetivo}</li>
                    ))}
                  </ul>
                  <p className="mdl-previa-rotulo">{quantidade(totalDePassos(escolhido), "passo", "passos")}</p>
                </div>
                {jaCriado && (
                  <p className="mdl-aviso" role="status">
                    {jaCriado}
                  </p>
                )}
                <div className="mdl-campos">
                  <label className="pc-field">
                    <span className="ui-eyebrow">Código</span>
                    <input
                      className={`ui-input${erroDoCodigo ? " is-invalid" : ""}`}
                      value={codigo}
                      onChange={(evento) => {
                        setCodigo(evento.target.value);
                        if (erro?.campo === "codigo") setErro(null);
                      }}
                      aria-invalid={Boolean(erroDoCodigo)}
                    />
                    {erroDoCodigo && <span className="ui-field-error">{erroDoCodigo}</span>}
                  </label>
                  <label className="pc-field">
                    <span className="ui-eyebrow">Título</span>
                    <input
                      className={`ui-input${erroDoTitulo ? " is-invalid" : ""}`}
                      value={titulo}
                      onChange={(evento) => {
                        setTitulo(evento.target.value);
                        if (erro?.campo === "titulo") setErro(null);
                      }}
                      aria-invalid={Boolean(erroDoTitulo)}
                    />
                    {erroDoTitulo && <span className="ui-field-error">{erroDoTitulo}</span>}
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        <footer className="mdl-rodape">
          {onEmBranco ? (
            <button type="button" className="pc-link-btn mdl-em-branco" onClick={onEmBranco}>
              Começar em branco
            </button>
          ) : (
            <span />
          )}
          <div className="mdl-rodape-acao">
            {!escolhido && <span className="pdoc-falta" role="status">Escolha um modelo</span>}
            {escolhido && !titulo.trim() && <span className="pdoc-falta" role="status">Falta: título</span>}
            <button type="button" className="ui-btn ui-btn--criar" disabled={!escolhido || Boolean(erroDoCodigo) || !titulo.trim()} onClick={criar}>
              Criar POP
            </button>
          </div>
        </footer>
      </section>
    </div>
  );

  return montado ? createPortal(janela, document.body) : null;
}
