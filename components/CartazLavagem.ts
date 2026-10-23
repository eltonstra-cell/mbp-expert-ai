// Cartaz "Como lavar as mãos" (A4 vertical, 794 x 1123 px a 96 dpi, uma página) em 5 estilos. Escrito sem JSX (createElement) para os testes
// poderem desenhar de verdade com react-dom/server. Tudo é medido em "u" (1 u = 1 px da página de 794 px) e escala com a largura.
import { createElement as h, type CSSProperties, type ReactElement, type ReactNode } from "react";
import {
  PASTA_DAS_ILUSTRACOES,
  disposicaoDaGrade,
  disposicaoDaLinhaDoTempo,
  estiloDoCartaz,
  subtituloDoCartaz,
  subtituloEditorial,
  type CartaoDoCartaz,
  type DadosDoCartaz,
} from "../lib/cartazLavagem.ts";

type Props = {
  dados: DadosDoCartaz;
  /** Só na pré-visualização da configuração: a caixa tracejada do logotipo aparece quando não há logotipo. No PDF final fica vazio. */
  previa?: boolean;
  className?: string;
};

/** Círculos decorativos: [esquerda, topo, diâmetro] em u. */
const BOLHAS: [number, number, number][] = [[620, 40, 70], [700, 130, 34], [561, 150, 22], [30, 200, 26], [120, 1040, 28], [740, 1050, 30], [715, 960, 80]];
const CIRCULOS_PASTEL: { x: number; y: number; d: number; cor: string }[] = [
  { x: 560, y: 25, d: 90, cor: "#FDE6D8" },
  { x: 500, y: 110, d: 24, cor: "#DDEEF8" },
  { x: 660, y: 90, d: 52, cor: "#DFF1E4" },
  { x: 700, y: 30, d: 24, cor: "#FCEFC7" },
];

const u = (n: number) => `calc(var(--u) * ${n})`;

/** `transparente`: versão PNG sem o fundo branco (Pastel colorido: o desenho se funde à cor do cartão sem mix-blend-mode, que rasterizaria a página do PDF). */
function Imagem({ cartao, transparente = false }: { cartao: CartaoDoCartaz; transparente?: boolean }): ReactElement {
  const src = transparente ? `${PASTA_DAS_ILUSTRACOES}/transparente/${cartao.arquivo.replace(/.jpg$/, ".png")}` : `${PASTA_DAS_ILUSTRACOES}/${cartao.arquivo}`;
  return h("img", { className: "cz-imagem", src, alt: "" });
}

function Logo({ dados, previa }: { dados: DadosDoCartaz; previa: boolean }): ReactElement | null {
  if (dados.logotipo) return h("img", { className: "cz-logo", src: dados.logotipo, alt: "Logotipo da empresa" });
  return previa ? h("div", { className: "cz-logo cz-logo--vazio" }, "Logotipo da empresa") : null;
}

function Quadro({ dados, estilo, style }: { dados: DadosDoCartaz; estilo: string; style?: CSSProperties }): ReactElement | null {
  const itens = dados.conteudo.sempreQue;
  if (itens.length === 0) return null;
  if (estilo === "editorial") {
    return h(
      "div",
      { className: "cz-quadro", style },
      h("div", { className: "cz-quadro-titulo" }, "LAVE AS MÃOS SEMPRE QUE"),
      h("ul", { className: "cz-lista" }, itens.map((item) => h("li", { key: item, className: "cz-item" }, item)))
    );
  }
  return h(
    "div",
    { className: "cz-quadro", style },
    h("div", { className: "cz-quadro-titulo" }, "LAVE AS MÃOS SEMPRE QUE"),
    h("div", { className: "cz-chips" }, itens.map((item) => h("span", { key: item, className: "cz-chip" }, item)))
  );
}

function Grade({ dados, estilo }: { dados: DadosDoCartaz; estilo: string }): ReactElement {
  const cartoes = dados.conteudo.cartoes;
  const disposicao = disposicaoDaGrade(cartoes.length);
  const estiloQuadro: CSSProperties = disposicao.quadro.tipo === "faixa" ? { gridColumn: "1 / -1" } : { gridColumn: `span ${disposicao.quadro.colunas}` };
  const filhos: ReactNode[] = cartoes.map((cartao, indice) => {
    const numero = estilo === "editorial" ? String(cartao.numero).padStart(2, "0") : String(cartao.numero);
    return h(
      "div",
      { key: cartao.arquivo, className: `cz-cartao cz-cartao--c${indice % 4}` },
      h("span", { className: "cz-numero" }, numero),
      h(Imagem, { cartao, transparente: estilo === "pastel" }),
      h("span", { className: "cz-rotulo" }, cartao.rotulo)
    );
  });
  const quadro = h(Quadro, { key: "sempre-que", dados, estilo, style: estiloQuadro });
  const linhas = `repeat(${disposicao.linhasDeCartoes}, var(--cz-alt))${disposicao.quadro.tipo === "faixa" ? " auto" : ""}`;
  return h("div", { className: `cz-grade${disposicao.denso ? " cz-grade--densa" : ""}`, style: { gridTemplateRows: linhas } as CSSProperties }, filhos, quadro);
}

