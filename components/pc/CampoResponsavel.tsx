"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { mesmaPessoa, nomeNormalizado, pessoasDaLista, rotulosDasPessoas } from "@/lib/pessoas";

const ALTURA_DA_OPCAO = 44;
const OPCOES_VISIVEIS = 6;
const MARGEM = 8;

type Posicao = { left: number; width: number; top?: number; bottom?: number; maxima: number; acima: boolean };

const mesmaPosicao = (a: Posicao | null, b: Posicao) => !!a && a.left === b.left && a.width === b.width && a.top === b.top && a.bottom === b.bottom && a.maxima === b.maxima && a.acima === b.acima;

/**
 * Campo único do Responsável (combobox): fechado mostra "Escolha uma pessoa ▾" ou "✓ Nome ▾"; aberto, a lista cola no campo com uma
 * opção por pessoa (todas, em ordem alfabética) e, no fim, "+ Outra pessoa…", que troca o campo por digitação. O texto em digitação
 * fica SÓ aqui dentro: só vira responsável (normalizado) ao confirmar; se o campo some com texto preenchido (troca de correção ou de
 * etapa, sem blur), o texto é CONFIRMADO normalizado por `aoSairComTexto`, para nada se perder em silêncio. A lista vai para o fim do
 * body (posição fixa, calculada pelo campo), então a rolagem e o overflow da lateral nunca a cortam.
 */
