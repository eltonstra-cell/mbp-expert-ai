import test from "node:test";
import assert from "node:assert/strict";
import { ABAS_CELULAR, ABAS_PADRAO, destinoFicaSoNoMais } from "../lib/abasDoCampo.ts";
import { modoAutomatico } from "../lib/screenMode.ts";
import { PALETA_EMPRESA, corDaEmpresa } from "../lib/empresaCor.ts";

test("celular e tablet usam o layout do Campo; o PC começa em 1100 px", () => {
  assert.equal(modoAutomatico(390), "campo");
  assert.equal(modoAutomatico(800), "campo");
  assert.equal(modoAutomatico(1099), "campo");
  assert.equal(modoAutomatico(1100), "completo");
});

test("a barra de baixo do celular tem 5 destinos, Registrar no centro; POPs e Relatórios ficam em Mais", () => {
  assert.deepEqual(ABAS_CELULAR, ["inicio", "visitas", "registrar", "correcoes", "mais"]);
  assert.equal(ABAS_CELULAR[Math.floor(ABAS_CELULAR.length / 2)], "registrar");
  assert.equal(ABAS_PADRAO.length, 7);
  assert.equal(destinoFicaSoNoMais("pops", ABAS_CELULAR), true);
  assert.equal(destinoFicaSoNoMais("relatorios", ABAS_CELULAR), true);
  assert.equal(destinoFicaSoNoMais("pops", ABAS_PADRAO), false);
});

test("a cor do avatar da empresa sai da lista de 5 cores e continua a mesma para o mesmo id", () => {
  assert.deepEqual(PALETA_EMPRESA.map((cor) => cor.hex), ["#188585", "#2A4D7C", "#B4491C", "#526477", "#21805B"]);
  const cor = corDaEmpresa({ id: "44150273000191" });
  assert.equal(cor, corDaEmpresa({ id: "44150273000191" }));
  assert.ok(PALETA_EMPRESA.some((opcao) => opcao.hex === cor));
});
