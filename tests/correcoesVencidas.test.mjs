import assert from "node:assert/strict";
import test from "node:test";

import { correcoesAbertasDaEmpresa, correcoesVencidasDaEmpresa } from "../lib/correcoesVencidas.ts";
import { colunasDoInicio, contadorDoPainel } from "../lib/inicio.ts";

const nc = (id, extra = {}) => ({ id, empresaId: "e1", status: "Aberta", prazo: "2026-10-20", ...extra });
const HOJE = "2026-10-26";

test("selo: só correções abertas com prazo anterior a hoje", () => {
  const ncs = [nc("a"), nc("b", { status: "Em tratamento" }), nc("c", { status: "Resolvida" }), nc("d", { prazo: "2026-10-26" }), nc("e", { prazo: "" }), nc("f", { prazo: "2026-11-01" }), nc("g", { inativaNoChecklist: true })];
  assert.deepEqual(correcoesVencidasDaEmpresa(ncs, "e1", HOJE).map((x) => x.id), ["a", "b"]);
});

test("selo: correção de outra empresa não conta e a lista da empresa é a base do selo", () => {
  const ncs = [nc("a"), nc("x", { empresaId: "e2" })];
  assert.deepEqual(correcoesVencidasDaEmpresa(ncs, "e1", HOJE).map((x) => x.id), ["a"]);
  assert.deepEqual(correcoesAbertasDaEmpresa(ncs, "e2").map((x) => x.id), ["x"]);
  assert.deepEqual(correcoesVencidasDaEmpresa(undefined, "e1", HOJE), []);
});

test("selo: o dia do prazo ainda não está vencido (hoje é a data de São Paulo recebida)", () => {
  assert.equal(correcoesVencidasDaEmpresa([nc("a", { prazo: "2026-10-25" })], "e1", "2026-10-25").length, 0);
  assert.equal(correcoesVencidasDaEmpresa([nc("a", { prazo: "2026-10-25" })], "e1", "2026-10-26").length, 1);
});

const zero = { correcao: 0, comprovante: 0, capacitacao: 0, pop: 0 };
const c = (v, extra = {}) => contadorDoPainel({ vencidosPorOrigem: { ...zero, ...v }, aguardando: 0, semPrazo: 0, ...extra });

test("contador do Início: um tipo por número, só os maiores que zero, com plural", () => {
  assert.equal(c({}), "");
  assert.equal(c({ correcao: 2, comprovante: 1, capacitacao: 2 }), "2 correções vencidas · 1 comprovante vencido · 2 treinamentos vencidos");
  assert.equal(c({ correcao: 1 }), "1 correção vencida");
  assert.equal(c({ comprovante: 3 }), "3 comprovantes vencidos");
  assert.equal(c({ capacitacao: 1 }), "1 treinamento vencido");
  assert.equal(c({ pop: 1 }), "1 POP vencido");
  assert.equal(c({ pop: 2 }), "2 POPs vencidos");
  assert.equal(c({ comprovante: 1, capacitacao: 1 }), "1 comprovante vencido · 1 treinamento vencido");
  assert.equal(c({ correcao: 1 }, { aguardando: 2, semPrazo: 1 }), "1 correção vencida · 2 aguardando aprovação · 1 aberta sem prazo");
});

test("colunasDoInicio expõe os vencidos por origem e o total continua igual à soma", () => {
  const item = (id, origem, situacao) => ({ id, origem, titulo: id, prazo: "", situacao, dias: -1, quem: "x", acao: "abrir", rotuloDaAcao: "Abrir" });
  const r = colunasDoInicio([item("c1", "correcao", "vencido"), item("c2", "correcao", "vencido"), item("k", "comprovante", "vencido"), item("t", "capacitacao", "vencido"), item("p", "pop", "aguardando")], [], HOJE);
  assert.deepEqual(r.vencidosPorOrigem, { correcao: 2, comprovante: 1, capacitacao: 1, pop: 0 });
  assert.equal(r.vencidos, 4);
});
