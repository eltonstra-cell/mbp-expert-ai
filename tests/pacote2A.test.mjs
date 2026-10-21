import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { agoraParaCampoLocal, dataISOLocal, diasEntreDatas, ehSoData, formatarData, formatarDataCurta, formatarDataCurtaHora, formatarDataHora, formatarHora, hojeLocalISO, isoParaLocal, localParaISO, somarDias } from "../lib/dataLocal.ts";

const ler = (c) => readFileSync(new URL(c, import.meta.url), "utf8");

// ===== A1: datas e fuso =====
test("fuso: 21:00 a 23:59 de São Paulo (00:00 a 02:59 UTC do dia seguinte) continuam no mesmo dia", () => {
  for (const [utc, dia, hora] of [
    ["2026-10-21T00:00:00.000Z", "2026-10-20", "21:00"],
    ["2026-10-21T00:26:00.000Z", "2026-10-20", "21:26"],
    ["2026-10-21T02:59:00.000Z", "2026-10-20", "23:59"],
    ["2026-10-21T03:00:00.000Z", "2026-10-21", "00:00"],
    ["2026-10-20T20:59:00.000Z", "2026-10-20", "17:59"],
  ]) {
    assert.equal(dataISOLocal(utc), dia, utc);
    assert.equal(formatarHora(utc), hora, utc);
    assert.equal(formatarData(utc), dia.split("-").reverse().join("/"), utc);
  }
  assert.equal(formatarDataHora("2026-10-21T00:26:00.000Z"), "20/10/2026 21:26");
  assert.equal(formatarDataCurtaHora("2026-10-21T00:26:00.000Z", "2026-10-21"), "20/10 · 21:26");
  assert.equal(formatarDataCurta("2026-10-21T00:26:00.000Z", "2026-10-21"), "20/10");
  // o texto ISO cortado trazia o dia errado: é exatamente o defeito que o teste protege
  assert.notEqual("2026-10-21T00:26:00.000Z".slice(0, 10), dataISOLocal("2026-10-21T00:26:00.000Z"));
});

test("fuso: texto só de data nunca muda de dia e não tem hora", () => {
  assert.equal(ehSoData("2026-10-20"), true);
  assert.equal(ehSoData("2026-10-20T00:00:00Z"), false);
  assert.equal(dataISOLocal("2026-10-20"), "2026-10-20");
  assert.equal(formatarData("2026-10-20"), "20/10/2026");
  assert.equal(formatarHora("2026-10-20"), "");
  assert.equal(formatarDataHora("2026-10-20"), "20/10/2026");
  assert.equal(formatarData(""), "");
  assert.equal(formatarData(undefined), "");
  assert.equal(formatarData("lixo"), "");
});

test("fuso: hoje, dias entre datas e somar dias usam o calendário de São Paulo", () => {
  assert.equal(hojeLocalISO(new Date("2026-10-21T01:30:00.000Z")), "2026-10-20", "01:30 UTC ainda é 20/10 em SP");
  assert.equal(hojeLocalISO(new Date("2026-10-21T03:00:00.000Z")), "2026-10-21");
  assert.equal(diasEntreDatas("2026-10-21T00:26:00.000Z", "2026-10-25"), 5, "o registro de 21:26 de 20/10 conta como dia 20");
  assert.equal(diasEntreDatas("2026-10-25", "2026-10-20"), -5);
  assert.equal(diasEntreDatas("2026-02-28", "2026-03-01"), 1);
  assert.equal(somarDias("2026-10-31", 1), "2026-11-01");
  assert.equal(somarDias("2026-03-01", -1), "2026-02-28");
});

