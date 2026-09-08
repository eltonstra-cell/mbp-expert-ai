import type {
  DiaSemana,
  EquipamentoSetor,
  HorarioFuncionamento,
  ResponsabilidadeManual,
} from "@/types";

export const SETORES_OFICIAIS_MANUAL = [
  "Recebimento de matérias-primas, ingredientes, embalagens e materiais de limpeza",
  "Estoque de matérias-primas, ingredientes e embalagens",
  "Depósito de material de limpeza (DML)",
  "Central de gás",
  "Cozinha / Produção",
  "Setor de higienização de equipamentos e utensílios",
  "Refeitório e salão de consumação",
  "Vestiário feminino de colaborador",
  "Banheiro feminino de colaborador",
  "Vestiário masculino de colaborador",
  "Banheiro masculino de colaborador",
  "Banheiro feminino de clientes",
  "Banheiro masculino de clientes",
] as const;

export type SetorOficialManual = (typeof SETORES_OFICIAIS_MANUAL)[number];

const ALIASES_SETORES: Record<string, SetorOficialManual> = {
  "recebimento": SETORES_OFICIAIS_MANUAL[0],
  "armazenamento seco / estoque": SETORES_OFICIAIS_MANUAL[1],
  "dml / material de limpeza": SETORES_OFICIAIS_MANUAL[2],
  "preparo / cocção": SETORES_OFICIAIS_MANUAL[4],
  "pré-preparo": SETORES_OFICIAIS_MANUAL[4],
  "higienização de utensílios": SETORES_OFICIAIS_MANUAL[5],
  "distribuição / exposição": SETORES_OFICIAIS_MANUAL[6],
};

const MIGRACAO_SETORES_LEGADOS: Record<string, string[]> = {
  "salão de atendimento": [SETORES_OFICIAIS_MANUAL[6]],
  "copa": [SETORES_OFICIAIS_MANUAL[4]],
  "churrasqueira": [SETORES_OFICIAIS_MANUAL[4]],
  "higienização de hortifrutigranjeiros": [SETORES_OFICIAIS_MANUAL[4]],
  "higienização de utensílios e equipamentos": [SETORES_OFICIAIS_MANUAL[5]],
  "higienização de equipamentos": [SETORES_OFICIAIS_MANUAL[5]],
  "higienização de espetos": [SETORES_OFICIAIS_MANUAL[5]],
  "estoque seco": [SETORES_OFICIAIS_MANUAL[1]],
  "câmara fria": [SETORES_OFICIAIS_MANUAL[1]],
  "armazenamento congelado (freezers)": [SETORES_OFICIAIS_MANUAL[1]],
  "armazenamento congelado": [SETORES_OFICIAIS_MANUAL[1]],
  "depósito de embalagens e descartáveis": [SETORES_OFICIAIS_MANUAL[1]],
  "depósito de materiais de limpeza (dml)": [SETORES_OFICIAIS_MANUAL[2]],
  "armazenamento temporário de resíduos": [],
  "sanitários/vestiários de funcionários": [
    SETORES_OFICIAIS_MANUAL[7],
    SETORES_OFICIAIS_MANUAL[8],
    SETORES_OFICIAIS_MANUAL[9],
    SETORES_OFICIAIS_MANUAL[10],
  ],
  "sanitários/vestiário de funcionários": [
    SETORES_OFICIAIS_MANUAL[7],
    SETORES_OFICIAIS_MANUAL[8],
    SETORES_OFICIAIS_MANUAL[9],
    SETORES_OFICIAIS_MANUAL[10],
  ],
  "sanitários de clientes": [
    SETORES_OFICIAIS_MANUAL[11],
    SETORES_OFICIAIS_MANUAL[12],
  ],
  "área administrativa": [],
};

function chave(texto: string) {
  return texto.trim().toLocaleLowerCase("pt-BR");
}

export function normalizarSetorManual(nome: string): string {
  const oficial = SETORES_OFICIAIS_MANUAL.find((setor) => chave(setor) === chave(nome));
  return oficial || ALIASES_SETORES[chave(nome)] || nome;
}

export function migrarSetoresLegados(setores?: string[]): string[] {
  if (!Array.isArray(setores)) return [];
  const migrados = setores.flatMap((setor) => {
    const substitutos = MIGRACAO_SETORES_LEGADOS[chave(setor)];
    return substitutos === undefined ? [normalizarSetorManual(setor)] : substitutos;
  });
  return [...new Set(migrados.filter(Boolean))];
}

export const DIAS_SEMANA: DiaSemana[] = [
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
  "Domingo",
];

export function criarHorarioSemanalVazio(): HorarioFuncionamento[] {
  return DIAS_SEMANA.map((dia) => ({
    dia,
    aberto: false,
    abertura: "",
    fechamento: "",
  }));
}

