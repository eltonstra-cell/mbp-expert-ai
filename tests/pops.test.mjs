import assert from "node:assert/strict";
import test from "node:test";
import { normalizarPops, SUGESTOES_POPS_MANUAL, situacaoRevisaoPOP } from "../lib/pops.ts";

test("as sugestões são os 4 POPs da norma (RDC 216, 4.11.4 a–d), sem potabilidade nem temperatura", () => {
  assert.equal(SUGESTOES_POPS_MANUAL.length, 4);
  assert.equal(SUGESTOES_POPS_MANUAL.some((pop) => pop.titulo.includes("potabilidade")), false);
  assert.equal(SUGESTOES_POPS_MANUAL.some((pop) => pop.titulo.includes("temperatura")), false);
  assert.deepEqual(SUGESTOES_POPS_MANUAL.map((pop) => pop.titulo), [
    "Higienização de instalações, equipamentos e móveis",
    "Controle integrado de vetores e pragas urbanas",
    "Higienização do reservatório",
    "Higiene e saúde dos manipuladores",
  ]);
});

test("descarta registros vazios e preserva o vínculo do POP", () => {
  const pops = normalizarPops([
    {
      id: "",
      codigo: "POP-01",
      titulo: "Higienização",
      versao: "2.0",
      status: "Aprovado",
      programaRelacionado: "Limpeza e higienização/sanitização",
      responsavel: "Responsável técnico",
      proximaRevisao: "2027-01-10",
    },
    {
      id: "vazio",
      codigo: "",
      titulo: "",
      versao: "",
      status: "Rascunho",
      programaRelacionado: "",
      responsavel: "",
      proximaRevisao: "",
    },
  ]);

  assert.equal(pops.length, 1);
  assert.equal(pops[0].id, "pop-1");
  assert.equal(pops[0].programaRelacionado, "Limpeza e higienização/sanitização");
});

test("identifica POP aprovado com revisão vencida, próxima e em dia", () => {
  const base = {
    id: "pop-1",
    codigo: "POP-01",
    titulo: "Higienização",
    versao: "1.0",
    status: "Aprovado",
    programaRelacionado: "",
    responsavel: "RT",
    proximaRevisao: "2026-09-01",
  };
  assert.equal(situacaoRevisaoPOP(base, "2026-09-08").label, "Revisão vencida");
  assert.equal(situacaoRevisaoPOP({ ...base, proximaRevisao: "2026-09-20" }, "2026-09-08").label, "Revisão próxima");
  assert.equal(situacaoRevisaoPOP({ ...base, proximaRevisao: "2026-12-20" }, "2026-09-08").label, "Em dia");
});

test("não trata rascunho como revisão vencida", () => {
  const situacao = situacaoRevisaoPOP({
    id: "pop-2",
    codigo: "",
    titulo: "Potabilidade",
    versao: "1.0",
    status: "Rascunho",
    programaRelacionado: "",
    responsavel: "",
    proximaRevisao: "2020-01-01",
  }, "2026-09-08");
  assert.equal(situacao.label, "Em elaboração");
});

test("adicionarPop: exige título e impede código repetido", async () => {
  const { adicionarPop } = await import("../lib/pops.ts");
  const existentes = [{ id: "1", codigo: "POP-01", titulo: "Higiene", versao: "1.0", status: "Rascunho", programaRelacionado: "", responsavel: "", proximaRevisao: "" }];
  assert.deepEqual(adicionarPop(existentes, "", "  ", "2"), { ok: false, campo: "titulo", aviso: "Informe o título do POP." });
  const repetido = adicionarPop(existentes, " pop-01 ", "Outro", "2");
  assert.equal(repetido.ok, false);
  assert.equal(repetido.campo, "codigo");
  const bom = adicionarPop(existentes, "POP-09", " Água ", "2");
  assert.equal(bom.ok, true);
  assert.equal(bom.pops.length, 2);
  assert.equal(bom.pops[1].titulo, "Água");
  assert.equal(bom.pops[1].status, "Rascunho");
  assert.equal(adicionarPop(existentes, "", "Sem código", "3").ok, true);
});

test("adicionarSugestaoPop: não duplica e tira o código quando já está em uso", async () => {
  const { adicionarSugestaoPop, SUGESTOES_POPS_MANUAL, sugestaoJaCriada } = await import("../lib/pops.ts");
  const primeira = adicionarSugestaoPop([], SUGESTOES_POPS_MANUAL[0], "a");
  assert.equal(primeira.pops.length, 1);
  assert.equal(primeira.pops[0].codigo, "POP-01");
  assert.equal(sugestaoJaCriada(primeira.pops, SUGESTOES_POPS_MANUAL[0]), true);
  assert.equal(adicionarSugestaoPop(primeira.pops, SUGESTOES_POPS_MANUAL[0], "b").pops.length, 1);
  const comCodigoEmUso = [{ ...primeira.pops[0], titulo: "Outro título" }];
  const semCodigo = adicionarSugestaoPop(comCodigoEmUso, SUGESTOES_POPS_MANUAL[0], "c");
  assert.equal(semCodigo.pops[1].codigo, "");
  assert.match(semCodigo.aviso, /numeração/);
});

test("resumoPops e tomSituacaoPOP", async () => {
  const { resumoPops, tomSituacaoPOP } = await import("../lib/pops.ts");
  const base = { id: "x", codigo: "", titulo: "t", versao: "1", programaRelacionado: "", responsavel: "" };
  const pops = [
    { ...base, status: "Aprovado", proximaRevisao: "2020-01-01" },
    { ...base, status: "Aprovado", proximaRevisao: "2099-01-01" },
    { ...base, status: "Rascunho", proximaRevisao: "" },
    { ...base, status: "Em revisão", proximaRevisao: "" },
  ];
  assert.deepEqual(resumoPops(pops, "2026-10-15"), { aprovados: 2, emPreparacao: 2, revisaoVencida: 1 });
  assert.equal(tomSituacaoPOP("Em dia"), "ok");
  assert.equal(tomSituacaoPOP("Revisão vencida"), "nc");
  assert.equal(tomSituacaoPOP("Em elaboração"), "pend");
  assert.equal(tomSituacaoPOP("Inativo"), "na");
});
