import type {
  ChecklistCriticidade,
  ProgramaControleQualidade,
} from "@/types";

export const AMBIENTE_PROGRAMAS_CONTROLE = "Programas de Controle";

export type DefinicaoProgramaControle = {
  nome: string;
  objetivo: string;
  criticidade: ChecklistCriticidade;
  criterios: Array<{
    titulo: string;
    orientacao: string;
  }>;
};

export const DEFINICOES_PROGRAMAS_CONTROLE: DefinicaoProgramaControle[] = [
  {
    nome: "Qualificação de fornecedores",
    objetivo: "Avaliação, aprovação e monitoramento dos fornecedores.",
    criticidade: "Importante",
    criterios: [
      { titulo: "Os fornecedores são avaliados e aprovados antes das compras?", orientacao: "Considere qualidade, regularidade documental, licenças, confiabilidade e histórico de conformidade." },
      { titulo: "A qualificação e o monitoramento dos fornecedores possuem registros atualizados?", orientacao: "Confira fichas, documentos, certificados, avaliações e reavaliações disponíveis." },
    ],
  },
  {
    nome: "Compras",
    objetivo: "Aquisição segura de insumos, embalagens e materiais de limpeza.",
    criticidade: "Importante",
    criterios: [
      { titulo: "As compras são realizadas somente de fornecedores qualificados?", orientacao: "Confirme se o processo de compra utiliza a relação de fornecedores aprovados." },
      { titulo: "As especificações, validade, transporte e conservação são considerados na compra?", orientacao: "Verifique critérios definidos para matérias-primas, embalagens e materiais de limpeza." },
    ],
  },
  {
    nome: "Capacitação de colaboradores",
    objetivo: "Treinamentos, integração e registros de participação.",
    criticidade: "Crítica",
    criterios: [
      { titulo: "Os colaboradores recebem integração e treinamentos periódicos em Boas Práticas?", orientacao: "Inclua higiene pessoal, manipulação segura, contaminantes, DTA e regras internas." },
      { titulo: "Os treinamentos possuem conteúdo, data, responsável e lista de presença registrados?", orientacao: "Confira os comprovantes arquivados e a situação dos colaboradores treinados." },
    ],
  },
  {
    nome: "Cuidados no armazenamento",
    objetivo: "Separação, PVPS, organização e condições de conservação.",
    criticidade: "Crítica",
    criterios: [
      { titulo: "Os produtos estão separados por categoria e organizados pelo sistema PVPS?", orientacao: "Avalie matérias-primas, embalagens, produtos finais, identificação e ordem de validade." },
      { titulo: "Temperatura e umidade são controladas quando aplicável?", orientacao: "Confira limites definidos, medições e registros dos locais de armazenamento." },
      { titulo: "O armazenamento permanece limpo, organizado e protegido contra contaminação cruzada?", orientacao: "Observe afastamento, integridade das embalagens, limpeza e separações necessárias." },
    ],
  },
  {
    nome: "Limpeza e higienização/sanitização",
    objetivo: "Procedimentos, frequências, produtos e registros de higienização.",
    criticidade: "Crítica",
    criterios: [
      { titulo: "Os procedimentos de limpeza e higienização estão definidos e disponíveis?", orientacao: "Devem indicar o que limpar, método, produto, diluição, frequência e responsável." },
      { titulo: "A execução das higienizações é monitorada e registrada?", orientacao: "Confira planilhas, responsáveis, frequências e tratamento de desvios." },
    ],
  },
  {
    nome: "Manutenção preventiva e calibração",
    objetivo: "Funcionamento, manutenção e calibração dos equipamentos.",
    criticidade: "Importante",
    criterios: [
      { titulo: "Existe cronograma de manutenção preventiva e calibração dos equipamentos?", orientacao: "Verifique equipamentos abrangidos, periodicidades e responsáveis." },
      { titulo: "Manutenções, calibrações e correções realizadas possuem registros?", orientacao: "Confira comprovantes, certificados e ações tomadas diante de falhas." },
    ],
  },
  {
    nome: "Controle de temperatura",
    objetivo: "Monitoramento de ambientes, equipamentos e alimentos.",
    criticidade: "Crítica",
    criterios: [
      { titulo: "As temperaturas de ambientes, equipamentos e alimentos são verificadas nos pontos definidos?", orientacao: "Inclua recebimento, armazenamento, preparo, exposição e equipamentos de temperatura controlada." },
      { titulo: "Os resultados são registrados e os desvios geram ações corretivas?", orientacao: "Confira limites, frequência, identificação do equipamento e providências adotadas." },
    ],
  },
  {
    nome: "Controle de validade",
    objetivo: "Identificação e controle dos alimentos produzidos ou fracionados.",
    criticidade: "Crítica",
    criterios: [
      { titulo: "Alimentos produzidos, abertos ou fracionados estão identificados com datas e validade?", orientacao: "Verifique identificação legível, data de abertura ou preparo e prazo definido." },
      { titulo: "Produtos vencidos são impedidos de uso e o PVPS é aplicado?", orientacao: "Confira rotina de verificação, segregação e descarte dos itens vencidos." },
    ],
  },
  {
    nome: "Recolhimento e rastreabilidade",
    objetivo: "Identificação de lotes e resposta a recolhimentos.",
    criticidade: "Crítica",
    criterios: [
      { titulo: "É possível identificar a origem, o lote e o destino dos produtos?", orientacao: "Avalie registros que permitam rastrear matérias-primas e produtos finais." },
      { titulo: "Existe procedimento para recolhimento rápido de produtos com risco ou desvio?", orientacao: "Confira responsáveis, comunicação, segregação, registros e destino do produto recolhido." },
    ],
  },
  {
    nome: "Saúde e higiene dos manipuladores",
    objetivo: "Saúde ocupacional, higiene pessoal e condutas seguras.",
    criticidade: "Crítica",
    criterios: [
      { titulo: "O controle de saúde ocupacional dos colaboradores está atualizado?", orientacao: "Confira exames admissionais, periódicos, demissionais e condutas para sintomas ou lesões." },
      { titulo: "Uniformes, higiene das mãos, asseio pessoal e ausência de adornos são controlados?", orientacao: "Observe as práticas e os registros ou orientações aplicáveis." },
    ],
  },
  {
    nome: "Controle da potabilidade da água",
    objetivo: "Reservatórios, higienização e análises da água.",
    criticidade: "Crítica",
    criterios: [
      { titulo: "A higienização dos reservatórios é realizada na frequência definida e possui comprovante?", orientacao: "Confira data, empresa responsável, credenciamento e próxima higienização." },
      { titulo: "As análises microbiológicas e físico-químicas da água estão atualizadas?", orientacao: "Verifique laudos, pontos de coleta, resultados e atendimento aos padrões aplicáveis." },
      { titulo: "Desvios na qualidade da água possuem ação corretiva e registro?", orientacao: "Confirme o procedimento adotado, nova verificação e liberação segura da água." },
    ],
  },
  {
    nome: "Análises da qualidade do produto final",
    objetivo: "Verificações laboratoriais ou sensoriais aplicáveis.",
    criticidade: "Importante",
    criterios: [
      { titulo: "As análises aplicáveis ao produto final estão definidas e são realizadas?", orientacao: "Considere avaliações microbiológicas, físico-químicas, sensoriais, peso, textura ou embalagem." },
      { titulo: "Os resultados são avaliados, arquivados e tratados quando há desvio?", orientacao: "Confira laudos, responsáveis, critérios de aceitação e ações corretivas." },
    ],
  },
  {
    nome: "Cuidados com visitantes",
    objetivo: "Acesso, higiene, proteção e restrições aos visitantes.",
    criticidade: "Importante",
    criterios: [
      { titulo: "O acesso de visitantes às áreas de manipulação é orientado e controlado?", orientacao: "Verifique autorização, acompanhamento e restrições de contato com alimentos ou superfícies." },
      { titulo: "Visitantes utilizam proteção e realizam a higiene exigida antes do acesso?", orientacao: "Confira EPI ou vestimenta, higiene das mãos e cumprimento das regras internas." },
    ],
  },
  {
    nome: "Manejo de resíduos",
    objetivo: "Segregação, retirada, armazenamento e destinação dos resíduos.",
    criticidade: "Crítica",
    criterios: [
      { titulo: "Os resíduos são segregados, identificados e armazenados de forma segura?", orientacao: "Avalie recipientes, tampas, integridade, limpeza e armazenamento temporário." },
      { titulo: "A retirada e a destinação dos resíduos evitam contaminação e possuem controle?", orientacao: "Confira fluxo, frequência, destino e registros ou comprovantes aplicáveis." },
    ],
  },
  {
    nome: "Auditoria interna",
    objetivo: "Verificação periódica dos programas, registros e condições.",
    criticidade: "Importante",
    criterios: [
      { titulo: "As auditorias internas são realizadas conforme planejamento?", orientacao: "Confira periodicidade, escopo, responsável e registros das verificações." },
      { titulo: "Os achados das auditorias geram plano de ação e acompanhamento?", orientacao: "Verifique responsáveis, prazos, evidências e confirmação da eficácia das correções." },
    ],
  },
];

