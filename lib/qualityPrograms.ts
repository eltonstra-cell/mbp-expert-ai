import type {
  ChecklistCriticidade,
  ProgramaControleQualidade,
} from "@/types";

export const AMBIENTE_PROGRAMAS_CONTROLE = "Programas de Controle";

export type DefinicaoProgramaControle = {
  nome: string;
  objetivo: string;
  criticidade: ChecklistCriticidade;
};

export const DEFINICOES_PROGRAMAS_CONTROLE: DefinicaoProgramaControle[] = [
  { nome: "Qualificação de fornecedores", objetivo: "Avaliação, aprovação e monitoramento dos fornecedores.", criticidade: "Importante" },
  { nome: "Compras", objetivo: "Aquisição segura de insumos, embalagens e materiais de limpeza.", criticidade: "Importante" },
  { nome: "Capacitação de colaboradores", objetivo: "Treinamentos, integração e registros de participação.", criticidade: "Crítica" },
  { nome: "Cuidados no armazenamento", objetivo: "Separação, PVPS, organização e condições de conservação.", criticidade: "Crítica" },
  { nome: "Limpeza e higienização/sanitização", objetivo: "Procedimentos, frequências, produtos e registros de higienização.", criticidade: "Crítica" },
  { nome: "Manutenção preventiva e calibração", objetivo: "Funcionamento, manutenção e calibração dos equipamentos.", criticidade: "Importante" },
  { nome: "Controle de temperatura", objetivo: "Monitoramento de ambientes, equipamentos e alimentos.", criticidade: "Crítica" },
  { nome: "Controle de validade", objetivo: "Identificação e controle dos alimentos produzidos ou fracionados.", criticidade: "Crítica" },
  { nome: "Recolhimento e rastreabilidade", objetivo: "Identificação de lotes e resposta a recolhimentos.", criticidade: "Crítica" },
  { nome: "Saúde e higiene dos manipuladores", objetivo: "Saúde ocupacional, higiene pessoal e condutas seguras.", criticidade: "Crítica" },
  { nome: "Controle da potabilidade da água", objetivo: "Reservatórios, higienização e análises da água.", criticidade: "Crítica" },
  { nome: "Análises da qualidade do produto final", objetivo: "Verificações laboratoriais ou sensoriais aplicáveis.", criticidade: "Importante" },
  { nome: "Cuidados com visitantes", objetivo: "Acesso, higiene, proteção e restrições aos visitantes.", criticidade: "Importante" },
  { nome: "Manejo de resíduos", objetivo: "Segregação, retirada, armazenamento e destinação dos resíduos.", criticidade: "Crítica" },
  { nome: "Auditoria interna", objetivo: "Verificação periódica dos programas, registros e condições.", criticidade: "Importante" },
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
    .map((programa) => {
      const definicao = DEFINICOES_PROGRAMAS_CONTROLE.find((item) => item.nome === programa.nome);
      const detalhes = [
        programa.responsavel && `Responsável: ${programa.responsavel}`,
        programa.frequencia && `Frequência: ${programa.frequencia}`,
        programa.registro && `Registro: ${programa.registro}`,
        programa.documentoRelacionado && `Documento: ${programa.documentoRelacionado}`,
      ].filter(Boolean).join(" • ");
      return {
        categoria: "Programa de controle",
        titulo: `${programa.nome}: o programa e seus registros estão sendo cumpridos?`,
        criticidade: definicao?.criticidade || "Importante" as ChecklistCriticidade,
        referencia: `Manual de Boas Práticas — Capítulo 3 — ${programa.nome}`,
        orientacao: detalhes || definicao?.objetivo || "Confirme a aplicação e os registros do programa.",
      };
    });
}
