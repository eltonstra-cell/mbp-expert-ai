import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

test("H: o cartão do modo Campo cita as 5 abas reais e a Empresas dentro de Mais", () => {
  const modo = ler("../components/pc/PcModoTela.tsx");
  assert.ok(modo.includes("5 abas: Início, Checklist, Registrar, Correções, Mais (com Visitas, Empresas e Ajuda)"));
  const campo = ler("../components/campo/CampoTelas.tsx");
  for (const aba of ['botao("correcoes"', "Registrar", "Mais"]) assert.ok(campo.includes(aba));
  assert.ok(ler("../app/page.tsx").includes('rotulo: "Empresas"'));
});
