"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ROTULO_DO_SELO, chipPendente, quantosChipsCabem, contadorDaJanela, escolhaMudou, linhaDeContagem, marcadosNaOrdem } from "@/lib/escolhaEmJanela";

export type OpcaoDeEscolha = { id: string; titulo: string; descricao?: string };

type Props = {
  titulo: string;
  apoio: string;
  opcoes: OpcaoDeEscolha[];
  /** Ids marcados hoje (o estado da tela). */
  marcadas: string[];
  /** Texto depois de "N de T": "setores marcados", "fluxos marcados". */
  palavra: string;
  rotuloDoBotao: string;
  vazio: string;
  /** Ids que estavam marcados no último salvo: o chip fora dessa lista mostra o selo de pendente. */
  salvas?: string[];
  /** "Concluir": recebe os ids marcados. Só é chamado quando a escolha mudou de verdade (senão a área não vira "não salva"). */
  onAplicar: (ids: string[]) => void;
  /** "botao": só o botão que abre a janela (a lista de quem chama já mostra o que está marcado). */
  modo?: "cartao" | "botao";
};

// Cartão-resumo (título, "N de T … marcados", chips dos marcados) + botão que abre a janela de escolha.
// A janela trabalha numa cópia: "Concluir" aplica no estado da tela (quem grava é a barra fixa de baixo); "Cancelar" e Esc descartam.
export default function EscolhaEmJanela({ titulo, apoio, opcoes, marcadas, palavra, rotuloDoBotao, vazio, salvas, onAplicar, modo = "cartao" }: Props) {
  const [aberta, setAberta] = useState(false);
  const ids = opcoes.map((opcao) => opcao.id);
  const marcadosAgora = marcadosNaOrdem(ids, marcadas);
  const tituloDe = (id: string) => opcoes.find((opcao) => opcao.id === id)?.titulo || id;

  const janela = aberta ? (
    <JanelaDeEscolha
      titulo={titulo}
      apoio={apoio}
      opcoes={opcoes}
      marcadasAoAbrir={marcadosAgora}
      onCancelar={() => setAberta(false)}
      onConcluir={(escolhidos) => {
        setAberta(false);
        if (escolhaMudou(marcadosAgora, escolhidos)) onAplicar(escolhidos);
      }}
    />
  ) : null;

  if (modo === "botao") {
    return (
      <>
        <button type="button" className="ui-btn ui-btn--secondary esc-botao" aria-haspopup="dialog" onClick={() => setAberta(true)}>
          {rotuloDoBotao}
        </button>
        {janela}
      </>
    );
  }

  return (
    <section className="cad-cartao esc-resumo" aria-label={titulo}>
      <div className="esc-resumo-topo">
        <div className="esc-resumo-textos">
          <div className="cad-titulo">{titulo}</div>
          <div className="cad-descricao">{linhaDeContagem(marcadosAgora.length, opcoes.length, palavra)}</div>
        </div>
        <button type="button" className="ui-btn ui-btn--secondary esc-botao" aria-haspopup="dialog" onClick={() => setAberta(true)}>
          {rotuloDoBotao}
        </button>
      </div>
      {marcadosAgora.length === 0 ? (
        <p className="esc-vazio">{vazio}</p>
      ) : (
        <ChipsRecolhiveis titulo={titulo} ids={marcadosAgora} tituloDe={tituloDe} completoDe={(id) => opcoes.find((opcao) => opcao.id === id)?.descricao} salvas={salvas} />
      )}
      {janela}
    </section>
  );
}

