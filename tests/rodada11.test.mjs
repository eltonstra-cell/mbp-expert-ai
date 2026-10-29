import test from "node:test";
import assert from "node:assert/strict";
import { agruparAmbientesPorVinculo } from "../lib/agrupamentoDeAmbientes.ts";
import { renomearAmbiente } from "../lib/renomearAmbiente.ts";
import { bloqueiosDaRetirada } from "../lib/estruturaDelta.ts";
import { seloDeSincronizacao } from "../lib/conexao.ts";
import { SETORES_OFICIAIS_MANUAL } from "../lib/manualBase.ts";

const [, , , , COZINHA] = SETORES_OFICIAIS_MANUAL;

const estado = () => ({
  empresas: {
    e1: {
      id: "e1",
      setoresManual: [COZINHA, "Cozinha do Chico"],
      setorOficialDoAmbiente: { "Cozinha do Chico": COZINHA },
      equipamentosSetores: [{ id: "q1", setor: "Cozinha do Chico", nome: "Fogão", quantidade: 1 }],
    },
  },
  visitas: [],
  ncs: [],
  evidencias: [],
});

// ===== ambiente próprio agrupado: renomear e remover =====
test("renomear o ambiente próprio agrupado mantém o vínculo, os equipamentos e a linha do oficial", () => {
  const novo = renomearAmbiente(estado(), "e1", "Cozinha do Chico", "Cozinha quente");
  const empresa = novo.empresas.e1;
  assert.deepEqual(empresa.setoresManual, [COZINHA, "Cozinha quente"]);
  assert.deepEqual(empresa.setorOficialDoAmbiente, { "Cozinha quente": COZINHA });
  assert.equal(empresa.equipamentosSetores[0].setor, "Cozinha quente");
  const { linhas, linhaDoProprio } = agruparAmbientesPorVinculo(empresa.setoresManual, empresa.setorOficialDoAmbiente);
  assert.deepEqual(linhas.map((linha) => linha.setor), [COZINHA]);
  assert.deepEqual(linhas[0].proprios, ["Cozinha quente"]);
  assert.equal(linhaDoProprio["Cozinha quente"], COZINHA);
});

test("renomear o próprio não mexe no setor oficial nem em outro ambiente", () => {
  const base = estado();
  base.empresas.e1.setoresManual.push("Copa");
  const novo = renomearAmbiente(base, "e1", "Cozinha do Chico", "Cozinha quente");
  assert.ok(novo.empresas.e1.setoresManual.includes(COZINHA));
  assert.ok(novo.empresas.e1.setoresManual.includes("Copa"));
  assert.equal(novo.empresas.e1.equipamentosSetores.length, 1);
});

test("remover o próprio agrupado devolve o oficial sem próprios; com equipamento, a retirada é bloqueada", () => {
  const base = estado();
  const bloqueios = bloqueiosDaRetirada(["Cozinha do Chico"], base.empresas.e1.equipamentosSetores);
  assert.equal(bloqueios.length, 1);
  assert.equal(bloqueios[0].ambiente, "Cozinha do Chico");

  const semEquipamento = { ...base.empresas.e1, equipamentosSetores: [] };
  assert.deepEqual(bloqueiosDaRetirada(["Cozinha do Chico"], semEquipamento.equipamentosSetores), []);
  const restantes = semEquipamento.setoresManual.filter((nome) => nome !== "Cozinha do Chico");
  const { linhas } = agruparAmbientesPorVinculo(restantes, {});
  assert.deepEqual(linhas.map((linha) => linha.setor), [COZINHA]);
  assert.deepEqual(linhas[0].proprios, []);
});

// ===== chip de sincronização em erro =====
test("chip de sincronização: nuvem sem resposta com internet vira erro, mesmo com itens pendentes", () => {
  const selo = seloDeSincronizacao({ online: true, syncStatus: "erro", pendentes: 3 });
  assert.equal(selo.estado, "erro");
  assert.equal(selo.rotulo, "Erro ao enviar");
});

test("chip de sincronização: foto ou áudio que falhou é erro; sem internet o estado é sem sinal", () => {
  assert.equal(seloDeSincronizacao({ online: true, syncStatus: "sincronizado", pendentes: 0, falhas: 2 }).estado, "erro");
  assert.equal(seloDeSincronizacao({ online: false, syncStatus: "erro", pendentes: 0 }).estado, "sem-sinal");
  assert.equal(seloDeSincronizacao({ online: true, syncStatus: "sincronizado", pendentes: 0 }).estado, "ok");
});
