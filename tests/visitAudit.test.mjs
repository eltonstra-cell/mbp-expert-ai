import assert from "node:assert/strict";
import test from "node:test";

import { registrarMudancaStatus } from "../lib/visitAudit.ts";

const visitaInicial = {
  id: "visita-3",
  empresaId: "empresa-1",
  data: "2026-08-21",
  status: "Em andamento",
  responsavel: "Elton",
  observacoes: "",
  progresso: 88,
  criadoEm: "2026-08-21T12:00:00.000Z",
  historicoStatus: [],
};

test("preserva encerramento, reabertura e novo encerramento em ordem", () => {
  const primeiroEncerramento = registrarMudancaStatus(
    visitaInicial,
    "Concluída",
    "Inspeção finalizada pelo usuário.",
    "Lista de visitas",
    "2026-08-23T12:00:00.000Z",
    "evento-1"
  );
  const reabertura = registrarMudancaStatus(
    primeiroEncerramento,
    "Em andamento",
    "Inspeção reaberta pelo usuário.",
    "Lista de visitas",
    "2026-08-23T12:05:00.000Z",
    "evento-2"
  );
  const segundoEncerramento = registrarMudancaStatus(
    reabertura,
    "Concluída",
    "Inspeção finalizada pelo usuário.",
    "Lista de visitas",
    "2026-08-23T12:10:00.000Z",
    "evento-3"
  );

  assert.equal(segundoEncerramento.status, "Concluída");
  assert.equal(segundoEncerramento.encerradaEm, "2026-08-23T12:10:00.000Z");
  assert.equal(segundoEncerramento.historicoStatus.length, 3);
  assert.deepEqual(
    segundoEncerramento.historicoStatus.map((evento) => ({
      id: evento.id,
      de: evento.de,
      para: evento.para,
      responsavel: evento.responsavel,
      origem: evento.origem,
    })),
    [
      { id: "evento-1", de: "Em andamento", para: "Concluída", responsavel: "Elton", origem: "Lista de visitas" },
      { id: "evento-2", de: "Concluída", para: "Em andamento", responsavel: "Elton", origem: "Lista de visitas" },
      { id: "evento-3", de: "Em andamento", para: "Concluída", responsavel: "Elton", origem: "Lista de visitas" },
    ]
  );
  assert.equal(primeiroEncerramento.historicoStatus.length, 1);
  assert.equal(reabertura.historicoStatus.length, 2);
});

test("não duplica evento quando o status solicitado já é o atual", () => {
  const semMudanca = registrarMudancaStatus(
    visitaInicial,
    "Em andamento",
    "Ação repetida.",
    "Relatório",
    "2026-08-23T12:15:00.000Z",
    "evento-repetido"
  );

  assert.equal(semMudanca, visitaInicial);
  assert.equal(semMudanca.historicoStatus.length, 0);
});