export function criarProgramasControlePadrao(): ProgramaControleQualidade[] {
  return DEFINICOES_PROGRAMAS_CONTROLE.map((programa, indice) => ({
    id: `programa-${indice + 1}`,
    nome: programa.nome,
    status: "Não iniciado",
    responsavel: "",
    frequencia: "",
    registro: "",
    documentoRelacionado: "",
    observacao: "",
  }));
}

export function normalizarProgramasControle(
  programas?: ProgramaControleQualidade[]
): ProgramaControleQualidade[] {
  const recebidos = new Map(
    (Array.isArray(programas) ? programas : []).map((programa) => [programa.nome, programa])
  );
  return criarProgramasControlePadrao().map((padrao) => {
    const recebido = recebidos.get(padrao.nome);
    return recebido
      ? {
          ...padrao,
          ...recebido,
          id: recebido.id || padrao.id,
          responsavel: recebido.responsavel || "",
          frequencia: recebido.frequencia || "",
          registro: recebido.registro || "",
          documentoRelacionado: recebido.documentoRelacionado || "",
          observacao: recebido.observacao || "",
        }
      : padrao;
  });
}

export function obterCriteriosProgramasControle(
  programas?: ProgramaControleQualidade[]
) {
  return normalizarProgramasControle(programas)
    .filter((programa) => programa.status === "Implantado" || programa.status === "Em implantação")
    .flatMap((programa) => {
      const definicao = DEFINICOES_PROGRAMAS_CONTROLE.find((item) => item.nome === programa.nome);
      const detalhes = [
        programa.responsavel && `Responsável: ${programa.responsavel}`,
        programa.frequencia && `Frequência: ${programa.frequencia}`,
        programa.registro && `Registro: ${programa.registro}`,
        programa.documentoRelacionado && `Documento: ${programa.documentoRelacionado}`,
      ].filter(Boolean).join(" • ");
      return (definicao?.criterios || [{
        titulo: `${programa.nome}: o programa e seus registros estão sendo cumpridos?`,
        orientacao: definicao?.objetivo || "Confirme a aplicação e os registros do programa.",
      }]).map((criterio) => ({
        categoria: programa.nome,
        titulo: criterio.titulo,
        criticidade: definicao?.criticidade || "Importante" as ChecklistCriticidade,
        referencia: `Manual de Boas Práticas — Capítulo 3 — ${programa.nome}`,
        orientacao: [criterio.orientacao, detalhes].filter(Boolean).join(" • "),
      }));
    });
}
