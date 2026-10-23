// Cartaz "Como lavar as mãos" (A4 vertical, 794 x 1123 px a 96 dpi, uma página). Escrito sem JSX (createElement) para os testes
// poderem desenhar de verdade com react-dom/server. Tudo é medido em "u" (1 u = 1 px da página de 794 px) e escala com a largura.
import { createElement as h, type CSSProperties, type ReactElement } from "react";
import { PASTA_DAS_ILUSTRACOES, posicaoDoQuadro, subtituloDoCartaz, temaDoCartaz, type DadosDoCartaz } from "../lib/cartazLavagem.ts";

type Props = {
  dados: DadosDoCartaz;
  /** Só na pré-visualização da configuração: a caixa tracejada do logotipo aparece quando não há logotipo. No PDF final fica vazio. */
  previa?: boolean;
  className?: string;
};

export default function CartazLavagem({ dados, previa = false, className = "" }: Props): ReactElement {
  const tema = temaDoCartaz(dados.tema);
  const variaveis = { "--cz-titulo": tema.titulo, "--cz-acento": tema.acento, "--cz-forma": tema.forma, "--cz-quadro": tema.quadro, "--cz-fundo": tema.fundo } as CSSProperties;
  const quadro = posicaoDoQuadro(dados.conteudo.cartoes.length);

  const logotipo = dados.logotipo
    ? h("img", { className: "cz-logo", src: dados.logotipo, alt: "Logotipo da empresa" })
    : previa
      ? h("div", { className: "cz-logo cz-logo--vazio" }, "Logotipo")
      : null;

  const cartoes = dados.conteudo.cartoes.map((cartao) =>
    h(
      "div",
      { key: cartao.arquivo, className: "cz-cartao" },
      h("span", { className: "cz-numero" }, String(cartao.numero)),
      h("img", { className: "cz-imagem", src: `${PASTA_DAS_ILUSTRACOES}/${cartao.arquivo}`, alt: "" }),
      h("span", { className: "cz-rotulo" }, cartao.rotulo)
    )
  );

  const sempreQue =
    dados.conteudo.sempreQue.length > 0
      ? h(
          "div",
          { key: "sempre-que", className: "cz-quadro", style: quadro.colunas === 2 ? ({ gridColumn: "span 2" } as CSSProperties) : undefined },
          h("div", { className: "cz-quadro-titulo" }, "LAVE AS MÃOS SEMPRE QUE"),
          h("div", { className: "cz-chips" }, dados.conteudo.sempreQue.map((item) => h("span", { key: item, className: "cz-chip" }, item)))
        )
      : null;

  return h(
    "div",
    { className: `cz cz--${tema.id} ${className}`.trim(), style: variaveis, role: "img", "aria-label": "Cartaz Como lavar as mãos" },
    h(
      "div",
      { className: "cz-pagina" },
      h("div", { className: "cz-forma cz-forma--a" }),
      h("div", { className: "cz-forma cz-forma--b" }),
      logotipo,
      h("h1", { className: "cz-titulo" }, "COMO LAVAR", h("br"), "AS MÃOS"),
      h("p", { className: "cz-subtitulo" }, subtituloDoCartaz(dados.conteudo.cartoes.length)),
      h("div", { className: "cz-grade" }, cartoes, sempreQue),
      h("div", { className: "cz-rodape" }, dados.rodape)
    )
  );
}