function LinhaDoTempo({ dados }: { dados: DadosDoCartaz }): ReactElement {
  const cartoes = dados.conteudo.cartoes;
  const disposicao = disposicaoDaLinhaDoTempo(cartoes.length);
  const passo = (cartao: CartaoDoCartaz, ultimo: boolean) =>
    h(
      "div",
      { key: cartao.arquivo, className: `cz-passo${ultimo ? " cz-passo--ultimo" : ""}` },
      h("span", { className: "cz-numero" }, String(cartao.numero)),
      h("span", { className: "cz-miniatura" }, h(Imagem, { cartao })),
      h("span", { className: "cz-rotulo" }, cartao.rotulo)
    );
  const esquerda = cartoes.slice(0, disposicao.esquerda);
  const direita = cartoes.slice(disposicao.esquerda);
  const quadro = h(Quadro, { dados, estilo: "linha" });
  return h(
    "div",
    { className: `cz-colunas${disposicao.denso ? " cz-colunas--densa" : ""}` },
    h("div", { className: "cz-coluna" }, h("div", { className: "cz-trilha" }, esquerda.map((c, i) => passo(c, i === esquerda.length - 1)))),
    h("div", { className: "cz-coluna cz-coluna--direita" }, h("div", { className: "cz-trilha" }, direita.map((c, i) => passo(c, i === direita.length - 1))), disposicao.quadro === "coluna" ? h("div", { className: "cz-quadro-coluna" }, quadro) : null),
    disposicao.quadro === "faixa" ? h("div", { className: "cz-quadro-faixa" }, quadro) : null
  );
}

export default function CartazLavagem({ dados, previa = false, className = "" }: Props): ReactElement {
  const estilo = estiloDoCartaz(dados.estilo);
  const total = dados.conteudo.cartoes.length;
  const subtitulo = estilo === "editorial" ? subtituloEditorial(total) : subtituloDoCartaz(total);
  const logo = h(Logo, { dados, previa });

  let decoracao: ReactNode = null;
  if (estilo === "agua") {
    decoracao = BOLHAS.map(([x, y, d]) => h("span", { key: `${x}-${y}`, className: "cz-bolha", style: { left: u(x), top: u(y), width: u(d), height: u(d) } as CSSProperties }));
  } else if (estilo === "pastel") {
    decoracao = CIRCULOS_PASTEL.map((c) => h("span", { key: `${c.x}-${c.y}`, className: "cz-bolha", style: { left: u(c.x), top: u(c.y), width: u(c.d), height: u(c.d), background: c.cor } as CSSProperties }));
  }

  let titulo: ReactNode;
  switch (estilo) {
    case "azulejo":
      titulo = h("h1", { className: "cz-titulo" }, "COMO LAVAR AS MÃOS");
      break;
    case "editorial":
      titulo = h("h1", { className: "cz-titulo" }, "Como lavar", h("br"), "as mãos");
      break;
    case "pastel":
      titulo = h("h1", { className: "cz-titulo" }, h("span", { className: "cz-p1" }, "COMO"), " ", h("span", { className: "cz-p2" }, "LAVAR"), h("br"), h("span", { className: "cz-p3" }, "AS"), " ", h("span", { className: "cz-p4" }, "MÃOS"));
      break;
    case "linha":
      titulo = h("h1", { className: "cz-titulo" }, "COMO LAVAR", h("br"), "AS MÃOS", h("span", { className: "cz-ponto" }, "."));
      break;
    default:
      titulo = h("h1", { className: "cz-titulo" }, "COMO LAVAR", h("br"), "AS MÃOS");
  }

  return h(
    "div",
    { className: `cz cz--${estilo} ${className}`.trim(), role: "img", "aria-label": "Cartaz Como lavar as mãos" },
    h(
      "div",
      { className: "cz-pagina" },
      estilo === "azulejo" ? h("div", { className: "cz-faixa" }) : null,
      estilo === "azulejo" ? h("div", { className: "cz-listra" }) : null,
      decoracao,
      logo,
      titulo,
      estilo === "editorial" ? h("div", { className: "cz-barra" }) : null,
      h("p", { className: "cz-subtitulo" }, subtitulo),
      estilo === "linha" ? h(LinhaDoTempo, { dados }) : h(Grade, { dados, estilo }),
      h("div", { className: "cz-rodape" }, dados.rodape)
    )
  );
}
