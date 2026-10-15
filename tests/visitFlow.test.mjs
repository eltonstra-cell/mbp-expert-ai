import assert from "node:assert/strict";
import test from "node:test";
import { contarEtapas, etapaDaCorrecao, ordenarCorrecoes, prazoSugerido, progressoDaCorrecao, reincidenciaDaNc, validarPlano } from "../lib/actionPlan.ts";
import { criarRascunhosFaltantes, popSugeridoParaNc, popsDaVisita } from "../lib/pops.ts";
import { conferenciaDoRelatorio, mensagemDoRelatorio, pendenciasDoRelatorio } from "../lib/reportCheck.ts";
import { excluirAmbienteOculto, mostrarAmbiente, ocultarAmbiente, resumoOcultos } from "../lib/hiddenEnvs.ts";
import { passoDaView, passosDaTrilha, percentualDaVisita } from "../lib/visitTrail.ts";

const completa = { acaoCorretiva: "Trocar", responsavelAcao: "Ana", prazo: "2026-12-01" };

test("prazo sugerido: crítica 7, importante 15, leve 30 dias a partir de hoje", () => {
  assert.deepEqual(prazoSugerido("Crítica", "2026-10-15"), { dias: 7, data: "2026-10-22" });
  assert.deepEqual(prazoSugerido("Importante", "2026-10-15"), { dias: 15, data: "2026-10-30" });
  assert.deepEqual(prazoSugerido("Rotina", "2026-10-15"), { dias: 30, data: "2026-11-14" });
  assert.equal(prazoSugerido("Crítica", "2026-12-28").data, "2027-01-04");
});

test("esteira de correções mapeia os status existentes", () => {
  assert.equal(etapaDaCorrecao({ status: "Aberta" }), "identificadas");
  assert.equal(etapaDaCorrecao({ status: "Aberta", ...completa }), "plano");
  assert.equal(etapaDaCorrecao({ status: "Em tratamento", ...completa }), "acompanhamento");
  assert.equal(etapaDaCorrecao({ status: "Resolvida" }), "resolvidas");
  assert.deepEqual(
    contarEtapas([{ status: "Aberta" }, { status: "Aberta", ...completa }, { status: "Em tratamento" }, { status: "Resolvida" }, { status: "Resolvida" }]),
    { identificadas: 1, plano: 1, acompanhamento: 1, resolvidas: 2 }
  );
  assert.equal(progressoDaCorrecao({ status: "Aberta" }), 1);
  assert.equal(progressoDaCorrecao({ status: "Resolvida" }), 4);
});

test("reincidência: mesma empresa e critério em visita anterior", () => {
  const datas = { v1: "2026-08-01", v2: "2026-10-01", v3: "2026-11-01" };
  const dataDaVisita = (id) => datas[id];
  const base = { empresaId: "e1", ambiente: "Cozinha", categoria: "Piso", titulo: "Piso liso" };
  const todas = [
    { id: "a", visitaId: "v1", ...base },
    { id: "b", visitaId: "v2", ...base, titulo: "PISO LISO" },
    { id: "c", visitaId: "v2", ...base, empresaId: "e2" },
    { id: "d", visitaId: "v3", ...base, ambiente: "Salão" },
  ];
  assert.deepEqual(reincidenciaDaNc(todas[1], todas, dataDaVisita), { reincidente: true, visitaAnteriorId: "v1", dataAnterior: "2026-08-01" });
  assert.equal(reincidenciaDaNc(todas[0], todas, dataDaVisita).reincidente, false, "a mais antiga não é reincidente");
  assert.equal(reincidenciaDaNc(todas[2], todas, dataDaVisita).reincidente, false, "outra empresa não conta");
  assert.equal(reincidenciaDaNc(todas[3], todas, dataDaVisita).reincidente, false, "outro ambiente não conta");
});

test("reincidentes sobem dentro da gravidade", () => {
  const itens = [
    { id: 1, gravidade: "Rotina", reincidente: true },
    { id: 2, gravidade: "Crítica", reincidente: false },
    { id: 3, gravidade: "Crítica", reincidente: true },
  ];
  assert.deepEqual(ordenarCorrecoes(itens).map((i) => i.id), [3, 2, 1]);
});

test("validação do plano no campo", () => {
  assert.deepEqual(validarPlano({ acaoCorretiva: "", responsavelAcao: "", prazo: "2026-01-01" }, "2026-10-15", false), { prazo: "O prazo não pode estar no passado." });
  const erros = validarPlano({ acaoCorretiva: "", responsavelAcao: " ", prazo: "" }, "2026-10-15", true);
  assert.equal(Boolean(erros.acao && erros.responsavel && erros.prazo), true);
  assert.deepEqual(validarPlano({ ...completa }, "2026-10-15", true), {});
});

test("vínculo NC → POP usa o programa de controle e não inventa o resto", () => {
  assert.equal(popSugeridoParaNc({ categoria: "Controle de temperatura" })?.codigo, "POP-03");
  assert.equal(popSugeridoParaNc({ categoria: "Piso e ralos" }), null);
  const pops = [{ id: "p1", codigo: "POP-03", titulo: "Monitoramento de temperatura de equipamentos", versao: "1.0", status: "Aprovado", programaRelacionado: "Controle de temperatura", responsavel: "", proximaRevisao: "" }];
  const r = popsDaVisita(
    [
      { numero: 1, categoria: "Controle de temperatura" },
      { numero: 2, categoria: "Limpeza e higienização/sanitização" },
      { numero: 3, categoria: "Limpeza e higienização/sanitização" },
      { numero: 4, categoria: "Piso e ralos" },
    ],
    pops
  );
  assert.equal(r.linhas.length, 2);
  assert.deepEqual(r.linhas[1].ncs, [2, 3]);
  assert.deepEqual([r.ncsComPop, r.totalNcs, r.aprovados, r.aCriar, r.pendentes], [3, 4, 1, 1, 1]);
  assert.deepEqual(r.semPop, [4]);
});

