// Rodapé do PDF gerado pela impressão do navegador (texto selecionável).
// Usa as caixas de margem do @page (empresa, selo e "Página X de Y"), que só existem no Chromium 131+.

export function textoParaCss(texto: string): string {
  return (texto || "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .trim();
}

/** Chrome e Edge a partir da versão 131 desenham o conteúdo das caixas de margem na impressão. */
export function suportaCaixasDeMargem(marcas: { brand: string; version: string }[] | undefined, userAgent = ""): boolean {
  const versaoDe = (valor: string | undefined) => Number.parseInt(valor || "0", 10) || 0;
  const chromium = marcas?.find((marca) => /chromium/i.test(marca.brand));
  if (chromium) return versaoDe(chromium.version) >= 131;
  const achado = /(?:Chrome|Edg)\/(\d+)/.exec(userAgent);
  return achado ? versaoDe(achado[1]) >= 131 : false;
}

export function cssDoRodapeDeImpressao(opcoes: { empresa: string; selo: string; comCaixasDeMargem: boolean }): string {
  if (!opcoes.comCaixasDeMargem) return "";
  const empresa = textoParaCss(opcoes.empresa.slice(0, 60));
  const selo = textoParaCss(opcoes.selo);
  const base = "font-family:" + FONTE_DA_MARGEM + ";font-size:8pt;color:#64748B;";
  return `@media print{@page{margin:12mm 11mm 18mm 11mm;@bottom-left{content:"${empresa}";${base}}@bottom-center{content:"${selo}";${base}color:#12202B;}@bottom-right{content:"Página " counter(page) " de " counter(pages);${base}}}}`;
}

// ===== Cabeçalho e rodapé de documentos impressos (relatório emitido, resumo de uma página, dossiê) =====
// Escolha técnica: caixas de margem do @page (Chrome e Edge 131 ou mais). Elas repetem o cabeçalho e o "Página X de Y" em TODAS as páginas.
// Sem suporte (Firefox, Safari), o documento traz a identificação no começo da primeira página e não tem o número das páginas.

export type CabecalhoDeImpressao = {
  /** Linhas do canto esquerdo (ex.: nome da empresa e CNPJ). */
  esquerda: string[];
  /** Linhas do canto direito (ex.: número do relatório, versão, data de emissão e motivo da versão). */
  direita: string[];
  /** Texto do rodapé, ao lado do "Página X de Y". */
  rodape?: string;
  /** Seletores do corpo que repetem o cabeçalho corrido e saem do papel quando as caixas de margem existem (sem elas, ficam). */
  ocultarNoCorpo?: string[];
};

/** A mesma fonte do corpo do app nos cabeçalhos e rodapés da margem (a variável vem do <html>). */
export const FONTE_DA_MARGEM = 'var(--font-body),"Nunito Sans","Segoe UI",system-ui,sans-serif';

/** Linhas de um texto de CSS: cada linha vira "\A " (quebra) e o texto é protegido contra aspas e barras. */
export function linhasParaCss(linhas: string[]): string {
  return linhas
    .map((linha) => textoParaCss((linha || "").slice(0, 80)))
    .filter(Boolean)
    .join("\\A ");
}

export function cssDoDocumentoImpresso(opcoes: { cabecalho: CabecalhoDeImpressao; comCaixasDeMargem: boolean }): string {
  if (!opcoes.comCaixasDeMargem) return "";
  const { cabecalho } = opcoes;
  const base = "font-family:" + FONTE_DA_MARGEM + ";font-size:8pt;line-height:1.35;color:#12202B;white-space:pre-line;";
  const esquerda = linhasParaCss(cabecalho.esquerda);
  const direita = linhasParaCss(cabecalho.direita);
  const rodape = textoParaCss((cabecalho.rodape || "").slice(0, 80));
  return (
    `@media print{@page{size:A4;margin:26mm 12mm 18mm 12mm;` +
    `@top-left{content:"${esquerda}";${base}text-align:left;vertical-align:bottom;padding-bottom:3mm;border-bottom:0.3mm solid #B4C2CE;}` +
    `@top-right{content:"${direita}";${base}text-align:right;vertical-align:bottom;padding-bottom:3mm;border-bottom:0.3mm solid #B4C2CE;}` +
    `@bottom-left{content:"${rodape}";${base}text-align:left;}` +
    `@bottom-right{content:"Página " counter(page) " de " counter(pages);${base}text-align:right;}}}` +
    // O que o cabeçalho corrido já diz não se repete no corpo (só quando as caixas de margem existem, que é este ramo).
    (cabecalho.ocultarNoCorpo || []).map((seletor) => `@media print{${seletor}{display:none!important}}`).join("") +
    // Capa opcional (página nomeada "capa"): sem cabeçalho corrido e sem rodapé. O número da página continua contando a capa, mas ela não mostra número.
    `@media print{@page capa{@top-left{content:none;border:0}@top-right{content:none;border:0}@bottom-left{content:none}@bottom-right{content:none}}}`
  );
}
