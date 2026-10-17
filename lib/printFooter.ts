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
  const base = "font-family:Helvetica,Arial,sans-serif;font-size:8pt;color:#64748B;";
  return `@media print{@page{margin:12mm 11mm 18mm 11mm;@bottom-left{content:"${empresa}";${base}}@bottom-center{content:"${selo}";${base}color:#12202B;}@bottom-right{content:"Página " counter(page) " de " counter(pages);${base}}}}`;
}
