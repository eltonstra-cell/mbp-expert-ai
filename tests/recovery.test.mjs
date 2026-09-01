import assert from "node:assert/strict";
import test from "node:test";

import {
  hasLocalOnlyRecords,
  localOnlyCounts,
  mergeForRecovery,
} from "../lib/recovery.ts";

const empresaA = { id: "empresa-a", nomeFantasia: "A" };
const empresaB = { id: "empresa-b", nomeFantasia: "B" };
const visita1 = { id: "visita-1", empresaId: "empresa-a", observacoes: "nuvem" };
const visita2 = { id: "visita-2", empresaId: "empresa-a", observacoes: "local" };
const visita3 = { id: "visita-3", empresaId: "empresa-a", observacoes: "local" };

function db(overrides = {}) {
  return {
    empresas: {},
    empresaAtualId: null,
    visitas: [],
    ncs: [],
    evidencias: [],
    ...overrides,
  };
}

test("detecta as duas visitas existentes somente no computador", () => {
  const local = db({
    empresas: { "empresa-a": empresaA },
    visitas: [visita1, visita2, visita3],
  });
  const cloud = db({
    empresas: { "empresa-a": empresaA },
    visitas: [visita1],
  });

  const counts = localOnlyCounts(local, cloud);
  assert.equal(counts.visitas, 2);
  assert.equal(hasLocalOnlyRecords(counts), true);
});

test("mescla registros locais e da nuvem sem excluir nenhum identificador", () => {
  const local = db({
    empresas: { "empresa-a": empresaA },
    empresaAtualId: "empresa-a",
    visitas: [visita1, visita2, visita3],
  });
  const cloud = db({
    empresas: { "empresa-b": empresaB },
    empresaAtualId: "empresa-b",
    visitas: [{ id: "visita-cloud", empresaId: "empresa-b" }],
  });

  const merged = mergeForRecovery(local, cloud);
  assert.deepEqual(Object.keys(merged.empresas).sort(), ["empresa-a", "empresa-b"]);
  assert.deepEqual(
    merged.visitas.map((item) => item.id).sort(),
    ["visita-1", "visita-2", "visita-3", "visita-cloud"]
  );
  assert.equal(merged.empresaAtualId, "empresa-a");
});

test("registro local vence apenas quando possui o mesmo identificador", () => {
  const local = db({ visitas: [{ ...visita1, observacoes: "versão local" }] });
  const cloud = db({ visitas: [{ ...visita1, observacoes: "versão nuvem" }] });

  const merged = mergeForRecovery(local, cloud);
  assert.equal(merged.visitas.length, 1);
  assert.equal(merged.visitas[0].observacoes, "versão local");
});
