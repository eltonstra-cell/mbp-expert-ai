import assert from "node:assert/strict";
import test from "node:test";

import { contagemDeEvidencias, correcoesAbertas, itensNaoConformes, progressoDoChecklist } from "../lib/contagens.ts";
import { avisoDeDivergencia, conciliarNcs } from "../lib/ncReconcile.ts";
import { conferenciaDoRelatorio } from "../lib/reportCheck.ts";

const item = (id, status) => ({ id, status });

test("progresso: respostas mistas contam todas as que não são Pendente", () => {
  const p = progressoDoChecklist([item(1, "Conforme"), item(2, "Não Conforme"), item(3, "Pendente"), item(4, "Pendente")]);
  assert.deepEqual([p.respondidos, p.total, p.percentual, p.curto], [2, 4, 50, "2/4"]);
  assert.equal(p.frase, "2 de 4 itens respondidos");
});

test("progresso: sem respostas, sem itens e com Não se aplica", () => {
  assert.equal(progressoDoChecklist([item(1, "Pendente")]).percentual, 0);
  assert.equal(progressoDoChecklist([item(1, "Pendente")]).frase, "0 de 1 item respondido");
  assert.deepEqual(progressoDoChecklist(undefined), { respondidos: 0, total: 0, percentual: 0, curto: "0/0", frase: "0 de 0 itens respondidos" });
  const comNa = progressoDoChecklist([item(1, "Não se aplica"), item(2, "Pendente")]);
  assert.equal(comNa.respondidos, 1);
});

test("itens não conformes contam só o checklist", () => {
  assert.equal(itensNaoConformes([item(1, "Não Conforme"), item(2, "Conforme"), item(3, "Não se aplica"), item(4, "Não Conforme")]), 2);
  assert.equal(itensNaoConformes(undefined), 0);
});

const nc = (id, visitaId, empresaId, status = "Aberta", inativa = false) => ({ id, visitaId, empresaId, status, inativaNoChecklist: inativa });

test("correções abertas: visita, empresa e visita de outra empresa", () => {
  const ncs = [
    nc("a", "v1", "e1"),
    nc("b", "v1", "e1", "Em tratamento"),
    nc("c", "v1", "e1", "Resolvida"),
    nc("d", "v1", "e1", "Aberta", true),
    nc("e", "v2", "e1"),
    nc("f", "v3", "e2"),
  ];
  assert.equal(correcoesAbertas(ncs, { visitaId: "v1" }), 2);
  assert.equal(correcoesAbertas(ncs, { empresaId: "e1" }), 3);
  assert.equal(correcoesAbertas(ncs, { empresaId: "e1", visitaIds: new Set(["v1"]) }), 2);
  assert.equal(correcoesAbertas(ncs, { visitaId: "v3" }), 1);
  assert.equal(correcoesAbertas(ncs, { empresaId: "e2", visitaId: "v1" }), 0);
  assert.equal(correcoesAbertas(undefined), 0);
});

test("evidências: fotos e áudios separados e o mesmo texto em todas as telas", () => {
  const c = contagemDeEvidencias([...Array(16).fill({ tipo: "Foto" }), { tipo: "Áudio" }, { tipo: "Áudio" }]);
  assert.deepEqual([c.fotos, c.audios, c.total, c.texto], [16, 2, 18, "16 fotos · 2 áudios"]);
  assert.equal(contagemDeEvidencias([{ tipo: "Foto" }]).texto, "1 foto · 0 áudios");
  assert.equal(contagemDeEvidencias([]).texto, "Nenhuma evidência");
  const linha = conferenciaDoRelatorio({ respondidos: 1, totalChecklist: 2, ncsAbertas: 0, ncsSemResponsavelOuPrazo: 0, evidencias: c.total, evidenciasTexto: c.texto, popsPendentes: 0, popsSugeridos: 0, cadastroPreenchidos: 1, cadastroTotal: 1 }).find((l) => l.chave === "evidencias");
  assert.equal(linha.resumo, "16 fotos · 2 áudios");
});

test("aviso de divergência só aparece quando há divergência real", () => {
  const checklist = [item("i1", "Não Conforme"), item("i2", "Não Conforme"), item("i3", "Conforme")];
  const ok = conciliarNcs(checklist, [{ id: "n1", checklistItemId: "i1" }, { id: "n2", checklistItemId: "i2" }]);
  assert.equal(avisoDeDivergencia(ok), null);
  const falta = conciliarNcs(checklist, [{ id: "n1", checklistItemId: "i1" }]);
  assert.equal(avisoDeDivergencia(falta), "O checklist tem 2 itens não conformes e há 1 registrada.");
});
