// Onde cortar o relatório em páginas A4: enche cada página e nunca corta um cartão no meio.

export type BlocoProtegido = {
  top: number;
  bottom: number;
  height: number;
  /** Bloco montado à mão (ex.: título + primeira linha de fotos): protege mesmo contendo outros. */
  sintetico?: boolean;
};

export type Corte = { inicio: number; fim: number };

function marcarPais(blocos: BlocoProtegido[]): (BlocoProtegido & { pai: boolean })[] {
  return blocos.map((bloco) => ({
    ...bloco,
    pai:
      !bloco.sintetico &&
      blocos.some(
        (outro) => outro !== bloco && outro.top >= bloco.top - 1 && outro.bottom <= bloco.bottom + 1 && outro.height < bloco.height - 2
      ),
  }));
}

/**
 * Cortes em pixels. Um bloco que contém outros (pai) não obriga a página inteira a ir para a seguinte:
 * o corte cai antes do cartão de dentro que atravessa a quebra, e não antes do bloco de fora.
 */
export function calcularCortes(entrada: { alturaTotal: number; alturaPagina: number; folga: number; blocos: BlocoProtegido[] }): Corte[] {
  const { alturaTotal, alturaPagina, folga } = entrada;
  const blocos = marcarPais(entrada.blocos);
  const ativos = blocos.filter((bloco) => !bloco.pai);
  const cortes: Corte[] = [];
  let inicio = 0;

  while (inicio < alturaTotal) {
    let fim = Math.min(inicio + alturaPagina, alturaTotal);

    if (fim < alturaTotal) {
      const atravessados = ativos
        .filter((bloco) => bloco.top > inicio + folga && bloco.top < fim && bloco.bottom > fim && bloco.height < alturaPagina - folga)
        .sort((a, b) => a.top - b.top);
      const atravessado = atravessados[0];

      if (atravessado) {
        const fimDoBlocoAnterior = Math.max(0, ...blocos.filter((bloco) => bloco !== atravessado && bloco.bottom <= atravessado.top + 1).map((bloco) => bloco.bottom));
        const respiro = Math.max(0, Math.min(folga, atravessado.top - fimDoBlocoAnterior));
        const fimSeguro = atravessado.top - respiro;
        if (fimSeguro - inicio >= alturaPagina * 0.12) fim = fimSeguro;
      } else {
        // Quebra em área livre: recua até o fim do último bloco para não cortar texto solto no meio.
        const anterior = Math.max(0, ...blocos.filter((bloco) => bloco.bottom <= fim && bloco.bottom > inicio + alturaPagina * 0.5).map((bloco) => bloco.bottom));
        if (anterior > 0 && fim - anterior <= alturaPagina * 0.3) fim = anterior + Math.min(folga, fim - anterior);
      }
    }

    if (fim <= inicio) fim = Math.min(inicio + alturaPagina, alturaTotal);
    cortes.push({ inicio, fim });
    inicio = fim;
  }
  return cortes;
}
