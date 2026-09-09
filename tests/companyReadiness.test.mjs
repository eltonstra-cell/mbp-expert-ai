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