export default function CampoResponsavel({
  id,
  valor,
  pessoas,
  rotuloId,
  erro,
  erroId,
  onEscolher,
  onDigitando,
  aoSairComTexto,
}: {
  id: string;
  valor: string;
  pessoas: string[];
  rotuloId: string;
  /** Mostra o campo em vermelho (o aviso de texto fica fora, na região aria-live). */
  erro: boolean;
  erroId: string;
  /** Recebe SEMPRE o nome já normalizado. */
  onEscolher: (nome: string) => void;
  /** Avisa quando o usuário abriu "+ Outra pessoa…" (o erro de "vazio" não deve aparecer durante a digitação). */
  onDigitando?: (digitando: boolean) => void;
  /** O campo foi desmontado com texto preenchido: recebe o nome normalizado para guardar. */
  aoSairComTexto?: (nome: string) => void;
}) {
  const nomes = useMemo(() => pessoasDaLista({ cadastradas: pessoas, escolhido: valor }), [pessoas, valor]);
  const rotulos = useMemo(() => rotulosDasPessoas(nomes), [nomes]);
  const indiceEscolhido = nomes.findIndex((nome) => mesmaPessoa(nome, valor));
  const escolhido = indiceEscolhido >= 0 ? nomes[indiceEscolhido] : "";
  const idLista = `${id}-lista`;
  const idOpcao = (indice: number) => `${id}-opcao-${indice}`;
  const idValor = `${id}-valor`;

  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [pedidoDeDigitar, setPedidoDeDigitar] = useState(false);
  const [texto, setTexto] = useState("");
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const seletorRef = useRef<HTMLDivElement | null>(null);
  const listaRef = useRef<HTMLDivElement | null>(null);
  const campoRef = useRef<HTMLInputElement | null>(null);
  const devolverFoco = useRef(false);
  const saindo = useRef(false);
  const ativoPeloMouse = useRef(false);
  // Sem nenhuma pessoa para escolher o campo já é de digitação (como antes).
  const digitando = pedidoDeDigitar || nomes.length === 0;
  const totalDeOpcoes = nomes.length + 1;
  const listaPronta = posicao !== null;

  // Valores mais novos para o efeito de desmontagem.
  const vivo = useRef({ texto, pedidoDeDigitar, pessoas, aoSairComTexto });
  vivo.current = { texto, pedidoDeDigitar, pessoas, aoSairComTexto };

  const abrirLista = () => {
    setAtivo(indiceEscolhido >= 0 ? indiceEscolhido : 0);
    setAberto(true);
  };
  const escolher = (indice: number) => {
    if (indice >= nomes.length) {
      saindo.current = false;
      setTexto("");
      setAberto(false);
      setPedidoDeDigitar(true);
      return;
    }
    onEscolher(nomes[indice]);
    setAberto(false);
  };
  // Enter ou sair do campo confirma (vazio restaura o valor de antes, que nunca saiu de lá); Esc cancela.
  const encerrarDigitacao = (confirmar: boolean, comFoco: boolean) => {
    if (saindo.current) return;
    saindo.current = true;
    const bruto = (campoRef.current?.value ?? texto).trim();
    if (confirmar && bruto) onEscolher(nomeNormalizado(bruto, pessoas));
    // Com a lista vazia o campo de digitação continua na tela (o foco fica nele), a menos que um nome tenha sido confirmado.
    devolverFoco.current = comFoco && (nomes.length > 0 || (confirmar && Boolean(bruto)));
    setTexto("");
    setPedidoDeDigitar(false);
  };

  useEffect(() => {
    onDigitando?.(pedidoDeDigitar);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pedidoDeDigitar]);
  useEffect(() => {
    if (!digitando && devolverFoco.current) {
      seletorRef.current?.focus();
      devolverFoco.current = false;
    }
  }, [digitando]);
  useEffect(
    () => () => {
      const atual = vivo.current;
      if (atual.pedidoDeDigitar && !saindo.current && atual.texto.trim()) atual.aoSairComTexto?.(nomeNormalizado(atual.texto, atual.pessoas));
    },
    [],
  );

  // Posição fixa colada no campo; reposiciona ao rolar ou redimensionar. Cola embaixo (sem passar do rodapé fixo); sobe só se não cabe
  // embaixo e há mais espaço em cima; nunca passa da janela. Se o campo sai da área visível do corpo, a lista fecha.
  useLayoutEffect(() => {
    if (!aberto) {
      setPosicao(null);
      return;
    }
    const campo = seletorRef.current;
    if (!campo) return;
    const corpo = campo.closest<HTMLElement>(".pc-detail-corpo");
    const alturaDaLista = () => Math.min(Math.min(totalDeOpcoes, OPCOES_VISIVEIS + 1) * ALTURA_DA_OPCAO + 2, window.innerHeight - 2 * MARGEM);
    const limiteDeBaixo = (caixa: DOMRect) => {
      const rodape = document.querySelector(".pc-detail-foot")?.getBoundingClientRect();
      return Math.min(window.innerHeight, rodape && rodape.top >= caixa.bottom - 1 ? rodape.top : window.innerHeight) - MARGEM;
    };
    // Coluna única (até 1149 px): o corpo rola inteiro; ao abrir, leva o campo para cima para a lista abrir para baixo, sem cobrir o rótulo.
    const lateral = campo.closest<HTMLElement>(".pc-detail-lateral");
    if (corpo && lateral && getComputedStyle(lateral).position !== "sticky") {
      const caixa = campo.getBoundingClientRect();
      const faltaDeEspaco = alturaDaLista() - (limiteDeBaixo(caixa) - caixa.bottom);
      const podeSubir = caixa.top - corpo.getBoundingClientRect().top - MARGEM;
      const deslocar = Math.min(faltaDeEspaco, podeSubir);
      if (deslocar > 0) corpo.scrollTop += deslocar;
    }
    const medir = () => {
      const caixa = campo.getBoundingClientRect();
      const area = (corpo ?? document.documentElement).getBoundingClientRect();
      const centro = (caixa.top + caixa.bottom) / 2;
      if (corpo && (centro < area.top || centro > area.bottom)) {
        setAberto(false);
        return;
      }
      const altura = alturaDaLista();
      const espacoAbaixo = limiteDeBaixo(caixa) - caixa.bottom;
      const espacoAcima = caixa.top - MARGEM;
      const acima = altura > espacoAbaixo && espacoAcima > espacoAbaixo;
      const maxima = Math.min(Math.max(Math.min(altura, acima ? espacoAcima : espacoAbaixo), Math.min(3 * ALTURA_DA_OPCAO, window.innerHeight - 2 * MARGEM)), window.innerHeight - 2 * MARGEM);
      const nova: Posicao = acima
        ? { left: caixa.left, width: caixa.width, bottom: window.innerHeight - caixa.top, maxima, acima }
        : { left: caixa.left, width: caixa.width, top: caixa.bottom, maxima, acima };
      setPosicao((atual) => (mesmaPosicao(atual, nova) ? atual : nova));
    };
    // Rolar a própria lista não reposiciona nada (e não puxa a opção ativa de volta).
    const aoRolar = (evento: Event) => {
      if (evento.target instanceof Node && listaRef.current?.contains(evento.target)) return;
      medir();
    };
    medir();
    window.addEventListener("resize", medir);
    window.addEventListener("scroll", aoRolar, true);
    return () => {
      window.removeEventListener("resize", medir);
      window.removeEventListener("scroll", aoRolar, true);
    };
  }, [aberto, totalDeOpcoes]);

  // A opção ativa pelo teclado nunca fica escondida (a última, "+ Outra pessoa…", é fixa no fim da lista). Só depende de abrir e da opção ativa.
  useEffect(() => {
    if (!aberto || !listaPronta) return;
    if (ativoPeloMouse.current) {
      ativoPeloMouse.current = false;
      return;
    }
    document.getElementById(idOpcao(ativo))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, ativo, listaPronta]);

  const aoTeclar = (evento: React.KeyboardEvent<HTMLDivElement>) => {
    const tecla = evento.key;
    if (!aberto) {
      if (tecla === "Enter" || tecla === " " || tecla === "ArrowDown" || tecla === "ArrowUp") {
        evento.preventDefault();
        abrirLista();
      }
      return;
    }
    if (tecla === "Escape") {
      evento.preventDefault();
      evento.stopPropagation();
      setAberto(false);
    } else if (tecla === "ArrowDown") {
      evento.preventDefault();
      setAtivo((atual) => Math.min(atual + 1, totalDeOpcoes - 1));
    } else if (tecla === "ArrowUp") {
      evento.preventDefault();
      setAtivo((atual) => Math.max(atual - 1, 0));
    } else if (tecla === "Home") {
      evento.preventDefault();
      setAtivo(0);
    } else if (tecla === "End") {
      evento.preventDefault();
      setAtivo(totalDeOpcoes - 1);
    } else if (tecla === "Enter" || tecla === " ") {
      evento.preventDefault();
      escolher(ativo);
    }
  };
  const ativarPeloMouse = (indice: number) => {
    if (ativo === indice) return;
    ativoPeloMouse.current = true;
    setAtivo(indice);
  };

  if (digitando) {
    return (
      <div className="pc-resp">
        <input
          ref={campoRef}
          id={id}
          className="ui-input pc-resp-digitar"
          value={texto}
          autoFocus={pedidoDeDigitar}
          autoComplete="off"
          onFocus={() => {
            saindo.current = false;
          }}
          onChange={(evento) => {
            saindo.current = false;
            setTexto(evento.target.value);
          }}
          onBlur={() => encerrarDigitacao(true, false)}
          onKeyDown={(evento) => {
            if (evento.key === "Escape") {
              evento.preventDefault();
              evento.stopPropagation();
              encerrarDigitacao(false, true);
            } else if (evento.key === "Enter") {
              evento.preventDefault();
              encerrarDigitacao(true, true);
            }
          }}
          placeholder="Digite o nome e Enter"
          aria-label="Nome do responsável"
          aria-invalid={erro}
          aria-describedby={erro ? erroId : undefined}
        />
      </div>
    );
  }

  const rotuloEscolhido = indiceEscolhido >= 0 ? rotulos[indiceEscolhido] : "";
  return (
    <div className="pc-resp">
      <div
        ref={seletorRef}
        id={id}
        role="combobox"
        tabIndex={0}
        className={`pc-resp-seletor${aberto ? " is-aberto" : ""}${aberto && posicao?.acima ? " is-acima" : ""}${erro && !aberto ? " is-erro" : ""}${escolhido ? "" : " is-vazio"}`}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? idLista : undefined}
        aria-activedescendant={aberto ? idOpcao(ativo) : undefined}
        aria-label={escolhido ? `Responsável: ${escolhido}` : undefined}
        aria-labelledby={escolhido ? undefined : `${rotuloId} ${idValor}`}
        aria-describedby={erro ? erroId : undefined}
        aria-invalid={erro}
        title={escolhido || undefined}
        onClick={() => (aberto ? setAberto(false) : abrirLista())}
        onKeyDown={aoTeclar}
        onBlur={() => setAberto(false)}
      >
        <span id={idValor} className="pc-resp-valor">
          {escolhido ? (
            <>
              <span aria-hidden="true">✓ </span>
              {rotuloEscolhido}
            </>
          ) : (
            "Escolha uma pessoa"
          )}
        </span>
        <span className="pc-resp-seta" aria-hidden="true">
          ▾
        </span>
      </div>
      {aberto &&
        posicao &&
        createPortal(
          <div
            ref={listaRef}
            id={idLista}
            role="listbox"
            aria-labelledby={rotuloId}
            className={`pc-resp-lista${posicao.acima ? " is-acima" : ""}`}
            style={{ left: posicao.left, width: posicao.width, top: posicao.top, bottom: posicao.bottom, maxHeight: posicao.maxima }}
            onMouseDown={(evento) => evento.preventDefault()}
          >
            {nomes.map((nome, indice) => {
              const marcada = indice === indiceEscolhido;
              return (
                <div
                  key={nome}
                  id={idOpcao(indice)}
                  role="option"
                  aria-selected={marcada}
                  title={nome}
                  className={`pc-resp-opcao${marcada ? " is-escolhida" : ""}${indice === ativo ? " is-ativa" : ""}`}
                  onMouseMove={() => ativarPeloMouse(indice)}
                  onClick={() => escolher(indice)}
                >
                  {marcada && <span aria-hidden="true">✓ </span>}
                  {rotulos[indice]}
                </div>
              );
            })}
            <div
              id={idOpcao(nomes.length)}
              role="option"
              aria-selected={false}
              className={`pc-resp-opcao pc-resp-opcao--outra${ativo === nomes.length ? " is-ativa" : ""}`}
              onMouseMove={() => ativarPeloMouse(nomes.length)}
              onClick={() => escolher(nomes.length)}
            >
              + Outra pessoa…
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
