import test from "node:test";
import assert from "node:assert/strict";
import {
  PREFERENCIA_PADRAO,
  descreverAparelho,
  larguraDoLayout,
  lerPreferencia,
  modoAutomatico,
  modoEmUso,
  serializarPreferencia,
} from "../lib/screenMode.ts";

test("modo automático acompanha a largura: celular Campo, tablet Equilibrado, PC Completo", () => {
  assert.equal(modoAutomatico(390), "campo");
  assert.equal(modoAutomatico(767), "campo");
  assert.equal(modoAutomatico(768), "campo");
  assert.equal(modoAutomatico(1099), "campo");
  assert.equal(modoAutomatico(1024), "campo");
  assert.equal(modoAutomatico(1100), "completo");
  assert.equal(modoAutomatico(1440), "completo");
});

test("escolha manual vale em qualquer largura; automático ignora o modo guardado", () => {
  assert.equal(modoEmUso({ automatico: false, modo: "completo", nome: "" }, 390), "completo");
  assert.equal(modoEmUso({ automatico: false, modo: "campo", nome: "" }, 1440), "campo");
  assert.equal(modoEmUso({ automatico: true, modo: "campo", nome: "" }, 1440), "completo");
});

test("preferência salva e lida volta igual; lixo volta ao automático", () => {
  const original = { automatico: false, modo: "equilibrado", nome: "Tablet do Élton" };
  assert.deepEqual(lerPreferencia(serializarPreferencia(original)), original);
  assert.deepEqual(lerPreferencia(null), PREFERENCIA_PADRAO);
  assert.deepEqual(lerPreferencia("não é json"), PREFERENCIA_PADRAO);
  assert.deepEqual(lerPreferencia("123"), PREFERENCIA_PADRAO);
  assert.equal(lerPreferencia('{"automatico":false,"modo":"outro"}').modo, "completo");
  assert.equal(lerPreferencia('{"nome":"' + "x".repeat(80) + '"}').nome.length, 40);
});

test("nome do aparelho é aparado ao salvar", () => {
  const texto = serializarPreferencia({ automatico: true, modo: "completo", nome: "  Celular  " });
  assert.equal(JSON.parse(texto).nome, "Celular");
});

test("modo mais largo que a tela usa largura de layout; o resto usa a do aparelho", () => {
  assert.equal(larguraDoLayout("completo", 390), 1280);
  assert.equal(larguraDoLayout("equilibrado", 390), 820);
  assert.equal(larguraDoLayout("campo", 390), null);
  assert.equal(larguraDoLayout("completo", 1440), null);
  assert.equal(larguraDoLayout("equilibrado", 1024), null);
});

test("descrição do aparelho segue as mesmas faixas", () => {
  assert.equal(descreverAparelho(390), "Celular");
  assert.equal(descreverAparelho(820), "Tablet");
  assert.equal(descreverAparelho(1280), "Computador");
});

test("nomes de uso: aparelho + modo, como no chip e no menu ⋯", async () => {
  const { ROTULO_DE_USO, ROTULO_DO_MODO } = await import("../lib/screenMode.ts");
  assert.equal(ROTULO_DE_USO.campo, "Celular · Campo");
  assert.equal(ROTULO_DE_USO.equilibrado, "Tablet · Visita e demonstração");
  assert.equal(ROTULO_DE_USO.completo, "Computador · Completo");
  // os cartões da tela de configuração mantêm os nomes curtos
  assert.deepEqual(ROTULO_DO_MODO, { campo: "Campo", equilibrado: "Equilibrado", completo: "Completo" });
});
