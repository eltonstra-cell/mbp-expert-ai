// Capa do POP (os 6 estilos). Escrito sem JSX (createElement) para que os testes consigam desenhar a capa de verdade com react-dom/server.
// Tudo é medido em cqw (largura da própria capa): a mesma capa serve para a miniatura, a pré-visualização e a página A4 do PDF.
import { createElement as h, type CSSProperties, type ReactElement } from "react";
import type { ModeloDaCapa } from "../lib/capaPop.ts";

type Props = { modelo: ModeloDaCapa; className?: string };

function Icone({ modelo }: { modelo: ModeloDaCapa }): ReactElement | null {
  const icone = modelo.icone;
  if (!icone) return null;
  if (icone.tipo === "traco") {
    // Ícone de traço: uma cor só, a da capa (máscara pintada com a cor do ícone).
    const estilo = { WebkitMaskImage: `url(${icone.url})`, maskImage: `url(${icone.url})` } as CSSProperties;
    return h("span", { className: "cp-icone cp-icone--traco", style: estilo, "aria-hidden": true });
  }
  return h("img", { className: "cp-icone cp-icone--cor", src: icone.url, alt: "", "aria-hidden": true });
}

function Texto({ modelo }: { modelo: ModeloDaCapa }): ReactElement {
  return h(
    "div",
    { className: "cp-texto" },
    modelo.barraCurta ? h("div", { className: "cp-barra" }) : null,
    modelo.codigo ? h("div", { className: "cp-codigo" }, modelo.codigo) : null,
    h("div", { className: "cp-titulo" }, modelo.titulo),
    modelo.empresaNoCorpo ? h("div", { className: "cp-empresa" }, modelo.empresaNoCorpo) : null,
    h("div", { className: "cp-versao" }, modelo.versao)
  );
}

export default function CapaDoPop({ modelo, className = "" }: Props): ReactElement {
  const variaveis = { "--cp-acc": modelo.hex, "--cp-clara": modelo.clara, "--cp-ico": modelo.corDoIcone } as CSSProperties;
  const logotipo = modelo.logotipo
    ? modelo.logotipo.presente
      ? h("img", { className: "cp-logo", src: modelo.logotipo.src, alt: "Logotipo da empresa" })
      : h("div", { className: "cp-logo cp-logo--vazio" }, "Logotipo da empresa")
    : null;
  const rodape = modelo.rodape
    ? h("div", { className: "cp-rodape" }, h("span", null, modelo.rodape.esquerda), modelo.rodape.direita ? h("span", null, modelo.rodape.direita) : null)
    : null;

  let corpo: ReactElement;
  switch (modelo.estilo) {
    case "D":
      corpo = h("div", { className: "cp-esquerda" }, h(Icone, { modelo }), h(Texto, { modelo }));
      break;
    case "E":
      corpo = h("div", { className: "cp-centro" }, h("div", { className: "cp-circulo" }, h(Icone, { modelo })), h(Texto, { modelo }));
      break;
    case "F":
      corpo = h("div", { className: "cp-bloco" }, h(Icone, { modelo }));
      break;
    default:
      corpo = h("div", { className: "cp-centro" }, h(Icone, { modelo }), h(Texto, { modelo }));
  }

  return h(
    "div",
    { className: `capa-pop capa-pop--${modelo.estilo} ${className}`.trim(), style: variaveis, role: "img", "aria-label": `Capa do POP ${modelo.codigo} ${modelo.titulo}`.trim() },
    modelo.estilo === "B" ? h("div", { className: "cp-faixa-topo" }) : null,
    modelo.estilo === "D" ? h("div", { className: "cp-faixa-lateral" }) : null,
    modelo.estilo === "E" ? h("div", { className: "cp-moldura" }) : null,
    logotipo,
    corpo,
    modelo.estilo === "F" ? h("div", { className: "cp-embaixo" }, h(Texto, { modelo })) : null,
    rodape
  );
}