test("criar POPs de uma vez cria só rascunhos dos que faltam e não mexe nos existentes", () => {
  const existente = { id: "p1", codigo: "POP-01", titulo: "Higienização de instalações, equipamentos e móveis", versao: "3.0", status: "Aprovado", programaRelacionado: "Limpeza e higienização/sanitização", responsavel: "Ana", proximaRevisao: "2027-01-01" };
  const linhas = popsDaVisita([{ numero: 1, categoria: "Limpeza e higienização/sanitização" }, { numero: 2, categoria: "Controle de temperatura" }], [existente]).linhas;
  let n = 0;
  const { pops, criados } = criarRascunhosFaltantes([existente], linhas, () => `novo-${++n}`);
  assert.equal(criados, 1);
  assert.equal(pops.length, 2);
  assert.deepEqual(pops[0], existente);
  assert.equal(pops[1].status, "Rascunho");
  assert.equal(criarRascunhosFaltantes(pops, popsDaVisita([{ numero: 2, categoria: "Controle de temperatura" }], pops).linhas, () => "x").criados, 0);
});

test("conferência do relatório e mensagem", () => {
  const dados = { respondidos: 29, totalChecklist: 221, ncsAbertas: 3, ncsSemResponsavelOuPrazo: 2, evidencias: 0, popsPendentes: 1, popsSugeridos: 2, cadastroPreenchidos: 4, cadastroTotal: 6 };
  const linhas = conferenciaDoRelatorio(dados);
  assert.equal(linhas.length, 5);
  assert.equal(pendenciasDoRelatorio(linhas), 5);
  assert.match(mensagemDoRelatorio(5).texto, /5 pendências/);
  const tudo = conferenciaDoRelatorio({ respondidos: 10, totalChecklist: 10, ncsAbertas: 0, ncsSemResponsavelOuPrazo: 0, evidencias: 2, popsPendentes: 0, popsSugeridos: 0, cadastroPreenchidos: 6, cadastroTotal: 6 });
  assert.equal(pendenciasDoRelatorio(tudo), 0);
  assert.equal(mensagemDoRelatorio(0).pronto, true);
  assert.match(mensagemDoRelatorio(1).texto, /1 pendência\./);
});

test("trilha: contadores, percentual e passo ativo", () => {
  const passos = passosDaTrilha({ respondidos: 29, total: 221, evidencias: 0, correcoesAbertas: 4, popsPendentes: 2 });
  assert.deepEqual(passos.map((p) => p.contador), [null, "29/221", null, "4", "2", null]);
  assert.deepEqual(passos.map((p) => p.numero), [1, 2, 3, 4, 5, 6]);
  assert.equal(percentualDaVisita(29, 221), 13);
  assert.equal(percentualDaVisita(0, 0), 0);
  assert.equal(passoDaView("plano"), "correcoes");
  assert.equal(passoDaView("visita"), "central");
  assert.equal(passoDaView("popsvisita"), "pops");
  assert.equal(passoDaView("inicio"), null);
});

test("ocultar ambiente guarda as respostas e tira o ambiente das contagens", () => {
  const visita = {
    ambientes: ["Cozinha", "Salão"],
    checklist: [
      { id: "i1", ambiente: "Cozinha", status: "Conforme" },
      { id: "i2", ambiente: "Cozinha", status: "Não Conforme" },
      { id: "i3", ambiente: "Salão", status: "Pendente" },
    ],
  };
  const ncs = [{ checklistItemId: "i2", inativaNoChecklist: false }, { checklistItemId: "i3" }];
  const oculto = ocultarAmbiente(visita, ncs, "Cozinha", "2026-10-15T10:00:00Z");
  assert.deepEqual(oculto.visita.ambientes, ["Salão"]);
  assert.equal(oculto.visita.checklist.length, 1, "itens ocultos saem do checklist e das contagens");
  assert.equal(oculto.ncs[0].inativaNoChecklist, true);
  assert.equal(oculto.ncs[1].inativaNoChecklist, undefined);
  assert.deepEqual(resumoOcultos(oculto.visita), [{ ambiente: "Cozinha", respostas: 2 }]);

  const volta = mostrarAmbiente(oculto.visita, oculto.ncs, "Cozinha");
  assert.deepEqual(volta.visita.ambientes, ["Salão", "Cozinha"]);
  assert.equal(volta.visita.checklist.length, 3);
  assert.equal(volta.visita.checklist.filter((i) => i.status !== "Pendente").length, 2, "respostas preservadas");
  assert.equal(volta.ncs[0].inativaNoChecklist, false);
  assert.equal(volta.visita.ambientesOcultos.length, 0);

  const excluido = excluirAmbienteOculto(oculto.visita, "Cozinha");
  assert.equal(excluido.respostasPerdidas, 2);
  assert.equal(excluido.visita.ambientesOcultos.length, 0);
  assert.equal(excluirAmbienteOculto(visita, "Salão").respostasPerdidas, 0);
});
