import type { Norma } from "./tipos.ts";

// RDC 216/2004 (ANVISA), Regulamento Técnico de Boas Práticas para Serviços de Alimentação.
// ATENÇÃO: as cópias consultadas foram de prefeituras. Conferir no texto oficial da ANVISA antes de usar com clientes.
export const RDC_216_2004: Norma = {
  id: "rdc-216-2004",
  nome: "RDC 216/2004 (ANVISA)",
  esfera: "federal",
  fonte: "Resumo informado pelo responsável do projeto a partir de cópias de prefeituras; texto oficial da ANVISA ainda não conferido.",
  conferidoEm: null,
  avisos: ["Conferir no texto oficial da ANVISA antes de usar com clientes."],
  versaoCatalogo: "1",
  dataVersao: "2026-10-20",
  itens: {
    "estrutura-do-pop": {
      rotulo: "4.11.2",
      orientacao:
        "O POP traz instruções sequenciais, a frequência de execução e os responsáveis, com nome e cargo ou função. É aprovado, datado e assinado pelo responsável do estabelecimento.",
      conferir: true,
    },
    "guarda-de-registros": {
      rotulo: "4.11.3",
      orientacao: "Registros dos POPs guardados por 30 dias, a contar da data de preparação.",
      conferir: true,
      prazoDias: 30,
    },
    "lista-de-pops": {
      rotulo: "4.11.4",
      orientacao:
        "POPs de (a) higienização de instalações, equipamentos e móveis; (b) controle integrado de vetores e pragas urbanas; (c) higienização do reservatório; (d) higiene e saúde dos manipuladores.",
      conferir: true,
    },
    "higienizacao": {
      rotulo: "4.11.5",
      orientacao:
        "Os POPs de higienização indicam a natureza da superfície, o método, o princípio ativo e a concentração, o tempo de contato, a temperatura e outras informações necessárias; desmonte quando aplicável.",
      conferir: true,
    },
    "pragas": {
      rotulo: "4.11.6",
      orientacao: "Medidas preventivas e corretivas. Com controle químico, comprovante de execução da empresa especializada.",
      conferir: true,
    },
    "reservatorio-pop": {
      rotulo: "4.11.7",
      orientacao: "O POP do reservatório segue o mesmo que a higienização (4.11.5), mesmo quando terceirizado, com certificado de execução.",
      conferir: true,
    },
    "manipuladores": {
      rotulo: "4.11.8",
      orientacao:
        "Etapas, frequência e princípios ativos da lavagem e antissepsia das mãos; medidas para lesões, sintomas ou suspeita de problema de saúde; exames e periodicidade; programa de capacitação (carga horária, conteúdo, frequência e registro nominal).",
      conferir: true,
    },
    "reservatorio-intervalo": {
      rotulo: "4.4.4",
      orientacao: "Reservatório higienizado em intervalo máximo de seis meses, com registro.",
      conferir: true,
      prazoMeses: 6,
    },
  },
};
