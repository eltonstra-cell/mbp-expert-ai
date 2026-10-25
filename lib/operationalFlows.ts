import type {
  ChecklistCriticidade,
  FluxoOperacional,
  TipoFluxoOperacional,
} from "@/types";

export type DefinicaoFluxoOperacional = {
  tipo: TipoFluxoOperacional;
  setorPadrao: string;
  orientacao: string;
};

export type CriterioFluxoOperacional = {
  categoria: string;
  titulo: string;
  criticidade: ChecklistCriticidade;
  referencia: string;
  orientacao: string;
};

const RECEBIMENTO =
  "Recebimento de matérias-primas, ingredientes, embalagens e materiais de limpeza";
const ESTOQUE = "Estoque de matérias-primas, ingredientes e embalagens";
const COZINHA = "Cozinha / Produção";
const REFEITORIO = "Refeitório e salão de consumação";

// Setor padrão = o que o Manual de Boas Práticas (cap. 2) liga ao fluxo. Congelamento, Descongelamento, Manejo de resíduos e Entrada e saída de
// colaboradores NÃO têm setor padrão: o Manual não os liga a um dos 13 setores oficiais, então o RT escolhe (vazio = "Escolha o setor deste fluxo").
export const DEFINICOES_FLUXOS_OPERACIONAIS: DefinicaoFluxoOperacional[] = [
  { tipo: "Recebimento", setorPadrao: RECEBIMENTO, orientacao: "Conferência e decisão sobre os produtos recebidos." },
  { tipo: "Armazenamento", setorPadrao: ESTOQUE, orientacao: "Organização, identificação, validade e conservação." },
  { tipo: "Manipulação e produção", setorPadrao: COZINHA, orientacao: "Etapas gerais de manipulação e produção." },
  { tipo: "Higienização de FLV", setorPadrao: COZINHA, orientacao: "Higienização de frutas, legumes e verduras." },
  { tipo: "Pré-preparo e preparo", setorPadrao: COZINHA, orientacao: "Preparo seguro e prevenção de contaminação cruzada." },
  { tipo: "Porcionamento e fracionamento", setorPadrao: COZINHA, orientacao: "Porcionamento, proteção e identificação." },
  { tipo: "Congelamento", setorPadrao: "", orientacao: "Método, embalagem, identificação e controle." },
  { tipo: "Descongelamento", setorPadrao: "", orientacao: "Método controlado e proteção do alimento." },
  { tipo: "Distribuição", setorPadrao: REFEITORIO, orientacao: "Proteção e controle durante a distribuição." },
  { tipo: "Manejo de resíduos", setorPadrao: "", orientacao: "Separação, retirada e higienização dos recipientes." },
  { tipo: "Entrada e saída de colaboradores", setorPadrao: "", orientacao: "Acesso, uniforme, mãos e objetos pessoais." },
];

/** Fluxos que o Manual não liga a um setor oficial: ficam sem setor até o RT escolher (nada é inventado). */
export const FLUXOS_SEM_SETOR_PADRAO: TipoFluxoOperacional[] = DEFINICOES_FLUXOS_OPERACIONAIS.filter((definicao) => !definicao.setorPadrao).map((definicao) => definicao.tipo);

/**
 * Setor do fluxo na empresa. O vínculo já salvo e existente vale; senão só o setor padrão do Manual, e só se ele existir na empresa.
 * Sem setor padrão (os 4 fluxos que o Manual não liga a um setor) ou com o setor padrão fora da empresa: "" (o RT escolhe).
 * Nada é adivinhado por nome parecido nem pelo primeiro setor da lista.
 */
export function obterSetorSugeridoParaFluxo(
  tipo: TipoFluxoOperacional,
  setores: string[],
  setorAtual?: string
) {
  if (setorAtual && setores.includes(setorAtual)) return setorAtual;
  const padrao = DEFINICOES_FLUXOS_OPERACIONAIS.find((item) => item.tipo === tipo)?.setorPadrao || "";
  return padrao && setores.includes(padrao) ? padrao : "";
}

