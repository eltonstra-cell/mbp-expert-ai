import test from "node:test";
import assert from "node:assert/strict";
import {
  etapasConfiguracaoEmpresa,
  resumoConfiguracaoEmpresa,
} from "../lib/companyReadiness.ts";

function empresaBase(alteracoes = {}) {
  return {
    id: "empresa-1",
    cnpj: "12345678000100",
    nomeFantasia: "Restaurante Teste",
    razaoSocial: "Restaurante Teste Ltda.",
    situacao: "Ativa",
    cnae: "",
    cnaeDescricao: "",
    tipo: "Restaurante",
    logradouro: "Rua A",
    numero: "1",
    complemento: "",
    bairro: "Centro",
    cep: "",
    municipio: "Santo Ângelo",
    uf: "RS",
    telefone: "",
    email: "",
    responsavel: "Maria",
    criadoEm: new Date(0).toISOString(),
    ...alteracoes,
  };
}

test("dados e ambientes são suficientes para liberar o início da visita", () => {
  const resumo = resumoConfiguracaoEmpresa(
    empresaBase({ setoresManual: ["Cozinha / Produção"] })
  );

  assert.equal(resumo.prontaParaVisita, true);
  assert.equal(resumo.concluidas, 2);
  assert.equal(resumo.total, 6);
});

test("empresa sem ambientes ainda não está pronta para a visita", () => {
  const resumo = resumoConfiguracaoEmpresa(empresaBase());

  assert.equal(resumo.prontaParaVisita, false);
  assert.equal(resumo.proximaEtapa?.id, "ambientes");
});

test("etapas técnicas são reconhecidas sem exigir que estejam todas concluídas", () => {
  const etapas = etapasConfiguracaoEmpresa(
    empresaBase({
      atividadeDescricao: "Produção de refeições",
      consultorNome: "Consultor",
      responsabilidadesManual: [
        { id: "r1", papel: "Consultor/RT", descricao: "Revisar", ativa: true },
      ],
      setoresManual: ["Cozinha / Produção"],
      fluxosOperacionais: [
        {
          id: "f1",
          tipo: "Recebimento",
          aplicavel: true,
          setorVinculado: "Cozinha / Produção",
          descricao: "",
          responsavel: "",
          controlesRegistros: "",
        },
      ],
      programasControleQualidade: [
        {
          id: "p1",
          nome: "Compras",
          status: "Em implantação",
          responsavel: "",
          frequencia: "",
          registro: "",
          documentoRelacionado: "",
          observacao: "",
        },
      ],
      pops: [
        {
          id: "pop1",
          codigo: "POP-01",
          titulo: "Higienização",
          versao: "1.0",
          status: "Rascunho",
          programaRelacionado: "",
          responsavel: "",
          proximaRevisao: "",
        },
      ],
    })
  );

  assert.deepEqual(
    etapas.map((item) => item.concluida),
    [true, true, true, true, true, true]
  );
});

test("preparação da empresa: 6 itens, só com dados existentes", async () => {
  const { preparacaoDaEmpresa } = await import("../lib/companyReadiness.ts");
  const vazia = preparacaoDaEmpresa(empresaBase({ responsavel: "" }));
  assert.equal(vazia.total, 6);
  assert.equal(vazia.preenchidos, 0);
  assert.equal(vazia.percentual, 0);
  assert.equal(vazia.completo, false);
  assert.deepEqual(vazia.contagens, { setores: 0, equipamentos: 0, programas: 0, pops: 0 });
  assert.equal(preparacaoDaEmpresa(undefined).percentual, 0);
});

test("preparação da empresa: percentual = preenchidos / 6 e 100% é cadastro completo", async () => {
  const { preparacaoDaEmpresa } = await import("../lib/companyReadiness.ts");
  const parcial = preparacaoDaEmpresa(
    empresaBase({ horarioFuncionamento: "Seg a Sex", setoresManual: ["Cozinha"] })
  );
  assert.equal(parcial.preenchidos, 3);
  assert.equal(parcial.percentual, 50);
  assert.equal(parcial.completo, false);

  const completa = preparacaoDaEmpresa(
    empresaBase({
      horariosFuncionamento: [{ dia: "Segunda-feira", aberto: true, abertura: "08:00", fechamento: "18:00" }],
      setoresManual: ["Cozinha", "Estoque"],
      equipamentosSetores: [{ id: "q1", setor: "Cozinha", nome: "Fogão", quantidade: 1 }],
      programasControleQualidade: [{ id: "p1", status: "Implantado" }, { id: "p2", status: "Não iniciado" }],
      pops: [{ id: "pop-1", titulo: "Higiene" }],
    })
  );
  assert.equal(completa.percentual, 100);
  assert.equal(completa.completo, true);
  assert.deepEqual(completa.contagens, { setores: 2, equipamentos: 1, programas: 1, pops: 1 });
});

test("preparação da empresa: horário fechado em todos os dias não conta", async () => {
  const { preparacaoDaEmpresa } = await import("../lib/companyReadiness.ts");
  const r = preparacaoDaEmpresa(
    empresaBase({ horariosFuncionamento: [{ dia: "Domingo", aberto: false, abertura: "", fechamento: "" }] })
  );
  assert.equal(r.itens.find((item) => item.id === "horario").ok, false);
});

test("faltasDoCadastro: só os obrigatórios (nome, CNPJ, responsável, ambientes) e na ordem da tela", async () => {
  const { faltasDoCadastro } = await import("../lib/companyReadiness.ts");
  assert.deepEqual(faltasDoCadastro(empresaBase({ responsavel: "", setoresManual: [] })), ["responsável", "ambientes"]);
  assert.deepEqual(faltasDoCadastro(empresaBase({ cnpj: "", responsavel: "Ana", setoresManual: ["Cozinha"] })), ["CNPJ"]);
  assert.deepEqual(faltasDoCadastro(empresaBase({ nomeFantasia: "", razaoSocial: "", cnpj: "", responsavel: "", setoresManual: [] })), ["nome", "CNPJ", "responsável", "ambientes"]);
  // completo para visita mesmo sem equipamento, programa, POP ou horário (esses entram só na Preparação)
  assert.deepEqual(faltasDoCadastro(empresaBase({ responsavel: "Ana", setoresManual: ["Cozinha"] })), []);
  assert.equal(faltasDoCadastro(undefined).length, 4);
});