export function criarHorarioExemploManual(): HorarioFuncionamento[] {
  return DIAS_SEMANA.map((dia, indice) => ({
    dia,
    aberto: indice <= 5,
    abertura: indice <= 4 ? "07:30" : indice === 5 ? "07:30" : "",
    fechamento: indice <= 4 ? "18:00" : indice === 5 ? "12:00" : "",
  }));
}

export function normalizarHorarios(
  horarios?: HorarioFuncionamento[]
): HorarioFuncionamento[] {
  const recebidos = new Map((horarios || []).map((item) => [item.dia, item]));
  return criarHorarioSemanalVazio().map((padrao) => {
    const recebido = recebidos.get(padrao.dia);
    return recebido
      ? {
          dia: padrao.dia,
          aberto: Boolean(recebido.aberto),
          abertura: recebido.abertura || "",
          fechamento: recebido.fechamento || "",
        }
      : padrao;
  });
}

function faixaHorario(item: HorarioFuncionamento) {
  if (!item.aberto) return "Fechado";
  if (!item.abertura || !item.fechamento) return "Horário não informado";
  return `${item.abertura} às ${item.fechamento}`;
}

export function resumirHorarioFuncionamento(horarios?: HorarioFuncionamento[]) {
  const lista = normalizarHorarios(horarios);
  const partes: string[] = [];
  let inicio = 0;

  while (inicio < lista.length) {
    let fim = inicio;
    const faixa = faixaHorario(lista[inicio]);
    while (fim + 1 < lista.length && faixaHorario(lista[fim + 1]) === faixa) fim += 1;
    const rotulo = inicio === fim
      ? lista[inicio].dia.replace("-feira", "")
      : `${lista[inicio].dia.replace("-feira", "")} a ${lista[fim].dia.replace("-feira", "")}`;
    partes.push(`${rotulo}: ${faixa}`);
    inicio = fim + 1;
  }

  return partes.join(" / ");
}

const RESPONSABILIDADES_PROPRIETARIO = [
  "Comunicar à equipe a importância das Boas Práticas.",
  "Estabelecer regras internas que apoiem a implantação das Boas Práticas.",
  "Garantir recursos financeiros, materiais e humanos necessários.",
  "Manter comunicação constante com a consultoria, gestão e colaboradores.",
  "Participar e incentivar a participação nos treinamentos.",
  "Acompanhar auditorias internas e a implantação das melhorias.",
  "Agir sobre os problemas identificados e apoiar a melhoria contínua.",
  "Manter o estabelecimento atualizado e em conformidade com as exigências aplicáveis.",
];

const RESPONSABILIDADES_CONSULTOR = [
  "Elaborar e manter atualizado o Manual de Boas Práticas e documentos complementares.",
  "Elaborar treinamentos e capacitar periodicamente os colaboradores.",
  "Implementar POPs e orientar as condutas operacionais previstas no Manual.",
  "Realizar avaliação inicial e identificar pontos fortes e oportunidades de melhoria.",
  "Diagnosticar problemas e propor soluções práticas e viáveis.",
  "Elaborar e acompanhar plano de ação e cronograma personalizados.",
  "Monitorar a implantação das Boas Práticas e prestar suporte à gestão.",
  "Manter registros e documentos organizados e disponíveis.",
  "Elaborar relatórios periódicos e promover a melhoria contínua.",
  "Manter-se atualizado sobre a legislação aplicável.",
];

export function criarResponsabilidadesPadrao(): ResponsabilidadeManual[] {
  return [
    ...RESPONSABILIDADES_PROPRIETARIO.map((descricao, indice) => ({
      id: `proprietario-${indice + 1}`,
      papel: "Proprietário" as const,
      descricao,
      ativa: false,
    })),
    ...RESPONSABILIDADES_CONSULTOR.map((descricao, indice) => ({
      id: `consultor-${indice + 1}`,
      papel: "Consultor/RT" as const,
      descricao,
      ativa: false,
    })),
  ];
}

export function normalizarResponsabilidades(
  responsabilidades?: ResponsabilidadeManual[]
) {
  if (!Array.isArray(responsabilidades) || responsabilidades.length === 0) {
    return criarResponsabilidadesPadrao();
  }
  return responsabilidades.map((item, indice) => ({
    id: item.id || `responsabilidade-${indice + 1}`,
    papel: item.papel === "Consultor/RT" ? "Consultor/RT" as const : "Proprietário" as const,
    descricao: item.descricao || "",
    ativa: item.ativa !== false,
  }));
}

export function normalizarEquipamentos(equipamentos?: EquipamentoSetor[]) {
  if (!Array.isArray(equipamentos)) return [];
  return equipamentos
    .filter((item) => item && item.nome)
    .map((item, indice) => ({
      id: item.id || `equipamento-${indice + 1}`,
      setor: normalizarSetorManual(item.setor || ""),
      nome: item.nome,
      quantidade: Math.max(1, Number(item.quantidade) || 1),
      estado: item.estado || "Não avaliado",
      observacao: item.observacao || "",
    }));
}