const derivada = (item: string) => `Derivada do Manual, cap. 2, item ${item}`;
const parcial = (item: string) => `Parcial: tema do Manual, cap. 2, item ${item}; o texto da pergunta difere`;

// [categoria, pergunta, criticidade, referência]. Nenhuma pergunta existe literalmente no Manual (ele descreve o fluxo; não pergunta).
const criterios: Record<TipoFluxoOperacional, Array<[string, string, ChecklistCriticidade, string]>> = {
  Recebimento: [
    ["Conferência", "Produtos, embalagens, validade e condições de transporte são conferidos no recebimento", "Crítica", derivada("1")],
    ["Temperatura", "Temperatura dos produtos é verificada e registrada quando aplicável", "Crítica", parcial("1")],
    ["Rejeição", "Produtos reprovados são identificados e separados", "Importante", derivada("1")],
  ],
  Armazenamento: [
    ["Organização", "Produtos estão separados por categoria e afastados do piso e das paredes", "Crítica", derivada("2")],
    ["Identificação", "Produtos estão identificados e organizados por validade", "Importante", derivada("2")],
    ["Conservação", "Temperatura e condições de armazenamento são controladas quando aplicável", "Crítica", derivada("2")],
  ],
  "Manipulação e produção": [
    ["Fluxo", "O fluxo de produção evita cruzamento entre alimento cru, pronto e material contaminado", "Crítica", derivada("3")],
    ["Higiene", "Mãos, superfícies e utensílios são higienizados nas etapas necessárias", "Crítica", derivada("3.3")],
    ["Controle", "Tempo e temperatura são controlados quando aplicável", "Crítica", parcial("3.2")],
  ],
  "Higienização de FLV": [
    ["Seleção", "Frutas, legumes e verduras são selecionados antes da higienização", "Importante", derivada("3.1")],
    ["Higienização", "Lavagem, solução, concentração e tempo seguem o procedimento definido", "Crítica", derivada("3.1")],
    ["Proteção", "Após a higienização, os alimentos ficam protegidos contra nova contaminação", "Crítica", parcial("3.1")],
  ],
  "Pré-preparo e preparo": [
    ["Separação", "Alimentos crus e prontos são manipulados separadamente", "Crítica", parcial("3.2")],
    ["Utensílios", "Bancadas e utensílios estão limpos e adequados à etapa", "Crítica", derivada("3.2")],
    ["Tempo e temperatura", "Tempo e temperatura do preparo são controlados quando aplicável", "Crítica", parcial("3.2")],
  ],
  "Porcionamento e fracionamento": [
    ["Higiene", "Porcionamento é realizado com mãos, superfícies e utensílios higienizados", "Crítica", derivada("3.3")],
    ["Proteção", "Porções permanecem protegidas durante a operação", "Importante", parcial("3.3")],
    ["Identificação", "Produtos fracionados recebem identificação e validade", "Crítica", derivada("3.3")],
  ],
  Congelamento: [
    ["Método", "O congelamento segue o método definido pela empresa", "Importante", parcial("3.4")],
    ["Embalagem", "Alimentos estão protegidos em embalagens íntegras", "Crítica", derivada("3.4")],
    ["Identificação", "Produtos congelados estão identificados e datados", "Crítica", derivada("3.4")],
  ],
  Descongelamento: [
    ["Método", "Descongelamento é realizado sob controle, sem permanência indevida em temperatura ambiente", "Crítica", derivada("3.5")],
    ["Proteção", "O alimento permanece protegido e sem contato com líquidos de descongelamento", "Crítica", derivada("3.5")],
    ["Uso", "Após descongelado, o alimento segue o destino e o prazo definidos", "Importante", derivada("3.5")],
  ],
  Distribuição: [
    ["Proteção", "Alimentos permanecem protegidos durante a distribuição", "Crítica", parcial("4")],
    ["Tempo e temperatura", "Tempo e temperatura são controlados quando aplicável", "Crítica", derivada("4")],
    ["Utensílios", "Utensílios e superfícies de distribuição estão limpos e adequados", "Importante", derivada("4")],
  ],
  "Manejo de resíduos": [
    ["Segregação", "Resíduos são separados e acondicionados em recipientes adequados", "Importante", derivada("5")],
    ["Retirada", "A retirada segue frequência e trajeto que evitam contaminar a produção", "Crítica", derivada("5")],
    ["Higiene", "Recipientes e local de resíduos são higienizados", "Importante", derivada("5")],
  ],
  "Entrada e saída de colaboradores": [
    ["Acesso", "Entrada de colaboradores ocorre pelo acesso e fluxo definidos", "Importante", derivada("6")],
    ["Uniforme", "Troca e guarda de uniforme e objetos pessoais são adequadas", "Importante", derivada("6")],
    ["Mãos", "Higienização das mãos é realizada antes de entrar na produção", "Crítica", derivada("6")],
  ],
};

