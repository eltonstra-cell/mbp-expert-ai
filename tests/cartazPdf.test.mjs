// Confere o cartaz "Como lavar as mãos" no PDF de verdade, nos 5 estilos (13 e 14 passos), sem logotipo, com estilo antigo guardado e com POP em rascunho.
// Só roda com um Chrome/Edge instalado e com `npm run build` feito (senão é pulado, com o motivo).
// Para guardar os PDFs: node --experimental-strip-types scripts/verificar-cartaz-pdf.mjs --saida pasta
import assert from "node:assert/strict";
import test from "node:test";

import { casosDoCartaz, prerequisitos, problemasDoCartaz, verificar } from "../scripts/verificar-cartaz-pdf.mjs";

const falta = prerequisitos();

test("PDF do cartaz: uma página A4 em cada estilo, sem página extra, leve, e rascunho bloqueado", { skip: falta ? `pulado: ${falta}` : false, timeout: 900000 }, async () => {
  const resultados = await verificar(casosDoCartaz());
  assert.equal(resultados.length, 15);
  const problemas = resultados.flatMap((r) => problemasDoCartaz(r));
  assert.deepEqual(problemas, []);
});
