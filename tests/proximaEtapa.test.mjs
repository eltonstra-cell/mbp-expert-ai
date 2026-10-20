import assert from "node:assert/strict";
import test from "node:test";

import { proximaEtapaDaVisita } from "../lib/proximaEtapa.ts";

const completa = { status: "Aberta", acaoCorretiva: "Trocar", responsavelAcao: "Ana", prazo: "2026-11-01" };
const semPlano = { status: "Aberta" };

test("com itens sem resposta, a etapa é o checklist (singular e plural)", () => {
  assert.deepEqual(proximaEtapaDaVisita(12, [semPlano]), { tipo: "checklist", quantidade: 12, titulo: "12 itens sem resposta" });
  assert.equal(proximaEtapaDaVisita(1, []).titulo, "1 item sem resposta");
});

test("sem itens pendentes, passa para as correções sem plano", () => {
  const etapa = proximaEtapaDaVisita(0, [semPlano, completa, { status: "Em tratamento", acaoCorretiva: "x", responsavelAcao: "y" }]);
  assert.deepEqual(etapa, { tipo: "correcoes", quantidade: 2, titulo: "2 correções sem plano" });
  assert.equal(proximaEtapaDaVisita(0, [semPlano]).titulo, "1 correção sem plano");
});

test("correções resolvidas não contam; com tudo fechado, a etapa é o relatório", () => {
  assert.equal(proximaEtapaDaVisita(0, [{ status: "Resolvida" }, completa]).tipo, "relatorio");
  assert.deepEqual(proximaEtapaDaVisita(0, []), { tipo: "relatorio", quantidade: 0, titulo: "Gerar relatório" });
});
