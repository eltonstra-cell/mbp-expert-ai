"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { NavIcon } from "@/components/NavIcons";
import { useVoiceCapture } from "@/components/useVoiceCapture";
import { ORDEM_GRUPOS_BUSCA, buscar, type Destino, type GrupoBusca, type Resultado } from "@/lib/commandSearch";
import { interpretarVoz, type EmpresaDaVoz, type InterpretacaoDaVoz } from "@/lib/vozComando";
import { lerRecentes, registrarRecente, type Recente } from "@/lib/buscaRecentes";
import { modoDaBusca } from "@/lib/topoCompacto";

// Exemplos que trocam a cada poucos segundos (só o texto de ajuda; nada é buscado sozinho).
const PLACEHOLDER = "Busque ou diga o que quer fazer";
const LIMITE_POR_GRUPO: Record<GrupoBusca, number> = { ir: 6, agir: 4, itens: 8, empresas: 6 };
/** Depois da voz, destino único de navegação abre sozinho depois desta contagem (com botão Cancelar). */
const CONTAGEM_DA_ABERTURA_MS = 2000;

export type AtalhoDaBusca = { id: string; rotulo: string; onClick: () => void };

/** O que a busca por voz precisa saber para entender "[destino] em [empresa]" (só o que o perfil já acessa). */
export type ContextoDaVoz = {
  empresas: EmpresaDaVoz[];
  empresaAtivaId: string | null;
  /** Etapas da visita (Checklist, Evidências, Relatório, POPs da visita) que o perfil pode abrir, haja visita ou não. */
  destinosDaVisita: Destino[];
  temVisitaNaEmpresa: (empresaId: string) => boolean;
  /** Troca de empresa e abre o destino (só depois de confirmação por clique). */
  onTrocarEAbrir: (empresaId: string, destino: Destino) => void;
  onAbrirVisitas: () => void;
};

type Props = {
  destinos: Destino[];
  /** Os quatro atalhos (Nova visita, Central da Empresa, Correções abertas, Relatórios): chips no painel da busca. */
  atalhos: AtalhoDaBusca[];
  /** Quem está usando (para guardar os recentes só dele neste aparelho). */
  usuarioId?: string | null;
  /** Avisa que a pessoa começou ou terminou de usar a busca (a tela só monta o índice enquanto está em uso). */
  onAtiva: (ativa: boolean) => void;
  onEscolher: (destino: Destino) => void;
  /** Mostra o microfone (só quem pode usar IA). */
  micDisponivel: boolean;
  /** "inicio": campo cinza claro com lupa à esquerda e microfone azul à direita; sem "Ctrl K" e sem "Ir" (Enter envia). "campo": celular (modo Campo), a mesma barra do PC (⚡, campo, microfone e "Ir →") sempre inline, sem "Ctrl K". */
  variante?: "inicio" | "campo";
  /** Muda a cada Ctrl K: leva o foco para a barra. */
  pedidoDeFoco: number;
  voz?: ContextoDaVoz;
};

