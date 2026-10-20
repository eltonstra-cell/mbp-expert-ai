import assert from "node:assert/strict";
import test from "node:test";

import { apagarArquivoDaEvidencia, caminhoDeEvidenciaValido } from "../lib/evidenceBlob.ts";

const CAMINHO = "evidencias/vis-1/ev-1-foto.jpg-AbC123.jpg";

test("remover chama a exclusão do Blob uma vez, com o arquivo certo", async () => {
  const chamadas = [];
  const ok = await apagarArquivoDaEvidencia(CAMINHO, async (caminho) => {
    chamadas.push(caminho);
  });
  assert.equal(ok, true);
  assert.deepEqual(chamadas, [CAMINHO]);
});

test("falha na exclusão não lança, devolve false e não expõe o caminho no registro", async () => {
  const registros = [];
  const ok = await apagarArquivoDaEvidencia(
    CAMINHO,
    async () => {
      throw new Error(`falhou em ${CAMINHO}`);
    },
    (mensagem) => registros.push(mensagem)
  );
  assert.equal(ok, false);
  assert.equal(registros.length, 1);
  assert.ok(!registros[0].includes("evidencias/"));
  assert.ok(!registros[0].includes("http"));
});

test("só aceita o caminho de um arquivo: sem prefixo, sem pasta, sem subir diretório", async () => {
  for (const ruim of ["", "evidencias/", "evidencias/vis-1/", "evidencias/vis-1", "evidencias/../x/y", "outra/vis-1/a.jpg", "https://x.invalid/a.jpg", null, undefined, 3]) {
    let chamou = 0;
    const ok = await apagarArquivoDaEvidencia(ruim, async () => {
      chamou += 1;
    });
    assert.equal(ok, false);
    assert.equal(chamou, 0);
    assert.equal(caminhoDeEvidenciaValido(ruim), false);
  }
  assert.equal(caminhoDeEvidenciaValido(CAMINHO), true);
});
