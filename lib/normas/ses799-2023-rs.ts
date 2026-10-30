import type { Norma } from "./tipos.ts";

// Portaria SES 799/2023 (Rio Grande do Sul). Conferida em 2026-10-30 contra o PDF guardado em docs/normas/ (26 páginas).
// Anexo I = procedimentos de boas práticas; Anexo II = lista de verificação. Cada item traz `fonteNoTexto` com o item e a página do PDF.

export const SES_799_2023_RS: Norma = {
  id: "ses-799-2023-rs",
  nome: "Portaria SES 799/2023 (RS)",
  esfera: "estadual",
  uf: "RS",
  fonte: "PDF da Portaria SES 799/2023 (Secretaria da Saúde do RS), conferido item a item em 2026-10-30.",
  conferidoEm: "2026-10-30",
  avisos: ["Vigência da Portaria SES 799/2023: confirmar no diário oficial.", "Exigência municipal: confirmar com a Vigilância Sanitária."],
  versaoCatalogo: "1",
  dataVersao: "2026-10-20",
  itens: {
    "estrutura-do-pop": {
      rotulo: "Anexo II, 13.2",
      orientacao:
        "O POP traz instruções sequenciais, a frequência de execução, as ações corretivas e os responsáveis, com cargo ou função. É aprovado, com data e identificação do responsável pelo estabelecimento.",
      fonteNoTexto: "Portaria SES 799/2023, Anexo II, item 13.2, p. 22 do PDF",
    },
    "guarda-de-registros": {
      rotulo: "Anexo I, 13.2",
      orientacao: "Registros guardados por 90 dias, a contar da data de preparação dos alimentos.",
      prazoDias: 90,
      fonteNoTexto: "Portaria SES 799/2023, Anexo I, item 13.2, p. 8 do PDF (“período mínimo de 90 dias”); repetido no Anexo II, item 13.4, p. 22",
    },
    "lista-de-pops": {
      rotulo: "Anexo II, 13.7 (a–d)",
      orientacao:
        "POPs de (a) higienização de instalações, equipamentos e móveis; (b) controle integrado de pragas urbanas; (c) higienização do reservatório; (d) higiene e saúde dos manipuladores.",
      fonteNoTexto: "Portaria SES 799/2023, Anexo II, item 13.7 (a–d), p. 22 do PDF",
    },
    "higienizacao": {
      rotulo: "Anexo II, 13.8",
      orientacao:
        "Natureza da superfície, método, princípio ativo e concentração, tempo de contato, temperatura e outras informações necessárias; desmonte quando aplicável.",
      fonteNoTexto: "Portaria SES 799/2023, Anexo II, item 13.8, p. 22 e 23 do PDF",
    },
    "pragas": {
      rotulo: "Anexo II, 13.9",
      orientacao: "Medidas preventivas e corretivas. Com controle químico, comprovante de execução da empresa especializada.",
      fonteNoTexto: "Portaria SES 799/2023, Anexo II, item 13.9, p. 23 do PDF",
    },
    "reservatorio-pop": {
      rotulo: "Anexo II, 13.10",
      orientacao: "O POP do reservatório traz as informações do item 13.8, mesmo quando terceirizado, com certificado de execução.",
      fonteNoTexto: "Portaria SES 799/2023, Anexo II, item 13.10, p. 23 do PDF",
    },
    "manipuladores": {
      rotulo: "Anexo II, 13.11",
      orientacao:
        "Etapas, frequência e princípios ativos da lavagem e antissepsia das mãos; medidas para lesões, sintomas ou suspeita de problema de saúde; exames e periodicidade; programa de capacitação (carga horária, conteúdo, frequência e registro nominal).",
      fonteNoTexto: "Portaria SES 799/2023, Anexo II, item 13.11, p. 23 do PDF",
    },
    "reservatorio-intervalo": {
      rotulo: "Anexo I, 6.5; 6.6",
      orientacao:
        "Reservatório higienizado por empresa especializada e licenciada, sempre que necessário e com frequência mínima semestral, antes da análise de potabilidade; registro com método, produtos e concentrações.",
      prazoMeses: 6,
      fonteNoTexto: "Portaria SES 799/2023, Anexo I, itens 6.5 e 6.6, p. 5 do PDF (“frequência mínima semestral”)",
    },
    "capacitacao-admissional-anual": {
      rotulo: "Anexo I, 14.4",
      orientacao: "Treinamento na admissão (admissional) e, no mínimo, anual da equipe de manipuladores, com documentos que comprovem.",
      prazoMeses: 12,
      fonteNoTexto: "Portaria SES 799/2023, Anexo I, item 14.4, p. 8 do PDF",
    },
    "curso-do-responsavel": {
      rotulo: "Anexo I, 14.1; 14.3",
      orientacao: "Curso de capacitação do responsável com no mínimo 12 horas e atualização, pelo menos, anual.",
      prazoMeses: 12,
      fonteNoTexto: "Portaria SES 799/2023, Anexo I, itens 14.1 e 14.3, p. 8 do PDF",
    },
    "acao-corretiva": {
      rotulo: "Anexo II, 13.2",
      orientacao: "O POP prevê a ação corretiva.",
      fonteNoTexto: "Portaria SES 799/2023, Anexo II, itens 13.2 e 13.6, p. 22 do PDF",
    },
  },
};
