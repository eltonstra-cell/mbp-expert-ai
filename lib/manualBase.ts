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

export const AMBIENTES_DETALHADOS_RESTAURANTE = [
  "Recebimento de Mercadorias",
  "Salão de Atendimento",
  "Copa",
  "Churrasqueira",
  "Cozinha",
  "Higienização de Hortifrutigranjeiros",
  "Higienização de Utensílios e Equipamentos",
  "Higienização de Espetos",
  "Higienização de Materiais de Limpeza",
  "Estoque Seco",
  "Câmara Fria",
  "Armazenamento Congelado (Freezers)",
  "Depósito de Embalagens e Descartáveis",
  "Depósito de Material de Limpeza (DML)",
  "Armazenamento Temporário de Resíduos",
  "Sanitários/Vestiários de Funcionários",
  "Sanitários de Clientes",
  "Área Administrativa",
  "Central de Gás",
] as const;

export const MODELOS_COMPLEMENTARES_QUESTIONARIO = [
  "Estrutura geral/personalizada",
  "Sanitários/Vestiários de Funcionários",
  "Sanitários de Clientes",
  "Armazenamento Temporário de Resíduos",
  "Área Administrativa",
] as const;

export const OPCOES_MODELO_QUESTIONARIO = [
  ...SETORES_OFICIAIS_MANUAL,
  ...MODELOS_COMPLEMENTARES_QUESTIONARIO,
] as const;

const ALIASES_SETORES: Record<string, SetorOficialManual> = {
  "recebimento": SETORES_OFICIAIS_MANUAL[0],
  "armazenamento seco/estoque": SETORES_OFICIAIS_MANUAL[1],
  "dml/material de limpeza": SETORES_OFICIAIS_MANUAL[2],
  "preparo/cocção": SETORES_OFICIAIS_MANUAL[4],
  "pré-preparo": SETORES_OFICIAIS_MANUAL[4],
  "higienização de utensílios": SETORES_OFICIAIS_MANUAL[5],
  "distribuição / exposição": SETORES_OFICIAIS_MANUAL[6],
};

const MIGRACAO_SETORES_LEGADOS: Record<string, string[]> = {
  "recebimento de mercadorias": [SETORES_OFICIAIS_MANUAL[0]],
  "salão de atendimento": [SETORES_OFICIAIS_MANUAL[6]],
  "copa": [SETORES_OFICIAIS_MANUAL[4]],
  "churrasqueira": [SETORES_OFICIAIS_MANUAL[4]],
  "cozinha": [SETORES_OFICIAIS_MANUAL[4]],
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
  "depósito de material de limpeza (dml)": [SETORES_OFICIAIS_MANUAL[2]],
  "higienização de materiais de limpeza": [SETORES_OFICIAIS_MANUAL[2]],
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
  return texto
    .trim()
    .replace(/^(?:\d+\s*[-–—.]\s*)+/, "")
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("pt-BR");
}

export function normalizarSetorManual(nome: string): string {
  const oficial = SETORES_OFICIAIS_MANUAL.find((setor) => chave(setor) === chave(nome));
  const migrado = MIGRACAO_SETORES_LEGADOS[chave(nome)];
  return oficial || ALIASES_SETORES[chave(nome)] ||
    (migrado?.length === 1 ? migrado[0] : nome);
}

export function normalizarListaAmbientesReais(ambientes?: string[]): string[] {
  if (!Array.isArray(ambientes)) return [];
  return [...new Set(ambientes.map((nome) => nome.trim()).filter(Boolean))];
}

export function obterModeloQuestionarioParaAmbiente(nome: string): string {
  const limpo = chave(nome);
  const complementar = MODELOS_COMPLEMENTARES_QUESTIONARIO.find(
    (modelo) => chave(modelo) === limpo
  );
  if (complementar) return complementar;
  const normalizado = normalizarSetorManual(nome);
  return normalizado === nome &&
    !SETORES_OFICIAIS_MANUAL.includes(normalizado as SetorOficialManual)
    ? "Estrutura geral/personalizada"
    : normalizado;
}

export function criarModelosQuestionarioAmbientes(
  ambientes?: string[],
  existentes?: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    normalizarListaAmbientesReais(ambientes).map((ambiente) => [
      ambiente,
      existentes?.[ambiente] || obterModeloQuestionarioParaAmbiente(ambiente),
    ])
  );
}

export function migrarSetoresLegados(setores?: string[]): string[] {
  if (!Array.isArray(setores)) return [];
  const migrados = setores.flatMap((setor) => {
    const substitutos = MIGRACAO_SETORES_LEGADOS[chave(setor)];
    return substitutos === undefined ? [normalizarSetorManual(setor)] : substitutos;
  });
  const unicos = [...new Set(migrados.filter(Boolean))];
  const oficiaisPresentes = SETORES_OFICIAIS_MANUAL.filter((setor) =>
    unicos.includes(setor)
  );
  const personalizados = unicos.filter(
    (setor) => !SETORES_OFICIAIS_MANUAL.includes(setor as SetorOficialManual)
  );
  return [...oficiaisPresentes, ...personalizados];
}

export function checklistPossuiRespostas(
  checklist?: Array<{ status?: string; observacao?: string }>
): boolean {
  return (checklist || []).some(
    (item) =>
      (item.status !== undefined && item.status !== "Pendente") ||
      (typeof item.observacao === "string" && item.observacao.trim().length > 0)
  );
}

export function migrarVisitaParaChecklistManual<
  T extends {
    ambientes?: string[];
    checklist?: Array<{ status?: string; observacao?: string }>;
    checklistVersao?: number;
  }
>(visita: T, versaoAtual = 10, preservarNomes = false): T {
  if (checklistPossuiRespostas(visita.checklist)) return visita;

  const ambientesAtuais = Array.isArray(visita.ambientes) ? visita.ambientes : [];
  const ambientesMigrados = preservarNomes
    ? normalizarListaAmbientesReais(ambientesAtuais)
    : migrarSetoresLegados(ambientesAtuais);
  const ambientesMudaram =
    JSON.stringify(ambientesMigrados) !== JSON.stringify(ambientesAtuais);
  const modeloMudou = (visita.checklistVersao || 1) < versaoAtual;

  if (!ambientesMudaram && !modeloMudou) return visita;

  return {
    ...visita,
    ambientes: ambientesMigrados,
    checklist: [],
    checklistVersao: versaoAtual,
  };
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
      setor: (item.setor || "").trim(),
      nome: item.nome,
      quantidade: Math.max(1, Number(item.quantidade) || 1),
      estado: item.estado || "Não avaliado",
      observacao: item.observacao || "",
    }));
}