// Fechado (padrão): uma linha com os primeiros chips que cabem e o chip "+N ▾". Aberto: todos, com "Recolher ▴"; passando de 4 linhas, rola por dentro.
function ChipsRecolhiveis({ titulo, ids, tituloDe, completoDe, salvas }: { titulo: string; ids: string[]; tituloDe: (id: string) => string; completoDe?: (id: string) => string | undefined; salvas?: string[] }) {
  const [aberto, setAberto] = useState(false);
  const [cabem, setCabem] = useState(ids.length);
  const caixaRef = useRef<HTMLDivElement | null>(null);
  const medidorRef = useRef<HTMLUListElement | null>(null);
  const chave = ids.map((id) => `${id}:${chipPendente(id, salvas) ? 1 : 0}`).join("|");

  useLayoutEffect(() => {
    function medir() {
      const caixa = caixaRef.current;
      const medidor = medidorRef.current;
      if (!caixa || !medidor) return;
      const itens = Array.from(medidor.querySelectorAll<HTMLElement>("li[data-chip]"));
      const mais = medidor.querySelector<HTMLElement>("li[data-mais]");
      const espaco = parseFloat(getComputedStyle(medidor).columnGap) || 8;
      setCabem(quantosChipsCabem(itens.map((item) => item.offsetWidth), caixa.clientWidth, espaco, mais?.offsetWidth || 0));
    }
    medir();
    const observador = typeof ResizeObserver !== "undefined" && caixaRef.current ? new ResizeObserver(medir) : null;
    if (observador && caixaRef.current) observador.observe(caixaRef.current);
    return () => observador?.disconnect();
  }, [chave]);

  const chip = (id: string) => (
    <li key={id} className={`esc-chip ${chipPendente(id, salvas) ? "is-falta" : "is-salvo"}`} title={completoDe?.(id)}>
      <span aria-hidden="true">✓</span> {tituloDe(id)}
      {chipPendente(id, salvas) && <span className="esc-selo">{ROTULO_DO_SELO}</span>}
    </li>
  );
  const escondidos = ids.length - cabem;

  return (
    <div className="esc-chips-area" ref={caixaRef}>
      <ul className="esc-medidor esc-chips" aria-hidden="true" ref={medidorRef}>
        {ids.map((id) => (
          <li key={id} data-chip className="esc-chip">
            <span>✓</span> {tituloDe(id)}
            {chipPendente(id, salvas) && <span className="esc-selo">{ROTULO_DO_SELO}</span>}
          </li>
        ))}
        <li data-mais className="esc-chip esc-chip--mais">+{ids.length} ▾</li>
      </ul>
      {aberto ? (
        <>
          <ul className="esc-chips esc-chips--aberto" aria-label={`${titulo}: marcados`}>{ids.map(chip)}</ul>
          <button type="button" className="esc-chip esc-chip--mais esc-recolher" aria-expanded="true" onClick={() => setAberto(false)}>Recolher ▴</button>
        </>
      ) : (
        <ul className="esc-chips esc-chips--fechado" aria-label={`${titulo}: marcados`}>
          {ids.slice(0, cabem).map(chip)}
          {escondidos > 0 && (
            <li>
              <button type="button" className="esc-chip esc-chip--mais" aria-expanded="false" title={ids.slice(cabem).map(tituloDe).join("; ")} onClick={() => setAberto(true)}>
                +{escondidos} ▾
              </button>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

function JanelaDeEscolha({ titulo, apoio, opcoes, marcadasAoAbrir, onCancelar, onConcluir }: { titulo: string; apoio: string; opcoes: OpcaoDeEscolha[]; marcadasAoAbrir: string[]; onCancelar: () => void; onConcluir: (ids: string[]) => void }) {
  const [escolha, setEscolha] = useState<string[]>(marcadasAoAbrir);
  const [montado, setMontado] = useState(false);
  const janelaRef = useRef<HTMLElement | null>(null);
  const cancelarRef = useRef(onCancelar);
  cancelarRef.current = onCancelar;

  useEffect(() => {
    setMontado(true);
    // Trava a rolagem da página de fundo: só o corpo da janela rola.
    const html = document.documentElement;
    const antesBody = document.body.style.overflow;
    const antesHtml = html.style.overflow;
    document.body.style.overflow = "hidden";
    html.style.overflow = "hidden";
    const anterior = document.activeElement as HTMLElement | null;
    return () => {
      document.body.style.overflow = antesBody;
      html.style.overflow = antesHtml;
      anterior?.focus?.();
    };
  }, []);

  useEffect(() => {
    if (montado) janelaRef.current?.querySelector<HTMLElement>("input[type='checkbox']")?.focus();
  }, [montado]);

  // Esc = Cancelar; Tab fica preso dentro da janela.
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

  function alternar(id: string) {
    setEscolha((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));
  }

  const janela = (
    <div className="esc-camada" role="presentation">
      <div className="esc-fundo" onClick={onCancelar} />
      <section ref={janelaRef} className="esc-janela" role="dialog" aria-modal="true" aria-labelledby="esc-titulo">
        <header className="esc-cabeca">
          <h2 id="esc-titulo" className="esc-titulo">{titulo}</h2>
          <p className="esc-apoio">{apoio}</p>
        </header>
        <div className="esc-corpo">
          <ul className="esc-opcoes">
            {opcoes.map((opcao) => {
              const marcada = escolha.includes(opcao.id);
              return (
                <li key={opcao.id}>
                  <label className={`esc-opcao${marcada ? " is-on" : ""}`}>
                    <input type="checkbox" className="esc-caixa" checked={marcada} onChange={() => alternar(opcao.id)} />
                    <span className="esc-opcao-textos">
                      <span className="esc-opcao-titulo">{opcao.titulo}</span>
                      {opcao.descricao && <span className="esc-opcao-descricao">{opcao.descricao}</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </div>
        <footer className="esc-rodape">
          <span className="esc-contador" role="status">{contadorDaJanela(escolha.length, opcoes.length)}</span>
          <div className="esc-rodape-botoes">
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onCancelar}>
              Cancelar
            </button>
            <button type="button" className="ui-btn ui-btn--save" onClick={() => onConcluir(marcadosNaOrdem(opcoes.map((opcao) => opcao.id), escolha))}>
              Concluir
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
  return montado ? createPortal(janela, document.body) : null;
}