/** Quantas perguntas cada fluxo marcado acrescenta ao setor dele. */
export const PERGUNTAS_POR_FLUXO = 3;

export function criarFluxosOperacionaisPadrao(): FluxoOperacional[] {
  return DEFINICOES_FLUXOS_OPERACIONAIS.map((definicao, indice) => ({
    id: `fluxo-${indice + 1}`,
    tipo: definicao.tipo,
    aplicavel: false,
    setorVinculado: definicao.setorPadrao,
    descricao: "",
    responsavel: "",
    controlesRegistros: "",
  }));
}

export function normalizarFluxosOperacionais(fluxos?: FluxoOperacional[]) {
  const recebidos = new Map((Array.isArray(fluxos) ? fluxos : []).map((fluxo) => [fluxo.tipo, fluxo]));
  return criarFluxosOperacionaisPadrao().map((padrao) => {
    const recebido = recebidos.get(padrao.tipo);
    return recebido
      ? {
          ...padrao,
          ...recebido,
          id: recebido.id || padrao.id,
          aplicavel: Boolean(recebido.aplicavel),
          setorVinculado: recebido.setorVinculado || padrao.setorVinculado,
          descricao: recebido.descricao || "",
          responsavel: recebido.responsavel || "",
          controlesRegistros: recebido.controlesRegistros || "",
        }
      : padrao;
  });
}

export function adequarFluxosAosSetores(
  fluxos: FluxoOperacional[] | undefined,
  setores: string[] | undefined
) {
  const setoresValidos = Array.isArray(setores) ? setores : [];
  return normalizarFluxosOperacionais(fluxos).map((fluxo) =>
    fluxo.aplicavel && !setoresValidos.includes(fluxo.setorVinculado)
      ? {
          ...fluxo,
          setorVinculado: obterSetorSugeridoParaFluxo(
            fluxo.tipo,
            setoresValidos,
            fluxo.setorVinculado
          ),
        }
      : fluxo
  );
}

export function obterCriteriosOperacionaisParaSetor(
  fluxos: FluxoOperacional[] | undefined,
  setor: string,
  ambienteReal?: string
): CriterioFluxoOperacional[] {
  return normalizarFluxosOperacionais(fluxos)
    .filter((fluxo) =>
      fluxo.aplicavel &&
      Boolean(fluxo.setorVinculado) &&
      (fluxo.setorVinculado === setor || fluxo.setorVinculado === ambienteReal)
    )
    .flatMap((fluxo) =>
      criterios[fluxo.tipo].map(([categoria, titulo, criticidade, referencia]) => ({
        categoria: `Operação — ${categoria}`,
        titulo,
        criticidade,
        referencia,
        orientacao: fluxo.descricao
          ? `Fluxo informado pela empresa: ${fluxo.descricao}`
          : "Confirme o procedimento observado com o responsável.",
      }))
    );
}
