import assert from "node:assert/strict";
import test from "node:test";

import {
  criarHorarioExemploManual,
  criarResponsabilidadesPadrao,
  normalizarEquipamentos,
  migrarSetoresLegados,
  normalizarHorarios,
  normalizarSetorManual,
  resumirHorarioFuncionamento,
  SETORES_OFICIAIS_MANUAL,
} from "../lib/manualBase.ts";

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
  assert.equal(equipamentos[0].setor, SETORES_OFICIAIS_MANUAL[0]);
  assert.equal(equipamentos[0].quantidade, 1);
});
