import test from "node:test";
import assert from "node:assert/strict";
import { correcoesAbertas } from "../lib/contagens.ts";
import { correcoesAbertasDaEmpresa, correcoesVencidasDaEmpresa } from "../lib/correcoesVencidas.ts";

const nc = (id, extra = {}) => ({ id, visitaId: "v1", empresaId: "e1", status: "Aberta", prazo: "2099-01-01", ...extra });
const ncs = [
  nc("aberta"),
  nc("vencida", { prazo: "2020-01-01" }),
  nc("cancelada", { inativaNoChecklist: true, canceladaPeloUsuarioEm: "2026-10-22T10:00:00.000Z" }),
  nc("so-cancelada-pelo-usuario", { canceladaPeloUsuarioEm: "2026-10-22T10:00:00.000Z" }),
  nc("resolvida", { status: "Resolvida" }),
  nc("outra-visita", { visitaId: "v2" }),
  nc("outra-empresa", { empresaId: "e2" }),
];

test("correções abertas ignoram canceladas e resolvidas; vencida conta como aberta", () => {
  assert.equal(correcoesAbertas(ncs, { empresaId: "e1" }), 3);
  assert.equal(correcoesAbertas(ncs, { visitaId: "v1", empresaId: "e1" }), 2);
  assert.deepEqual(correcoesAbertasDaEmpresa(ncs, "e1").map((n) => n.id), ["aberta", "vencida", "outra-visita"]);
  assert.deepEqual(correcoesVencidasDaEmpresa(ncs, "e1", "2026-10-29").map((n) => n.id), ["vencida"]);
});

test("menu (empresa) e Central (visita) usam a mesma função, só o escopo muda", () => {
  assert.equal(correcoesAbertas(ncs, { empresaId: "e1" }), correcoesAbertasDaEmpresa(ncs, "e1").length);
});
