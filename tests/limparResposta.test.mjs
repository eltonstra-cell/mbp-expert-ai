import test from "node:test";
import assert from "node:assert/strict";
import { temResposta, dadosExtrasDoItem, limparResposta, listaEmTexto } from "../lib/limparResposta.ts";
import { sincronizarNcDoItem } from "../lib/checklistNcs.ts";

const visita = { id: "v1", empresaId: "e1" };
const itemBase = { id: "i1", ambiente: "Cozinha", titulo: "Piso limpo", categoria: "Higiene", status: "Pendente", observacao: "" };
const AGORA = "2026-10-19T10:00:00.000Z";


test("só tem o que limpar quando o item tem resposta", () => {
  assert.equal(temResposta({ status: "Pendente" }), false);
  assert.equal(temResposta({ status: "Não se aplica" }), true);
});

test("limpar só a marcação: sem dados extras, limpa direto", () => {
  const item = { ...itemBase, status: "Conforme" };
  assert.deepEqual(dadosExtrasDoItem(item, []), []);
  const { item: limpo, ncs } = limparResposta([], visita, item, AGORA);
  assert.equal(limpo.status, "Pendente");
  assert.deepEqual(ncs, []);
});

test("com observação, foto, áudio ou gravidade escolhida pede confirmação", () => {
  assert.deepEqual(dadosExtrasDoItem({ ...itemBase, status: "Conforme", observacao: "ok" }, []), ["observação"]);
  assert.deepEqual(dadosExtrasDoItem({ ...itemBase, status: "Conforme" }, [{ tipo: "Foto" }]), ["foto"]);
  assert.deepEqual(dadosExtrasDoItem({ ...itemBase, status: "Conforme" }, [{ tipo: "Áudio" }]), ["áudio"]);
  const trocada = { ...itemBase, status: "Não Conforme", criticidade: "Crítica", criticidadeSugerida: "Rotina" };
  assert.deepEqual(dadosExtrasDoItem(trocada, []), ["gravidade"]);
  const naoTrocada = { ...itemBase, status: "Não Conforme", criticidade: "Rotina" };
  assert.deepEqual(dadosExtrasDoItem(naoTrocada, []), []);
  assert.equal(listaEmTexto(["observação", "foto", "gravidade"]), "observação, foto e gravidade");
});

test("limpar apaga marcação, observação e volta a gravidade sugerida", () => {
  const item = { ...itemBase, status: "Não Conforme", observacao: "sujo", observacaoNCMemoria: "sujo", criticidade: "Crítica", criticidadeSugerida: "Rotina" };
  const { item: limpo } = limparResposta([], visita, item, AGORA);
  assert.equal(limpo.status, "Pendente");
  assert.equal(limpo.observacao, "");
  assert.equal(limpo.observacaoNCMemoria, "");
  assert.equal(limpo.criticidade, "Rotina");
  assert.equal(limpo.criticidadeSugerida, undefined);
});

test("limpar devolve só o item e as correções (não há mais desfazer da resposta limpa)", async () => {
  const modulo = await import("../lib/limparResposta.ts");
  assert.equal(modulo.desfazerLimpeza, undefined);
  const item = { ...itemBase, status: "Não Conforme", observacao: "sujo", criticidade: "Crítica", criticidadeSugerida: "Rotina" };
  const resultado = limparResposta([], visita, item, AGORA);
  assert.deepEqual(Object.keys(resultado).sort(), ["item", "ncs"]);
});

test("a Correção ligada fica cancelada pelo usuário, fora das abertas, com o histórico guardado", () => {
  const item = { ...itemBase, status: "Não Conforme", observacao: "sujo", criticidade: "Importante" };
  const comNc = sincronizarNcDoItem([], visita, item, "2026-10-18T09:00:00.000Z");
  const plano = comNc.map((nc) => ({ ...nc, acaoCorretiva: "Lavar", prazo: "2026-10-25" }));
  assert.deepEqual(dadosExtrasDoItem(item, [], plano[0]), ["observação", "plano da correção"]);

  const { ncs } = limparResposta(plano, visita, item, AGORA);
  assert.equal(ncs.length, 1);
  assert.equal(ncs[0].inativaNoChecklist, true);
  assert.equal(ncs[0].canceladaPeloUsuarioEm, AGORA);
  assert.equal(ncs[0].acaoCorretiva, "Lavar");
  assert.equal(ncs[0].status, "Aberta");
  const abertas = ncs.filter((nc) => !nc.inativaNoChecklist && nc.status !== "Resolvida");
  assert.equal(abertas.length, 0);
});

test("marcar Não conforme de novo reativa a Correção cancelada", () => {
  const item = { ...itemBase, status: "Não Conforme", criticidade: "Rotina" };
  const comNc = sincronizarNcDoItem([], visita, item, AGORA);
  const { ncs } = limparResposta(comNc, visita, item, AGORA);
  const reativada = sincronizarNcDoItem(ncs, visita, { ...item, status: "Não Conforme" }, AGORA);
  assert.equal(reativada[0].inativaNoChecklist, false);
  assert.equal(reativada[0].canceladaPeloUsuarioEm, undefined);
});
