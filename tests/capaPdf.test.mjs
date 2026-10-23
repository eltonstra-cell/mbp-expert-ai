// Confere a capa no PDF de verdade: o app (build de produção) roda sem banco e sem dados reais, o POP é aberto pelo mesmo caminho do usuário,
// o botão "Imprimir ou salvar PDF" da janela "Capa e impressão" é clicado e o PDF sai da impressão do Chrome/Edge.
// Só roda com um Chrome/Edge instalado e com `npm run build` feito (senão é pulado, com o motivo).
// Todas as combinações (6 estilos × 6 cores × 2 ícones × com e sem logotipo): node --experimental-strip-types scripts/verificar-capa-pdf.mjs --completa
import assert from "node:assert/strict";
import test from "node:test";

import { casosDaVerificacao, prerequisitos, problemasDoResultado, verificar } from "../scripts/verificar-capa-pdf.mjs";

const falta = prerequisitos();

test("PDF da capa: a página 1 é a capa e o conteúdo começa na página 2, em POP vigente e em rascunho", { skip: falta ? `pulado: ${falta}` : false, timeout: 900000 }, async () => {
  const { resultados, paginasSemCapa, titulos } = await verificar(casosDaVerificacao());
  assert.ok(resultados.length >= 18);
  // POP vigente (POP-01) e rascunho (POP-05), capa desligada e ligada
  assert.deepEqual([...new Set(resultados.map((r) => r.caso.pop))], ["POP-01", "POP-05"]);
  assert.ok(resultados.some((r) => !r.caso.capa) && resultados.some((r) => r.caso.capa));
  const problemas = resultados.flatMap((r) => problemasDoResultado(r, paginasSemCapa, titulos));
  assert.deepEqual(problemas, []);
});
