import type { Norma } from "./tipos.ts";

// Portaria SES 799/2023 (Rio Grande do Sul). Citações a partir do PDF do governo do RS.
// Só três itens vieram com a numeração exata (13.7 a–d; Anexo II 13.2; Anexo I 13.2). Nos demais, a norma
// repete os itens da RDC 216/2004 mas a numeração na Portaria não foi confirmada: ficam como "conferir".
const MESMO_ITEM_DA_RDC = "Anexo II (item a conferir)";

export const SES_799_2023_RS: Norma = {
  id: "ses-799-2023-rs",
  nome: "Portaria SES 799/2023 (RS)",
  esfera: "estadual",
  uf: "RS",
  fonte: "PDF do governo do RS (informado pelo responsável do projeto; o arquivo não está no repositório).",
  conferidoEm: null,
  avisos: ["Vigência da Portaria SES 799/2023: confirmar no diário oficial.", "Exigência municipal: confirmar com a Vigilância Sanitária."],
  versaoCatalogo: "1",
  dataVersao: "2026-10-20",
  itens: {
    "estrutura-do-pop": {
      rotulo: MESMO_ITEM_DA_RDC,
      orientacao:
        "O POP traz instruções sequenciais, a frequência de execução e os responsáveis, com nome e cargo ou função. É aprovado, datado e assinado pelo responsável do estabelecimento.",
      conferir: true,
    },
    "guarda-de-registros": {
      rotulo: "Anexo I, 13.2",
      orientacao: "Registros guardados por 90 dias.",
      prazoDias: 90,
    },
    "lista-de-pops": {
      rotulo: "Anexo II, 13.7 (a–d)",
      orientacao:
        "POPs de (a) higienização de instalações, equipamentos e móveis; (b) controle integrado de vetores e pragas urbanas; (c) higienização do reservatório; (d) higiene e saúde dos manipuladores.",
    },
    "higienizacao": {
      rotulo: MESMO_ITEM_DA_RDC,
      orientacao:
        "Natureza da superfície, método, princípio ativo e concentração, tempo de contato, temperatura e outras informações necessárias; desmonte quando aplicável.",
      conferir: true,
    },
    "pragas": {
      rotulo: MESMO_ITEM_DA_RDC,
      orientacao: "Medidas preventivas e corretivas. Com controle químico, comprovante de execução da empresa especializada.",
      conferir: true,
    },
    "reservatorio-pop": {
      rotulo: MESMO_ITEM_DA_RDC,
      orientacao: "O POP do reservatório segue o mesmo que a higienização, mesmo quando terceirizado, com certificado de execução.",
      conferir: true,
    },
    "manipuladores": {
      rotulo: MESMO_ITEM_DA_RDC,
      orientacao:
        "Etapas, frequência e princípios ativos da lavagem e antissepsia das mãos; medidas para lesões, sintomas ou suspeita de problema de saúde; exames e periodicidade; programa de capacitação.",
      conferir: true,
    },
    "reservatorio-intervalo": {
      rotulo: MESMO_ITEM_DA_RDC,
      orientacao: "Reservatório higienizado em intervalo máximo de seis meses, com registro.",
      conferir: true,
    },
    // Referências de capacitação trazidas da pesquisa do responsável do projeto: sem número de item confirmado.
    "capacitacao-admissional-anual": {
      rotulo: MESMO_ITEM_DA_RDC,
      orientacao: "Capacitação dos manipuladores na admissão e todos os anos.",
      conferir: true,
      prazoMeses: 12,
    },
    "curso-do-responsavel": {
      rotulo: MESMO_ITEM_DA_RDC,
      orientacao: "Curso do responsável pelas atividades com carga horária mínima de 12 h e atualização anual.",
      conferir: true,
      prazoMeses: 12,
    },
    "acao-corretiva": {
      rotulo: "Anexo II, 13.2",
      orientacao: "O POP prevê a ação corretiva.",
    },
  },
};