test("fuso: campo datetime-local lido e escrito como horário de São Paulo, em qualquer fuso do navegador", () => {
  assert.equal(localParaISO("2026-10-20T21:26"), "2026-10-21T00:26:00.000Z");
  assert.equal(localParaISO("2026-10-20T00:00"), "2026-10-20T03:00:00.000Z");
  assert.equal(localParaISO("2026-10-20T23:59"), "2026-10-21T02:59:00.000Z");
  assert.equal(isoParaLocal("2026-10-21T00:26:00.000Z"), "2026-10-20T21:26");
  assert.equal(isoParaLocal("2026-10-21T03:00:00.000Z"), "2026-10-21T00:00");
  assert.equal(localParaISO(isoParaLocal("2026-11-05T14:07:00.000Z")), "2026-11-05T14:07:00.000Z");
  assert.equal(localParaISO("não é data"), "");
  assert.equal(agoraParaCampoLocal(new Date("2026-10-21T00:26:40.000Z")), "2026-10-20T21:26");
});

test("auditoria de datas: nenhum corte de texto ISO nem toLocale sem fuso nos pontos que mostram ou comparam datas de registro", () => {
  for (const arquivo of ["../lib/popGestao.ts", "../lib/dossie.ts", "../lib/painelHoje.ts", "../components/pc/PcFichaPop.tsx", "../components/pc/PcRegistrosDoPop.tsx", "../components/pc/PcRelatoriosEmitidos.tsx"]) {
    const texto = ler(arquivo);
    assert.ok(!/\.slice\(0,\s*10\)/.test(texto.replace(/iso\.slice\(0, 10\)\.split/g, "")), `${arquivo} ainda corta texto ISO`);
    assert.ok(!/toLocale(Date|Time)String\(/.test(texto), `${arquivo} ainda usa toLocale sem fuso`);
  }
});

// ===== A2: nome e cargo =====
import { limparTextoDePessoa, nomeECargo, nomeProprio } from "../lib/nomeCargo.ts";
import { sugestaoDePopParaTipo, avisoDePopAusente } from "../lib/comprovantePop.ts";

test("nome e cargo: sem vírgula sobrando no começo ou no fim, sem espaço duplo", () => {
  assert.equal(limparTextoDePessoa(", Nutricionista RT"), "Nutricionista RT");
  assert.equal(limparTextoDePessoa("Elton,  "), "Elton");
  assert.equal(nomeECargo("Elton,", ", Nutricionista  RT"), "Elton, Nutricionista RT");
  assert.equal(nomeECargo("Elton", ""), "Elton");
  assert.equal(nomeECargo("", "Cargo"), "Cargo");
});

test("nome próprio: capitaliza, preposições em minúscula e preserva caixa mista", () => {
  assert.equal(nomeProprio("maria da silva"), "Maria da Silva");
  assert.equal(nomeProprio("JOSÉ DOS SANTOS"), "José dos Santos");
  assert.equal(nomeProprio("João McDonald"), "João McDonald");
});

// ===== A3: tipo do comprovante → POP =====
test("comprovante: pragas e reservatório sugerem o POP certo; contrato e outros ficam sem POP", () => {
  assert.equal(sugestaoDePopParaTipo("contrato-rt", []).situacao, "sem-pop");
  assert.equal(sugestaoDePopParaTipo("outro", []).situacao, "sem-pop");
  const pragas = sugestaoDePopParaTipo("pragas", []);
  assert.equal(pragas.situacao, "falta-criar");
  assert.ok(avisoDePopAusente(pragas.definicao).startsWith("O POP de ") && avisoDePopAusente(pragas.definicao).endsWith("ainda não foi criado."));
  assert.equal(sugestaoDePopParaTipo("reservatorio", []).situacao, "falta-criar");
});

// ===== A8: anotações do desenho não vazam para a interface =====
test("nenhuma anotação de quadro de desenho aparece nas telas", () => {
  for (const arquivo of ["../components/pc/PcPopsLista.tsx", "../components/pc/PcFichaPop.tsx"]) {
    const t = ler(arquivo);
    assert.ok(!t.includes("UMA próxima ação. Ordem:") && !t.includes("ficam aqui, não em áreas separadas"), arquivo);
  }
});
