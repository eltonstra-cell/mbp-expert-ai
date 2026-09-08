import assert from "node:assert/strict";
import test from "node:test";

import {
  AMBIENTES_DETALHADOS_RESTAURANTE,
  criarModelosQuestionarioAmbientes,
  criarHorarioExemploManual,
  criarResponsabilidadesPadrao,
  normalizarEquipamentos,
  migrarSetoresLegados,
  migrarVisitaParaChecklistManual,
  normalizarHorarios,
  normalizarSetorManual,
  obterModeloQuestionarioParaAmbiente,
  resumirHorarioFuncionamento,
  SETORES_OFICIAIS_MANUAL,
} from "../lib/manualBase.ts";

test("preserva os 19 nomes reais do roteiro detalhado do restaurante", () => {
  assert.equal(AMBIENTES_DETALHADOS_RESTAURANTE.length, 19);
  assert.equal(AMBIENTES_DETALHADOS_RESTAURANTE[0], "Recebimento de Mercadorias");
  assert.equal(AMBIENTES_DETALHADOS_RESTAURANTE[18], "Central de Gás");
});

test("vincula ambientes reais aos modelos técnicos correspondentes", () => {
  const modelos = criarModelosQuestionarioAmbientes([
    "Copa",
    "Câmara Fria",
    "Sanitários/Vestiários de Funcionários",
    "Área Administrativa",
  ]);
  assert.equal(modelos.Copa, "Cozinha / Produção");
  assert.equal(modelos["Câmara Fria"], "Estoque de matérias-primas, ingredientes e embalagens");
  assert.equal(modelos["Sanitários/Vestiários de Funcionários"], "Sanitários/Vestiários de Funcionários");
  assert.equal(obterModeloQuestionarioParaAmbiente("Área Administrativa"), "Área Administrativa");
  assert.equal(obterModeloQuestionarioParaAmbiente("Padaria artesanal"), "Estrutura geral/personalizada");
});

test("migração nova pode preservar o nome real do ambiente", () => {
  const visita = migrarVisitaParaChecklistManual({
    ambientes: ["Copa", "Churrasqueira"],
    checklist: [],
    checklistVersao: 6,
  }, 10, true);
  assert.deepEqual(visita.ambientes, ["Copa", "Churrasqueira"]);
  assert.equal(visita.checklistVersao, 10);
});

test("migra os sanitários antigos para os setores específicos do Manual", () => {
  const setores = migrarSetoresLegados([
    "Sanitários/Vestiários de Funcionários",
    "Sanitários de Clientes",
  ]);
  assert.equal(setores.length, 6);
  assert.equal(setores.includes("Banheiro feminino de colaborador"), true);
  assert.equal(setores.includes("Banheiro masculino de clientes"), true);
});

test("consolida subsetores antigos sem repetir o setor oficial", () => {
  const setores = migrarSetoresLegados(["Copa", "Churrasqueira", "Cozinha / Produção"]);
  assert.deepEqual(setores, ["Cozinha / Produção"]);
});

test("migra a lista antiga completa usada nas visitas", () => {
  const setores = migrarSetoresLegados([
    "01 - Recebimento de matérias-primas, ingredientes, embalagens e materiais de limpeza",
    "02 - Salão de Atendimento",
    "03 - Copa",
    "04 - Churrasqueira",
    "05 - Cozinha / Produção",
    "06 - Higienização de Hortifrutigranjeiros",
    "07 - Higienização de Utensílios e Equipamentos",
    "08 - Higienização de Espetos",
    "09 - Higienização de Materiais de Limpeza",
    "10 - Estoque Seco",
    "11 - Câmara Fria",
    "12 - Armazenamento Congelado (Freezers)",
    "13 - Depósito de Embalagens e Descartáveis",
    "14 - Depósito de Material de Limpeza (DML)",
    "15 - Armazenamento Temporário de Resíduos",
    "16 - Sanitários / Vestiários de Funcionários",
    "17 - Sanitários de Clientes",
    "18 - 18. Área Administrativa",
  ]);
  assert.deepEqual(
    setores,
    SETORES_OFICIAIS_MANUAL.filter((setor) => setor !== "Central de gás")
  );
});

test("refaz checklist antigo sem respostas e preserva o respondido", () => {
  const pendente = migrarVisitaParaChecklistManual({
    ambientes: ["Sanitários/Vestiários de Funcionários"],
    checklist: [{ status: "Pendente", observacao: "" }],
    checklistVersao: 5,
  });
  assert.equal(pendente.ambientes.length, 4);
  assert.deepEqual(pendente.checklist, []);
  assert.equal(pendente.checklistVersao, 10);

  const respondida = {
    ambientes: ["Sanitários/Vestiários de Funcionários"],
    checklist: [{ status: "Conforme", observacao: "" }],
    checklistVersao: 5,
  };
  assert.equal(migrarVisitaParaChecklistManual(respondida), respondida);
});

test("mantém os 13 setores oficiais descritos no Manual", () => {
  assert.equal(SETORES_OFICIAIS_MANUAL.length, 13);
  assert.ok(SETORES_OFICIAIS_MANUAL.includes("Central de gás"));
  assert.ok(SETORES_OFICIAIS_MANUAL.includes("Banheiro feminino de clientes"));
});

test("reconhece nomes antigos sem alterar setores personalizados", () => {
  assert.equal(normalizarSetorManual("Recebimento"), SETORES_OFICIAIS_MANUAL[0]);
  assert.equal(normalizarSetorManual("DML / Material de limpeza"), SETORES_OFICIAIS_MANUAL[2]);
  assert.equal(normalizarSetorManual("Padaria"), "Padaria");
});

test("resume o horário usado como exemplo no Manual", () => {
  const resumo = resumirHorarioFuncionamento(criarHorarioExemploManual());
  assert.match(resumo, /Segunda a Sexta: 07:30 às 18:00/);
  assert.match(resumo, /Sábado: 07:30 às 12:00/);
  assert.match(resumo, /Domingo: Fechado/);
});

test("normaliza horários incompletos sem perder os sete dias", () => {
  const horarios = normalizarHorarios([
    { dia: "Segunda-feira", aberto: true, abertura: "08:00", fechamento: "17:00" },
  ]);
  assert.equal(horarios.length, 7);
  assert.equal(horarios[0].aberto, true);
  assert.equal(horarios[6].aberto, false);
});

test("carrega responsabilidades dos dois papéis", () => {
  const responsabilidades = criarResponsabilidadesPadrao();
  assert.ok(responsabilidades.some((item) => item.papel === "Proprietário"));
  assert.ok(responsabilidades.some((item) => item.papel === "Consultor/RT"));
  assert.ok(responsabilidades.every((item) => !item.ativa));
});

test("normaliza equipamentos antigos e preserva o vínculo ao setor", () => {
  const equipamentos = normalizarEquipamentos([
    {
      id: "",
      setor: "Recebimento",
      nome: "Balança",
      quantidade: 0,
      estado: "Não avaliado",
      observacao: "",
    },
  ]);
  assert.equal(equipamentos[0].setor, "Recebimento");
  assert.equal(equipamentos[0].quantidade, 1);
});
