import type { Norma } from "./tipos.ts";

// RDC 216/2004 (ANVISA), Regulamento Técnico de Boas Práticas para Serviços de Alimentação.
// Conferido em 2026-10-30 contra o PDF guardado em docs/normas/ (cópia do Saúde Legis impressa em 19/07/2017, 9 páginas).
// Cada item traz `fonteNoTexto` com o item e a página do PDF. A cópia traz a advertência de que não substitui o Diário Oficial.
export const RDC_216_2004: Norma = {
  id: "rdc-216-2004",
  nome: "RDC 216/2004 (ANVISA)",
  esfera: "federal",
  fonte: "PDF da RDC 216/2004 (cópia do Saúde Legis, impressa em 19/07/2017), conferido item a item em 2026-10-30.",
  conferidoEm: "2026-10-30",
  avisos: ["A cópia conferida traz a advertência de que não substitui o texto publicado no Diário Oficial da União."],
  versaoCatalogo: "1",
  dataVersao: "2026-10-20",
  itens: {
    "estrutura-do-pop": {
      rotulo: "4.11.2",
      orientacao:
        "O POP traz instruções sequenciais, a frequência de execução e os responsáveis, com nome e cargo ou função. É aprovado, datado e assinado pelo responsável do estabelecimento.",
      fonteNoTexto: "RDC 216/2004, item 4.11.2, p. 8 do PDF",
    },
    "guarda-de-registros": {
      rotulo: "4.11.3",
      orientacao: "Registros dos POPs guardados por 30 dias, a contar da data de preparação.",
      prazoDias: 30,
      fonteNoTexto: "RDC 216/2004, item 4.11.3, p. 8 do PDF (“período mínimo de 30 (trinta) dias”)",
    },
    "lista-de-pops": {
      rotulo: "4.11.4",
      orientacao:
        "POPs de (a) higienização de instalações, equipamentos e móveis; (b) controle integrado de vetores e pragas urbanas; (c) higienização do reservatório; (d) higiene e saúde dos manipuladores.",
      fonteNoTexto: "RDC 216/2004, item 4.11.4 (a–d), p. 8 do PDF",
    },
    "higienizacao": {
      rotulo: "4.11.5",
      orientacao:
        "Os POPs de higienização indicam a natureza da superfície, o método, o princípio ativo e a concentração, o tempo de contato, a temperatura e outras informações necessárias; desmonte quando aplicável.",
      fonteNoTexto: "RDC 216/2004, item 4.11.5, p. 8 do PDF",
    },
    "pragas": {
      rotulo: "4.11.6",
      orientacao: "Medidas preventivas e corretivas. Com controle químico, comprovante de execução da empresa especializada.",
      fonteNoTexto: "RDC 216/2004, item 4.11.6, p. 8 do PDF",
    },
    "reservatorio-pop": {
      rotulo: "4.11.7",
      orientacao: "O POP do reservatório segue o mesmo que a higienização (4.11.5), mesmo quando terceirizado, com certificado de execução.",
      fonteNoTexto: "RDC 216/2004, item 4.11.7, p. 8 do PDF",
    },
    "manipuladores": {
      rotulo: "4.11.8",
      orientacao:
        "Etapas, frequência e princípios ativos da lavagem e antissepsia das mãos; medidas para lesões, sintomas ou suspeita de problema de saúde; exames e periodicidade; programa de capacitação (carga horária, conteúdo, frequência e registro nominal).",
      fonteNoTexto: "RDC 216/2004, item 4.11.8, p. 8 do PDF",
    },
    "reservatorio-intervalo": {
      rotulo: "4.4.4",
      orientacao: "Reservatório higienizado em intervalo máximo de seis meses, com registro.",
      prazoMeses: 6,
      fonteNoTexto: "RDC 216/2004, item 4.4.4, p. 5 do PDF (“intervalo máximo de seis meses”)",
    },
    "curso-do-responsavel": {
      rotulo: "4.12.1; 4.12.2",
      orientacao:
        "O responsável pelas atividades de manipulação é o proprietário ou um funcionário designado, capacitado, e faz curso comprovado com, no mínimo, contaminantes alimentares, doenças transmitidas por alimentos, manipulação higiênica dos alimentos e boas práticas. A RDC não fixa carga horária nem prazo de atualização.",
      fonteNoTexto: "RDC 216/2004, itens 4.12.1 e 4.12.2 (a–d), p. 8 e 9 do PDF",
    },
  },
};
