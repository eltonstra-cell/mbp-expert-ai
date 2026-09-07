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
const VESTIARIO = "Vestiário feminino de colaborador";

export const DEFINICOES_FLUXOS_OPERACIONAIS: DefinicaoFluxoOperacional[] = [
  { tipo: "Recebimento", setorPadrao: RECEBIMENTO, orientacao: "Conferência e decisão sobre os produtos recebidos." },
  { tipo: "Armazenamento", setorPadrao: ESTOQUE, orientacao: "Organização, identificação, validade e conservação." },
  { tipo: "Manipulação e produção", setorPadrao: COZINHA, orientacao: "Etapas gerais de manipulação e produção." },
  { tipo: "Higienização de FLV", setorPadrao: COZINHA, orientacao: "Higienização de frutas, legumes e verduras." },
  { tipo: "Pré-preparo e preparo", setorPadrao: COZINHA, orientacao: "Preparo seguro e prevenção de contaminação cruzada." },
  { tipo: "Porcionamento e fracionamento", setorPadrao: COZINHA, orientacao: "Porcionamento, proteção e identificação." },
  { tipo: "Congelamento", setorPadrao: COZINHA, orientacao: "Método, embalagem, identificação e controle." },
  { tipo: "Descongelamento", setorPadrao: COZINHA, orientacao: "Método controlado e proteção do alimento." },
  { tipo: "Distribuição", setorPadrao: REFEITORIO, orientacao: "Proteção e controle durante a distribuição." },
  { tipo: "Manejo de resíduos", setorPadrao: COZINHA, orientacao: "Separação, retirada e higienização dos recipientes." },
  { tipo: "Entrada e saída de colaboradores", setorPadrao: VESTIARIO, orientacao: "Acesso, uniforme, mãos e objetos pessoais." },
];

const criterios: Record<TipoFluxoOperacional, Array<[string, string, ChecklistCriticidade]>> = {
  Recebimento: [
    ["Conferência", "Produtos, embalagens, validade e condições de transporte são conferidos no recebimento", "Crítica"],
    ["Temperatura", "Temperatura dos produtos é verificada e registrada quando aplicável", "Crítica"],
    ["Rejeição", "Produtos reprovados são identificados e separados", "Importante"],
  ],
  Armazenamento: [
    ["Organização", "Produtos estão separados por categoria e afastados do piso e das paredes", "Crítica"],
    ["Identificação", "Produtos estão identificados e organizados por validade", "Importante"],
    ["Conservação", "Temperatura e condições de armazenamento são controladas quando aplicável", "Crítica"],
  ],
  "Manipulação e produção": [
    ["Fluxo", "O fluxo de produção evita cruzamento entre alimento cru, pronto e material contaminado", "Crítica"],
    ["Higiene", "Mãos, superfícies e utensílios são higienizados nas etapas necessárias", "Crítica"],
    ["Controle", "Tempo e temperatura são controlados quando aplicável", "Crítica"],
  ],
  "Higienização de FLV": [
    ["Seleção", "Frutas, legumes e verduras são selecionados antes da higienização", "Importante"],
    ["Higienização", "Lavagem, solução, concentração e tempo seguem o procedimento definido", "Crítica"],
    ["Proteção", "Após a higienização, os alimentos ficam protegidos contra nova contaminação", "Crítica"],
  ],
  "Pré-preparo e preparo": [
    ["Separação", "Alimentos crus e prontos são manipulados separadamente", "Crítica"],
    ["Utensílios", "Bancadas e utensílios estão limpos e adequados à etapa", "Crítica"],
    ["Tempo e temperatura", "Tempo e temperatura do preparo são controlados quando aplicável", "Crítica"],
  ],
  "Porcionamento e fracionamento": [
    ["Higiene", "Porcionamento é realizado com mãos, superfícies e utensílios higienizados", "Crítica"],
    ["Proteção", "Porções permanecem protegidas durante a operação", "Importante"],
    ["Identificação", "Produtos fracionados recebem identificação e validade", "Crítica"],
  ],
  Congelamento: [
    ["Método", "O congelamento segue o método definido pela empresa", "Importante"],
    ["Embalagem", "Alimentos estão protegidos em embalagens íntegras", "Crítica"],
    ["Identificação", "Produtos congelados estão identificados e datados", "Crítica"],
  ],
  Descongelamento: [
    ["Método", "Descongelamento é realizado sob controle, sem permanência indevida em temperatura ambiente", "Crítica"],
    ["Proteção", "O alimento permanece protegido e sem contato com líquidos de descongelamento", "Crítica"],
    ["Uso", "Após descongelado, o alimento segue o destino e o prazo definidos", "Importante"],
  ],
  Distribuição: [
    ["Proteção", "Alimentos permanecem protegidos durante a distribuição", "Crítica"],
    ["Tempo e temperatura", "Tempo e temperatura são controlados quando aplicável", "Crítica"],
    ["Utensílios", "Utensílios e superfícies de distribuição estão limpos e adequados", "Importante"],
  ],
  "Manejo de resíduos": [
    ["Segregação", "Resíduos são separados e acondicionados em recipientes adequados", "Importante"],
    ["Retirada", "A retirada segue frequência e trajeto que evitam contaminar a produção", "Crítica"],
    ["Higiene", "Recipientes e local de resíduos são higienizados", "Importante"],
  ],
  "Entrada e saída de colaboradores": [
    ["Acesso", "Entrada de colaboradores ocorre pelo acesso e fluxo definidos", "Importante"],
    ["Uniforme", "Troca e guarda de uniforme e objetos pessoais são adequadas", "Importante"],
    ["Mãos", "Higienização das mãos é realizada antes de entrar na produção", "Crítica"],
  ],
};

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

export function obterCriteriosOperacionaisParaSetor(
  fluxos: FluxoOperacional[] | undefined,
  setor: string
): CriterioFluxoOperacional[] {
  return normalizarFluxosOperacionais(fluxos)
    .filter((fluxo) => fluxo.aplicavel && fluxo.setorVinculado === setor)
    .flatMap((fluxo) =>
      criterios[fluxo.tipo].map(([categoria, titulo, criticidade]) => ({
        categoria: `Operação — ${categoria}`,
        titulo,
        criticidade,
        referencia: `Manual de Boas Práticas — Capítulo 2 — ${fluxo.tipo}`,
        orientacao: fluxo.descricao
          ? `Fluxo informado pela empresa: ${fluxo.descricao}`
          : "Confirme o procedimento observado com o responsável.",
      }))
    );
}