// A busca vive na linha do topo, à direita do nome da página. Janela larga (1400 px ou mais): campo na barra. Janela estreita: lupa + "Ctrl K"
// e o campo de digitação passa para o topo do painel. Em ambos o painel abre colado (8 px), com 520 px (limitado à janela): com o campo vazio
// mostra atalhos e recentes; ao digitar, os resultados. Por voz, destino único de navegação abre sozinho depois de 2 s, com Cancelar.
export default function BuscaNaBarra({ destinos, atalhos, usuarioId, onAtiva, onEscolher, micDisponivel, pedidoDeFoco, voz: contextoDaVoz, variante }: Props) {
  const [consulta, setConsulta] = useState("");
  const [aberto, setAberto] = useState(false);
  const [indice, setIndice] = useState(0);
  const [recentes, setRecentes] = useState<Recente[]>([]);
  const [compacta, setCompacta] = useState(false);
  const [textoDaVoz, setTextoDaVoz] = useState<string | null>(null);
  const [abrindo, setAbrindo] = useState<Destino | null>(null);
  /** O que a voz entendeu e ainda pede uma resposta da pessoa (você quis dizer, trocar de empresa, sem visita, não entendi). */
  const [pergunta, setPergunta] = useState<InterpretacaoDaVoz | null>(null);
  const campoRef = useRef<HTMLInputElement | null>(null);
  const raizRef = useRef<HTMLDivElement | null>(null);

  const voz = useVoiceCapture({
    contexto: "busca",
    onTexto: (texto) => {
      setConsulta(texto);
      setIndice(0);
      setTextoDaVoz(texto);
      abrir();
      campoRef.current?.focus();
    },
  });

  function abrir() {
    if (!aberto) setRecentes(lerRecentes(usuarioId));
    setAberto(true);
    onAtiva(true);
  }
  function fechar() {
    setAberto(false);
    setAbrindo(null);
    setPergunta(null);
    onAtiva(false);
  }

  useEffect(() => {
    const medir = () => setCompacta(variante !== "inicio" && variante !== "campo" && modoDaBusca(window.innerWidth) === "compacta");
    medir();
    window.addEventListener("resize", medir);
    return () => window.removeEventListener("resize", medir);
  }, [variante]);

  useEffect(() => {
    if (!pedidoDeFoco) return;
    abrir();
    campoRef.current?.focus();
    campoRef.current?.select();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoDeFoco]);

  // Na janela estreita o campo nasce junto com o painel: leva o foco para ele.
  useEffect(() => {
    if (aberto && compacta) campoRef.current?.focus();
  }, [aberto, compacta]);

  // Erro do microfone (negado ou indisponível) aparece no painel; a digitação segue funcionando.
  useEffect(() => {
    if (voz.erro) abrir();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voz.erro]);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (evento: MouseEvent) => {
      if (raizRef.current?.contains(evento.target as Node)) return;
      fechar();
    };
    window.addEventListener("mousedown", aoClicarFora);
    return () => window.removeEventListener("mousedown", aoClicarFora);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  const digitando = consulta.trim().length > 0;
  const resultados: Resultado[] = useMemo(() => (aberto && digitando ? buscar(consulta, destinos, { limite: 60 }) : []), [aberto, digitando, consulta, destinos]);
  const doBuscar = useMemo(
    () => ORDEM_GRUPOS_BUSCA.flatMap((grupo) => resultados.filter((resultado) => resultado.destino.grupo === grupo).slice(0, LIMITE_POR_GRUPO[grupo])),
    [resultados]
  );
  // Sem texto, a lista navegável são os recentes que ainda existem para esta pessoa (a rota é o id do destino).
  const doRecentes = useMemo(
    () =>
      recentes
        .map((recente) => destinos.find((destino) => destino.id === recente.rota))
        .filter((destino): destino is Destino => Boolean(destino))
        .map((destino): Resultado => ({ destino, pontos: 0 })),
    [recentes, destinos]
  );
  const lista = digitando ? doBuscar : doRecentes;

  useEffect(() => {
    document.getElementById(`pc-busca-opcao-${indice}`)?.scrollIntoView({ block: "nearest" });
  }, [indice]);

  // Depois da voz: entende o comando (simples ou "[destino] em [empresa]"). Só navegação com resultado único e claro abre sozinha (contagem e
  // Cancelar); aproximação, troca de empresa e "sem visita" sempre perguntam; sem entendimento, nunca fica calada.
  useEffect(() => {
    if (textoDaVoz === null || destinos.length === 0) return;
    const interpretacao = interpretarVoz(textoDaVoz, {
      destinos,
      destinosDaVisita: contextoDaVoz?.destinosDaVisita ?? [],
      empresas: contextoDaVoz?.empresas ?? [],
      empresaAtivaId: contextoDaVoz?.empresaAtivaId ?? null,
      temVisitaNaEmpresa: contextoDaVoz?.temVisitaNaEmpresa ?? (() => false),
    });
    setTextoDaVoz(null);
    executarInterpretacao(interpretacao);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textoDaVoz, destinos]);

  function executarInterpretacao(interpretacao: InterpretacaoDaVoz) {
    if (interpretacao.tipo === "abrir") setAbrindo(interpretacao.destino);
    else if (interpretacao.tipo === "abrir-agora") escolher({ destino: interpretacao.destino, pontos: 0 });
    else if (interpretacao.tipo === "escolher") setPergunta(null);
    else setPergunta(interpretacao);
  }

  function aoConfirmarPergunta() {
    if (!pergunta) return;
    if (pergunta.tipo === "quis-dizer") {
      const proxima = pergunta.depois;
      setPergunta(null);
      executarInterpretacao(proxima);
    } else if (pergunta.tipo === "trocar-e-abrir") {
      const { empresa, destino } = pergunta;
      registrarRecente(destino, usuarioId); // só o destino; o nome da empresa nunca entra nos recentes
      setConsulta("");
      setPergunta(null);
      fechar();
      contextoDaVoz?.onTrocarEAbrir(empresa.id, destino);
    } else if (pergunta.tipo === "sem-visita") {
      setConsulta("");
      setPergunta(null);
      fechar();
      contextoDaVoz?.onAbrirVisitas();
    }
  }

  useEffect(() => {
    if (!abrindo) return;
    const timer = window.setTimeout(() => escolher({ destino: abrindo, pontos: 0 }), CONTAGEM_DA_ABERTURA_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrindo]);

  /** Abre o destino e limpa a busca: o texto digitado some, o painel fecha e a barra volta ao placeholder. */
  function escolher(resultado: Resultado | undefined) {
    if (!resultado) return;
    registrarRecente(resultado.destino, usuarioId);
    setConsulta("");
    setIndice(0);
    setTextoDaVoz(null);
    setPergunta(null);
    fechar();
    campoRef.current?.blur();
    onEscolher(resultado.destino);
  }

  function aoTeclar(evento: React.KeyboardEvent) {
    if (evento.key === "Escape") {
      evento.preventDefault();
      fechar();
      campoRef.current?.focus();
    } else if (evento.key === "ArrowDown") {
      evento.preventDefault();
      if (!aberto) abrir();
      setIndice((atual) => (lista.length ? (atual + 1) % lista.length : 0));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setIndice((atual) => (lista.length ? (atual - 1 + lista.length) % lista.length : 0));
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      escolher(lista[indice]);
    }
  }

  const campo = (
    <input
      id="pc-busca-input"
      ref={campoRef}
      type="text"
      className="pc-busca-input"
      placeholder={PLACEHOLDER}
      aria-label="Busca inteligente: diga o que quer fazer ou para onde quer ir"
      role="combobox"
      aria-expanded={aberto}
      aria-controls="pc-busca-lista"
      aria-activedescendant={aberto && lista.length ? `pc-busca-opcao-${indice}` : undefined}
      autoComplete="off"
      spellCheck={false}
      value={consulta}
      onFocus={abrir}
      onClick={abrir}
      onChange={(evento) => {
        setConsulta(evento.target.value);
        setIndice(0);
        setAbrindo(null);
        setPergunta(null);
        abrir();
      }}
    />
  );
  const microfone = micDisponivel && (
    <button
      type="button"
      className={`pc-mic${voz.estado === "ouvindo" ? " is-listening" : ""}`}
      aria-label={voz.estado === "ouvindo" ? "Parar de ouvir" : "Falar em vez de digitar"}
      disabled={voz.estado === "transcrevendo"}
      onClick={() => (voz.estado === "ouvindo" ? voz.parar() : void voz.iniciar())}
    >
      <NavIcon name="microfone" size={16} />
    </button>
  );
  const ir = (
    <button
      type="button"
      className="pc-go"
      onClick={() => {
        if (lista.length && digitando) escolher(lista[indice]);
        else {
          campoRef.current?.focus();
          abrir();
        }
      }}
    >
      Ir →
    </button>
  );
  const barra = variante === "inicio" ? (
    <div className="pc-smartbar-campos pc-smartbar-campos--inicio">
      <span className="pc-busca-lupa" aria-hidden="true">
        <NavIcon name="lupa" size={20} />
      </span>
      {campo}
      {microfone}
    </div>
  ) : (
    <div className="pc-smartbar-campos">
      <span className="pc-bolt" aria-hidden="true">
        <NavIcon name="raio" size={20} />
      </span>
      {campo}
      {variante !== "campo" && <kbd className="pc-kbd">Ctrl K</kbd>}
      {microfone}
      {ir}
    </div>
  );

  return (
    <div className={`pc-busca${compacta ? " pc-busca--compacta" : ""}${variante === "inicio" ? " pc-busca--inicio" : ""}${variante === "campo" ? " pc-busca--campo" : ""}`} ref={raizRef} onKeyDown={aoTeclar}>
      {compacta ? (
        <button type="button" className={`pc-busca-gatilho${aberto ? " is-aberta" : ""}`} aria-label="Abrir a busca (Ctrl K)" aria-expanded={aberto} onClick={() => (aberto ? fechar() : abrir())}>
          <NavIcon name="lupa" size={18} />
          <kbd className="pc-kbd">Ctrl K</kbd>
        </button>
      ) : (
        <div className={`pc-smartbar${aberto ? " is-aberta" : ""}`}>{barra}</div>
      )}

      {aberto && (
        <div className="pc-busca-painel" id="pc-busca-lista" role="listbox" aria-label="Resultados">
          {compacta && <div className="pc-smartbar pc-smartbar--no-painel">{barra}</div>}
          {voz.estado === "ouvindo" && (
            <div className="pc-cmd-status" role="status">
              <span className="pc-cmd-pulse" aria-hidden="true" /> Ouvindo… (para sozinho depois de 1 s de silêncio)
              <button type="button" className="pc-cmd-status-btn" onClick={voz.parar}>
                Parar
              </button>
            </div>
          )}
          {voz.estado === "transcrevendo" && <div className="pc-cmd-status" role="status">Transcrevendo…</div>}
          {voz.erro && <div className="pc-cmd-error" role="alert">{voz.erro}</div>}
          {abrindo && (
            <div className="pc-busca-abrindo" role="status">
              <span>Abrindo {abrindo.titulo}…</span>
              <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setAbrindo(null)}>
                Cancelar
              </button>
            </div>
          )}

          {pergunta && pergunta.tipo === "quis-dizer" && (
            <div className="pc-busca-pergunta" role="status">
              <span>
                Você quis dizer: <strong>{pergunta.rotulo}</strong>?
              </span>
              <span className="pc-busca-pergunta-botoes">
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={aoConfirmarPergunta}>
                  Sim
                </button>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setPergunta(null)}>
                  Não
                </button>
              </span>
            </div>
          )}
          {pergunta && pergunta.tipo === "trocar-e-abrir" && (
            <div className="pc-busca-pergunta" role="status">
              <span>
                Trocar para <strong>{pergunta.empresa.nome}</strong> e abrir <strong>{pergunta.destino.titulo}</strong>?
              </span>
              <span className="pc-busca-pergunta-botoes">
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={aoConfirmarPergunta}>
                  Trocar e abrir
                </button>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setPergunta(null)}>
                  Cancelar
                </button>
              </span>
            </div>
          )}
          {pergunta && pergunta.tipo === "sem-visita" && (
            <div className="pc-busca-pergunta" role="status">
              <span>
                Não há visita em andamento em <strong>{pergunta.empresa.nome}</strong>. Abrir Visitas?
              </span>
              <span className="pc-busca-pergunta-botoes">
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={aoConfirmarPergunta}>
                  Abrir Visitas
                </button>
                <button type="button" className="ui-btn ui-btn--secondary ui-btn--small" onClick={() => setPergunta(null)}>
                  Cancelar
                </button>
              </span>
            </div>
          )}
          {pergunta && pergunta.tipo === "nao-entendi" && (
            <div className="pc-busca-pergunta" role="status">
              <span>
                Não entendi. Você disse: <strong>“{pergunta.texto}”</strong>. Edite o texto na barra ou fale de novo.
              </span>
              {micDisponivel && (
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary ui-btn--small"
                  onClick={() => {
                    setPergunta(null);
                    void voz.iniciar();
                  }}
                >
                  Falar de novo
                </button>
              )}
            </div>
          )}

          {!digitando && atalhos.length > 0 && (
            <div className="pc-busca-bloco" role="group" aria-label="Atalhos">
              <span className="pc-busca-titulo">Atalhos</span>
              <div className="pc-busca-chips">
                {atalhos.map((atalho) => (
                  <button
                    key={atalho.id}
                    type="button"
                    className="pc-atalho"
                    onClick={() => {
                      fechar();
                      atalho.onClick();
                    }}
                  >
                    {atalho.rotulo}
                  </button>
                ))}
              </div>
            </div>
          )}
          {!digitando && doRecentes.length > 0 && <span className="pc-busca-titulo">Recentes</span>}

          {lista.map((resultado, posicao) => (
            <button
              key={resultado.destino.id}
              id={`pc-busca-opcao-${posicao}`}
              type="button"
              role="option"
              aria-selected={posicao === indice}
              className={`pc-cmd-option${posicao === indice ? " is-selected" : ""}`}
              onMouseMove={() => setIndice(posicao)}
              onClick={() => escolher(resultado)}
            >
              <span className="pc-cmd-seta" aria-hidden="true">↗</span>
              <span className="pc-cmd-option-textos">
                <span className="pc-cmd-option-title">{resultado.destino.titulo}</span>
                {resultado.destino.detalhe && <span className="pc-cmd-option-detail">{resultado.destino.detalhe}</span>}
              </span>
              {variante !== "campo" && posicao === indice && digitando && <span className="pc-cmd-enter">Enter</span>}
            </button>
          ))}
          {digitando && lista.length === 0 && <div className="pc-cmd-empty">{`Nada encontrado para “${consulta.trim()}”. Tente outra palavra.`}</div>}
          {variante !== "campo" && (
            <div className="pc-cmd-foot" aria-hidden="true">
              <span>Digite para buscar · ↑↓ navegam · Enter abre · Esc fecha</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
