import assert from "node:assert/strict";
import test from "node:test";

import { ambientesIniciais, moverAmbiente, ordemDaUltimaVisita } from "../lib/visitaRapida.ts";

const v = (id, data, ambientes, extra = {}) => ({ id, empresaId: "e1", data, criadoEm: `${data}T10:00:00Z`, ambientes, ...extra });

test("a visita nova usa a ordem da última visita da empresa", () => {
  const visitas = [v("a", "2026-10-01", ["Cozinha", "Depósito"]), v("b", "2026-10-15", ["Depósito", "Recebimento", "Cozinha"]), { ...v("c", "2026-10-20", ["Salão"]), empresaId: "outra" }];
  assert.deepEqual(ordemDaUltimaVisita(visitas, "e1"), ["Depósito", "Recebimento", "Cozinha"]);
  assert.deepEqual(ambientesIniciais(["Cozinha", "Recebimento", "Depósito"], visitas, "e1"), ["Depósito", "Recebimento", "Cozinha"]);
});

test("ambiente que saiu do cadastro some; ambiente novo no cadastro entra no fim", () => {
  const visitas = [v("b", "2026-10-15", ["Salão antigo", "Cozinha"])];
  assert.deepEqual(ambientesIniciais(["Cozinha", "Câmara fria"], visitas, "e1"), ["Cozinha", "Câmara fria"]);
});

test("sem visita anterior (ou só arquivada ou a própria), vale a ordem do cadastro", () => {
  assert.deepEqual(ambientesIniciais(["A", "B"], [], "e1"), ["A", "B"]);
  assert.deepEqual(ambientesIniciais(["A", "B"], [v("x", "2026-10-01", ["B", "A"], { arquivada: true })], "e1"), ["A", "B"]);
  assert.deepEqual(ambientesIniciais(["A", "B"], [v("x", "2026-10-01", ["B", "A"])], "e1", "x"), ["A", "B"]);
});

test("reordenar sobe e desce um ambiente e respeita os limites", () => {
  assert.deepEqual(moverAmbiente(["A", "B", "C"], "B", -1), ["B", "A", "C"]);
  assert.deepEqual(moverAmbiente(["A", "B", "C"], "B", 1), ["A", "C", "B"]);
  assert.deepEqual(moverAmbiente(["A", "B"], "A", -1), ["A", "B"]);
});
