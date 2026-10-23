import assert from "node:assert/strict";
import test from "node:test";

import { contarAlteracoesPendentes, mesclarTresVias, usarVersaoDaNuvem } from "../lib/mesclaTresVias.ts";

const item = (id, status, extra = {}) => ({ id, ambiente: "Cozinha", titulo: `Item ${id}`, categoria: "Higiene", status, observacao: "", ...extra });
const visita = (checklist, extra = {}) => ({ id: "v1", empresaId: "e1", data: "2026-10-20", status: "Em andamento", responsavel: "Ana", observacoes: "", progresso: 0, criadoEm: "x", checklist, ...extra });
const db = (extra = {}) => ({ empresas: { e1: { id: "e1", nomeFantasia: "Beyond Nutri" } }, empresaAtualId: "e1", visitas: [], ncs: [], evidencias: [], usuarios: [], registrosAuditoria: [], configuracaoAcesso: {}, ...extra });

test("só este aparelho mudou: as respostas feitas sem sinal sobrevivem à leitura da nuvem", () => {
  const base = db({ visitas: [visita([item("a", "Não Avaliado"), item("b", "Não Avaliado")])] });
  const local = db({ visitas: [visita([item("a", "Conforme"), item("b", "Não Conforme")])] });
  const { estado, conflitos } = mesclarTresVias(base, local, base);
  assert.deepEqual(conflitos, []);
  assert.deepEqual(estado.visitas[0].checklist.map((c) => c.status), ["Conforme", "Não Conforme"]);
});

test("mudanças em itens diferentes nos dois aparelhos se juntam, sem conflito", () => {
  const base = db({ visitas: [visita([item("a", "Não Avaliado"), item("b", "Não Avaliado")])] });
  const local = db({ visitas: [visita([item("a", "Conforme"), item("b", "Não Avaliado")])] });
  const nuvem = db({ visitas: [visita([item("a", "Não Avaliado"), item("b", "Não Conforme")], { observacoes: "da nuvem" })] });
  const { estado, conflitos } = mesclarTresVias(base, local, nuvem);
  assert.deepEqual(conflitos, []);
  assert.deepEqual(estado.visitas[0].checklist.map((c) => c.status), ["Conforme", "Não Conforme"]);
  assert.equal(estado.visitas[0].observacoes, "da nuvem");
});

test("o mesmo item mudado para valores diferentes é conflito: fica o meu e a nuvem vai para a lista", () => {
  const base = db({ visitas: [visita([item("a", "Não Avaliado")])] });
  const local = db({ visitas: [visita([item("a", "Conforme")])] });
  const nuvem = db({ visitas: [visita([item("a", "Não Conforme")])] });
  const { estado, conflitos } = mesclarTresVias(base, local, nuvem);
  assert.equal(conflitos.length, 1);
  assert.equal(conflitos[0].itemId, "a");
  assert.equal(estado.visitas[0].checklist[0].status, "Conforme", "nada é sobrescrito em silêncio");
  assert.equal(conflitos[0].nuvem.status, "Não Conforme");
  const trocado = usarVersaoDaNuvem(estado, conflitos[0]);
  assert.equal(trocado.visitas[0].checklist[0].status, "Não Conforme");
});

test("mesma alteração nos dois lados (reenvio depois de resposta perdida) não duplica nem gera conflito", () => {
  const base = db({ visitas: [visita([item("a", "Não Avaliado")])], ncs: [] });
  const nc = { id: "n1", empresaId: "e1", visitaId: "v1", titulo: "Piso", status: "Aberta" };
  const local = db({ visitas: [visita([item("a", "Não Conforme")])], ncs: [nc] });
  const nuvem = db({ visitas: [visita([item("a", "Não Conforme")])], ncs: [nc] });
  const { estado, conflitos } = mesclarTresVias(base, local, nuvem);
  assert.deepEqual(conflitos, []);
  assert.equal(estado.ncs.length, 1);
});

test("registro novo só aqui entra; registro novo só na nuvem entra; apagado na nuvem e mudado aqui fica e vira conflito", () => {
  const nc1 = { id: "n1", empresaId: "e1", titulo: "Um", status: "Aberta" };
  const base = db({ ncs: [nc1] });
  const local = db({ ncs: [{ ...nc1, status: "Resolvida" }, { id: "n2", empresaId: "e1", titulo: "Novo daqui", status: "Aberta" }] });
  const nuvem = db({ ncs: [{ id: "n3", empresaId: "e1", titulo: "Novo de lá", status: "Aberta" }] });
  const { estado, conflitos } = mesclarTresVias(base, local, nuvem);
  assert.deepEqual(estado.ncs.map((n) => n.id).sort(), ["n1", "n2", "n3"]);
  assert.equal(conflitos.length, 1);
  assert.equal(conflitos[0].registroId, "n1");
  assert.equal(conflitos[0].nuvem, undefined);
  assert.equal(usarVersaoDaNuvem(estado, conflitos[0]).ncs.some((n) => n.id === "n1"), false);
});

test("campos diferentes da mesma correção, mudados em aparelhos diferentes, se juntam", () => {
  const base = db({ ncs: [{ id: "n1", empresaId: "e1", titulo: "A", status: "Aberta", responsavelAcao: "", prazo: "" }] });
  const local = db({ ncs: [{ id: "n1", empresaId: "e1", titulo: "A", status: "Aberta", responsavelAcao: "Maria", prazo: "" }] });
  const nuvem = db({ ncs: [{ id: "n1", empresaId: "e1", titulo: "A", status: "Em tratamento", responsavelAcao: "", prazo: "2026-11-01" }] });
  const { estado, conflitos } = mesclarTresVias(base, local, nuvem);
  assert.deepEqual(conflitos, []);
  assert.deepEqual([estado.ncs[0].responsavelAcao, estado.ncs[0].status, estado.ncs[0].prazo], ["Maria", "Em tratamento", "2026-11-01"]);
});

test("pendências: conta respostas e registros que ainda não chegaram ao servidor", () => {
  const base = db({ visitas: [visita([item("a", "Não Avaliado"), item("b", "Não Avaliado")])] });
  assert.equal(contarAlteracoesPendentes(base, base), 0);
  const local = db({ visitas: [visita([item("a", "Conforme"), item("b", "Conforme")])], ncs: [{ id: "n1", empresaId: "e1" }] });
  assert.equal(contarAlteracoesPendentes(base, local), 3);
  assert.equal(contarAlteracoesPendentes(null, local), 0);
});
