"use client";

import { Children, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactElement, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Menu de escolha no lugar do <select> nativo: claro, baixo (40 px) e com a opção marcada em creme.
// Usa a mesma forma do <select> (filhos <option>, value, onChange com evento.target.value), então a troca nas telas é só o nome da tag.
type Opcao = { valor: string; rotulo: ReactNode; desabilitada: boolean };

type Props = {
  value?: string | number;
  onChange?: (evento: ChangeEvent<HTMLSelectElement>) => void;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  title?: string;
  required?: boolean;
  autoFocus?: boolean;
  onClick?: (evento: React.MouseEvent<HTMLButtonElement>) => void;
  onBlur?: () => void;
  style?: React.CSSProperties;
  "aria-label"?: string;
  "aria-invalid"?: boolean | "true" | "false";
};

function textoDe(no: ReactNode): string {
  if (no === null || no === undefined || typeof no === "boolean") return "";
  if (typeof no === "string" || typeof no === "number") return String(no);
  if (Array.isArray(no)) return no.map(textoDe).join("");
  if (isValidElement(no)) return textoDe((no.props as { children?: ReactNode }).children);
  return "";
}

function opcoesDos(filhos: ReactNode): Opcao[] {
  const lista: Opcao[] = [];
  Children.forEach(filhos, (filho) => {
    if (!isValidElement(filho)) return;
    const elemento = filho as ReactElement<{ value?: string | number; disabled?: boolean; children?: ReactNode }>;
    if (elemento.type === "option") {
      const rotulo = elemento.props.children;
      lista.push({ valor: elemento.props.value !== undefined ? String(elemento.props.value) : textoDe(rotulo), rotulo, desabilitada: Boolean(elemento.props.disabled) });
    } else if (elemento.props.children) {
      lista.push(...opcoesDos(elemento.props.children));
    }
  });
  return lista;
}

export default function Select({ value, onChange, children, className = "", disabled, id, name, title, required, style, autoFocus, onClick, onBlur, ...aria }: Props) {
  const opcoes = opcoesDos(children);
  const atual = String(value ?? "");
  const marcada = opcoes.find((opcao) => opcao.valor === atual) || opcoes[0];
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState<{ left: number; top: number; width: number; maxHeight: number; acima: boolean } | null>(null);
  const [ativa, setAtiva] = useState(0);
  const botaoRef = useRef<HTMLButtonElement | null>(null);
  const listaRef = useRef<HTMLUListElement | null>(null);
  const idLista = useId();

  function medir() {
    const caixa = botaoRef.current?.getBoundingClientRect();
    if (!caixa) return;
    const abaixo = window.innerHeight - caixa.bottom - 12;
    const acima = caixa.top - 12;
    const usarAcima = abaixo < 160 && acima > abaixo;
    setPosicao({ left: caixa.left, top: usarAcima ? caixa.top - 4 : caixa.bottom + 4, width: Math.max(caixa.width, 160), maxHeight: Math.max(120, Math.min(280, usarAcima ? acima : abaixo)), acima: usarAcima });
  }

  useLayoutEffect(() => {
    if (!aberto) return;
    medir();
    setAtiva(Math.max(0, opcoes.findIndex((opcao) => opcao.valor === atual)));
    const reposicionar = () => medir();
    window.addEventListener("resize", reposicionar);
    window.addEventListener("scroll", reposicionar, true);
    return () => {
      window.removeEventListener("resize", reposicionar);
      window.removeEventListener("scroll", reposicionar, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto]);

  useEffect(() => {
    if (!aberto) return;
    function fora(evento: MouseEvent) {
      const alvo = evento.target as Node;
      if (botaoRef.current?.contains(alvo) || listaRef.current?.contains(alvo)) return;
      setAberto(false);
    }
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, [aberto]);

  useEffect(() => {
    if (aberto) listaRef.current?.querySelector<HTMLElement>(`[data-i="${ativa}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ativa, aberto, posicao]);

  function escolher(valor: string) {
    setAberto(false);
    botaoRef.current?.focus();
    if (valor === atual) return;
    const alvo = { value: valor, name: name || "" };
    onChange?.({ target: alvo, currentTarget: alvo } as unknown as ChangeEvent<HTMLSelectElement>);
  }

  function aoTeclar(evento: React.KeyboardEvent) {
    if (disabled) return;
    if (!aberto) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(evento.key)) {
        evento.preventDefault();
        setAberto(true);
      }
      return;
    }
    if (evento.key === "Escape") {
      evento.preventDefault();
      setAberto(false);
    } else if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAtiva((i) => Math.min(opcoes.length - 1, i + 1));
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAtiva((i) => Math.max(0, i - 1));
    } else if (evento.key === "Enter" || evento.key === " ") {
      evento.preventDefault();
      const opcao = opcoes[ativa];
      if (opcao && !opcao.desabilitada) escolher(opcao.valor);
    } else if (evento.key === "Tab") {
      setAberto(false);
    }
  }

  const lista =
    aberto && posicao
      ? createPortal(
          <ul
            ref={listaRef}
            id={idLista}
            role="listbox"
            className="sel-lista"
            style={{ left: posicao.left, width: posicao.width, maxHeight: posicao.maxHeight, ...(posicao.acima ? { bottom: window.innerHeight - posicao.top } : { top: posicao.top }) }}
          >
            {opcoes.map((opcao, indice) => (
              <li
                key={`${opcao.valor}-${indice}`}
                data-i={indice}
                role="option"
                aria-selected={opcao.valor === atual}
                aria-disabled={opcao.desabilitada || undefined}
                className={`sel-opcao${opcao.valor === atual ? " is-marcada" : ""}${indice === ativa ? " is-ativa" : ""}${opcao.desabilitada ? " is-desabilitada" : ""}`}
                onMouseEnter={() => setAtiva(indice)}
                onMouseDown={(evento) => {
                  evento.preventDefault();
                  if (!opcao.desabilitada) escolher(opcao.valor);
                }}
              >
                {opcao.rotulo}
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        id={id}
        title={title}
        style={style}
        disabled={disabled}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? idLista : undefined}
        aria-required={required || undefined}
        {...aria}
        className={`sel-botao ${className}`.trim()}
        data-valor={atual}
        autoFocus={autoFocus}
        onBlur={onBlur}
        onClick={(evento) => {
          onClick?.(evento);
          if (!disabled) setAberto((a) => !a);
        }}
        onKeyDown={aoTeclar}
      >
        <span className={`sel-texto${marcada?.valor === "" ? " is-vazio" : ""}`}>{marcada?.rotulo}</span>
        <span className="sel-seta" aria-hidden="true">▾</span>
      </button>
      {lista}
    </>
  );
}
