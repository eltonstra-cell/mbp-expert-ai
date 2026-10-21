// Índice do dossiê com a página de cada seção. O navegador só conta as páginas na hora de imprimir, então o app mede a altura de cada
// seção (na largura do papel) e calcula onde ela cai. Cada seção começa em página nova (break-before), por isso o erro só pode vir de
// uma seção que passe de uma página e que o navegador quebre diferente do esperado.

export const ALTURA_UTIL_DA_PAGINA_MM = 253; // A4 (297 mm) menos as margens de cima (26 mm) e de baixo (18 mm)
export const LARGURA_UTIL_DA_PAGINA_MM = 186; // A4 (210 mm) menos 12 mm de cada lado
const PX_POR_MM = 96 / 25.4;

export const alturaUtilEmPx = () => Math.floor(ALTURA_UTIL_DA_PAGINA_MM * PX_POR_MM);
export const larguraUtilEmPx = () => Math.floor(LARGURA_UTIL_DA_PAGINA_MM * PX_POR_MM);

/**
 * Página em que cada seção começa e o total de páginas. `alturaDaCapa` é a capa com o índice (página 1; se passar de uma página,
 * ocupa as necessárias); cada seção começa em página nova e ocupa ceil(altura / página) páginas.
 */
export function paginasDasSecoes(alturaDaCapa: number, alturasDasSecoes: number[], alturaDaPagina: number = alturaUtilEmPx()): { inicio: number[]; total: number } {
  const paginasDe = (altura: number) => Math.max(1, Math.ceil(Math.max(0, altura) / alturaDaPagina));
  let proxima = 1 + paginasDe(alturaDaCapa);
  const inicio = alturasDasSecoes.map((altura) => {
    const pagina = proxima;
    proxima += paginasDe(altura);
    return pagina;
  });
  return { inicio, total: proxima - 1 };
}
