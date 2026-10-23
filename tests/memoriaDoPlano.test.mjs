import assert from "node:assert/strict";
import test from "node:test";

import { CAUSAS_RAIZ, historicoDaReincidencia, memoriaDoPlano, seloDaReincidencia, validarCausaRaiz } from "../lib/memoriaDoPlano.ts";

const nc = (id, visitaId, extra = {}) => ({ id, empresaId: "e1", visitaId, ambiente: "Cozinha", categoria: "Higiene", titulo: "Piso sujo", criadoEm: `2026-0${id.slice(1)}-01T10:00:00Z`, ...extra });
const datas = { v1: "2026-01-10", v2: "2026-02-10", v3: "2026-03-10" };
const dataDaVisita = (id) => datas[id] || "";

test("memória: responsável do ambiente, últimos responsáveis e ações (critério primeiro)", () => {
  const todas = [
    nc("n1", "v1", { responsavelAcao: "Ana", acaoCorretiva: "Limpar o piso" }),
    nc("n2", "v2", { responsavelAcao: "Bruno", acaoCorretiva: "Trocar o ralo", titulo: "Ralo entupido" }),
    nc("n3", "v3", { ambiente: "Salão", responsavelAcao: "Carla" }),
  ];
  const atual = nc("n9", "v3");
  const m = memoriaDoPlano(todas, atual);
  assert.equal(m.responsavelDoAmbiente, "Bruno");
  assert.deepEqual(m.responsaveis, ["Carla", "Bruno", "Ana"]);
  assert.equal(m.acoes[0], "Limpar o piso", "a ação do mesmo critério vem primeiro");
  assert.ok(m.acoes.includes("Trocar o ralo"));
});

test("reincidência: pela 2ª e 3ª vez e a ação que funcionou (só de correção resolvida)", () => {
  const todas = [nc("n1", "v1", { status: "Resolvida", acaoCorretiva: "Reforçar a higienização" }), nc("n2", "v2", { status: "Aberta", acaoCorretiva: "Repetir" }), nc("n3", "v3")];
  const h = historicoDaReincidencia(todas[2], todas, dataDaVisita);
  assert.equal(h.vezes, 3);
  assert.equal(h.acaoQueFuncionou, "Reforçar a higienização");
  assert.equal(seloDaReincidencia(3), "Pela 3ª vez");
  assert.equal(seloDaReincidencia(2), "Pela 2ª vez");
  assert.equal(seloDaReincidencia(1), "");
  assert.equal(historicoDaReincidencia(todas[0], todas, dataDaVisita).vezes, 1);
});

test("causa raiz obrigatória só na reincidência", () => {
  assert.equal(validarCausaRaiz(false, ""), undefined);
  assert.match(validarCausaRaiz(true, "  "), /causa raiz/);
  assert.equal(validarCausaRaiz(true, CAUSAS_RAIZ[0]), undefined);
});
