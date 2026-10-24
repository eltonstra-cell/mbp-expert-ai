// Tipo de estabelecimento sugerido pelo CNAE e o PACOTE que o app propõe para ele (ambientes, equipamentos e fluxos).
// Tudo aqui é SUGESTÃO: o RT troca o tipo, desmarca o que não existe e nada é criado sem confirmação.
// As PERGUNTAS do questionário NÃO mudam por tipo (são sempre as padrão); este módulo não gera nem sugere perguntas.
// A tabela CNAE → tipo usa os códigos e nomes da CNAE 2.x do IBGE (API de CNAE do IBGE, conferida em 2026-10-24).
import { limiteSugerido, type LimiteDeTemperatura } from "./limitesDeTemperatura.ts";
import { SETORES_OFICIAIS_MANUAL } from "./manualBase.ts";
import type { TipoFluxoOperacional } from "../types/index.ts";

export const FONTE_DA_TABELA_DE_CNAE = {
  fonte: "IBGE · Classificação Nacional de Atividades Econômicas (API de CNAE)",
  link: "https://servicodados.ibge.gov.br/api/v2/cnae/",
  conferidoEm: "2026-10-24",
};

export type IdDoTipo = "restaurante" | "lanchonete" | "bar" | "padaria" | "acougue" | "conveniencia" | "uan" | "bufe" | "delivery" | "ambulante" | "outro";

export const TIPOS_DE_ESTABELECIMENTO: { id: IdDoTipo; rotulo: string }[] = [
  { id: "restaurante", rotulo: "Restaurante" },
  { id: "lanchonete", rotulo: "Lanchonete" },
  { id: "bar", rotulo: "Bar" },
  { id: "padaria", rotulo: "Padaria e confeitaria" },
  { id: "acougue", rotulo: "Açougue e peixaria" },
  { id: "conveniencia", rotulo: "Conveniência com pratos prontos" },
  { id: "uan", rotulo: "Cozinha industrial / UAN" },
  { id: "bufe", rotulo: "Bufê e eventos" },
  { id: "delivery", rotulo: "Delivery e rotisseria" },
  { id: "ambulante", rotulo: "Ambulante / food truck" },
  { id: "outro", rotulo: "Outro" },
];

export const rotuloDoTipo = (id: string): string => TIPOS_DE_ESTABELECIMENTO.find((tipo) => tipo.id === id || tipo.rotulo === id)?.rotulo || "Outro";
export const idDoTipo = (valor: string | undefined): IdDoTipo => TIPOS_DE_ESTABELECIMENTO.find((tipo) => tipo.id === valor || tipo.rotulo === valor)?.id || "outro";

/** Subclasse CNAE (7 dígitos) → tipo. Descrição: a da CNAE do IBGE. */
const CNAE_PARA_TIPO: Record<string, { tipo: IdDoTipo; descricao: string }> = {
  "5611201": { tipo: "restaurante", descricao: "Restaurantes e similares" },
  "5611203": { tipo: "lanchonete", descricao: "Lanchonetes, casas de chá, de sucos e similares" },
  "5611204": { tipo: "bar", descricao: "Bares e outros estabelecimentos especializados em servir bebidas, sem entretenimento" },
  "5611205": { tipo: "bar", descricao: "Bares e outros estabelecimentos especializados em servir bebidas, com entretenimento" },
  "5612100": { tipo: "ambulante", descricao: "Serviços ambulantes de alimentação" },
  "5620101": { tipo: "uan", descricao: "Fornecimento de alimentos preparados preponderantemente para empresas" },
  "5620102": { tipo: "bufe", descricao: "Serviços de alimentação para eventos e recepções - bufê" },
  "5620103": { tipo: "uan", descricao: "Cantinas - serviços de alimentação privativos" },
  "5620104": { tipo: "delivery", descricao: "Fornecimento de alimentos preparados preponderantemente para consumo domiciliar" },
  "1091101": { tipo: "padaria", descricao: "Fabricação de produtos de panificação industrial" },
  "1091102": { tipo: "padaria", descricao: "Fabricação de produtos de padaria e confeitaria com predominância de produção própria" },
  "4721102": { tipo: "padaria", descricao: "Padaria e confeitaria com predominância de revenda" },
  "4722901": { tipo: "acougue", descricao: "Comércio varejista de carnes - açougues" },
  "4722902": { tipo: "acougue", descricao: "Peixaria" },
  "4729602": { tipo: "conveniencia", descricao: "Comércio varejista de mercadorias em lojas de conveniência" },
  "4712100": { tipo: "conveniencia", descricao: "Minimercados, mercearias e armazéns" },
};

/** Tipo sugerido pelo CNAE principal; se não houver correspondência, pelos secundários; senão "Outro". Nunca bloqueia. */
export function tipoSugeridoPorCnae(principal: string | undefined, secundarios: { codigo: string }[] = []): { tipo: IdDoTipo; rotulo: string; codigo: string; correspondencia: boolean } {
  for (const bruto of [principal || "", ...secundarios.map((s) => s.codigo)]) {
    const codigo = (bruto || "").replace(/\D/g, "");
    const achado = CNAE_PARA_TIPO[codigo];
    if (achado) return { tipo: achado.tipo, rotulo: rotuloDoTipo(achado.tipo), codigo, correspondencia: true };
  }
  return { tipo: "outro", rotulo: "Outro", codigo: (principal || "").replace(/\D/g, ""), correspondencia: false };
}

const S = SETORES_OFICIAIS_MANUAL;
const [RECEBIMENTO, ESTOQUE, DML, GAS, COZINHA, HIGIENIZACAO, SALAO, VEST_F, BAN_F, VEST_M, BAN_M, CLI_F, CLI_M] = S;
const COLABORADORES = [VEST_F, BAN_F, VEST_M, BAN_M];
const CLIENTES = [CLI_F, CLI_M];

/** Nome curto do setor oficial para chips e listas apertadas; o nome oficial completo vai no title. */
const NOME_CURTO_DO_SETOR: Record<string, string> = {
  [RECEBIMENTO]: "Recebimento",
  [ESTOQUE]: "Estoque",
  [DML]: "DML",
  [GAS]: "Central de gás",
  [COZINHA]: "Cozinha",
  [HIGIENIZACAO]: "Higienização",
  [SALAO]: "Refeitório",
  [VEST_F]: "Vestiário fem.",
  [BAN_F]: "Banheiro fem.",
  [VEST_M]: "Vestiário masc.",
  [BAN_M]: "Banheiro masc.",
  [CLI_F]: "Clientes fem.",
  [CLI_M]: "Clientes masc.",
};
export const nomeCurtoDoSetor = (nome: string): string => NOME_CURTO_DO_SETOR[nome] || nome;

// Critérios dos ambientes por tipo (só os 13 setores oficiais; o RT desmarca o que não existe):
// Central de gás: restaurante, UAN e bufê (cozinha de produção com fogão industrial); Refeitório/salão: onde se consome no local
// (não em açougue, bufê, delivery, ambulante); banheiros de clientes: onde o público entra; o restante (recebimento, estoque,
// DML, higienização, vestiários e banheiros de colaboradores) fica igual por falta de critério melhor.

export type EquipamentoSugerido = { nome: string; ambiente: string; quantidade: number };
export type PacoteDoTipo = { ambientes: string[]; equipamentos: EquipamentoSugerido[]; fluxos: TipoFluxoOperacional[] };

const TODOS_OS_FLUXOS: TipoFluxoOperacional[] = ["Recebimento", "Armazenamento", "Manipulação e produção", "Higienização de FLV", "Pré-preparo e preparo", "Porcionamento e fracionamento", "Congelamento", "Descongelamento", "Distribuição", "Manejo de resíduos", "Entrada e saída de colaboradores"];
const eq = (nome: string, ambiente: string, quantidade = 1): EquipamentoSugerido => ({ nome, ambiente, quantidade });

const PACOTES: Record<IdDoTipo, PacoteDoTipo> = {
  restaurante: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, GAS, COZINHA, HIGIENIZACAO, SALAO, ...COLABORADORES, ...CLIENTES],
    equipamentos: [eq("Câmara fria", ESTOQUE), eq("Refrigerador", COZINHA), eq("Freezer", ESTOQUE), eq("Fogão", COZINHA), eq("Forno", COZINHA), eq("Chapa", COZINHA), eq("Fritadeira", COZINHA), eq("Bancada de inox", COZINHA), eq("Pia de higienização", HIGIENIZACAO), eq("Estufa / balcão térmico", SALAO), eq("Balcão refrigerado", SALAO)],
    fluxos: TODOS_OS_FLUXOS,
  },
  lanchonete: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, COZINHA, HIGIENIZACAO, SALAO, ...COLABORADORES, ...CLIENTES],
    equipamentos: [eq("Refrigerador", COZINHA), eq("Freezer", ESTOQUE), eq("Chapa", COZINHA), eq("Fritadeira", COZINHA), eq("Estufa / balcão térmico", SALAO), eq("Balcão refrigerado", SALAO), eq("Pia de higienização", HIGIENIZACAO)],
    fluxos: ["Recebimento", "Armazenamento", "Manipulação e produção", "Pré-preparo e preparo", "Porcionamento e fracionamento", "Distribuição", "Manejo de resíduos", "Entrada e saída de colaboradores"],
  },
  bar: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, COZINHA, HIGIENIZACAO, SALAO, ...COLABORADORES, ...CLIENTES],
    equipamentos: [eq("Refrigerador", COZINHA), eq("Freezer", ESTOQUE), eq("Balcão refrigerado", SALAO), eq("Máquina de gelo", COZINHA), eq("Pia de higienização", HIGIENIZACAO)],
    fluxos: ["Recebimento", "Armazenamento", "Porcionamento e fracionamento", "Distribuição", "Manejo de resíduos", "Entrada e saída de colaboradores"],
  },
  padaria: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, COZINHA, HIGIENIZACAO, SALAO, ...COLABORADORES, ...CLIENTES],
    equipamentos: [eq("Forno", COZINHA), eq("Masseira", COZINHA), eq("Cilindro de massa", COZINHA), eq("Câmara de fermentação", COZINHA), eq("Refrigerador", COZINHA), eq("Freezer", ESTOQUE), eq("Balcão refrigerado", SALAO), eq("Pia de higienização", HIGIENIZACAO)],
    fluxos: ["Recebimento", "Armazenamento", "Manipulação e produção", "Pré-preparo e preparo", "Porcionamento e fracionamento", "Congelamento", "Distribuição", "Manejo de resíduos", "Entrada e saída de colaboradores"],
  },
  acougue: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, COZINHA, HIGIENIZACAO, ...COLABORADORES, ...CLIENTES],
    equipamentos: [eq("Câmara fria", ESTOQUE), eq("Balcão refrigerado", COZINHA), eq("Freezer", ESTOQUE), eq("Serra de fita", COZINHA), eq("Moedor", COZINHA), eq("Balança", COZINHA), eq("Pia de higienização", HIGIENIZACAO)],
    fluxos: ["Recebimento", "Armazenamento", "Manipulação e produção", "Porcionamento e fracionamento", "Congelamento", "Descongelamento", "Distribuição", "Manejo de resíduos", "Entrada e saída de colaboradores"],
  },
  conveniencia: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, COZINHA, HIGIENIZACAO, SALAO, ...COLABORADORES, ...CLIENTES],
    equipamentos: [eq("Refrigerador", COZINHA), eq("Freezer", ESTOQUE), eq("Estufa / balcão térmico", SALAO), eq("Forno micro-ondas", COZINHA), eq("Balcão refrigerado", SALAO)],
    fluxos: ["Recebimento", "Armazenamento", "Porcionamento e fracionamento", "Descongelamento", "Distribuição", "Manejo de resíduos", "Entrada e saída de colaboradores"],
  },
  uan: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, GAS, COZINHA, HIGIENIZACAO, SALAO, ...COLABORADORES, ...CLIENTES],
    equipamentos: [eq("Câmara fria", ESTOQUE), eq("Câmara de congelados", ESTOQUE), eq("Panelão / marmita", COZINHA), eq("Forno combinado", COZINHA), eq("Fogão industrial", COZINHA), eq("Carro térmico", SALAO), eq("Balcão térmico (pass-through)", SALAO), eq("Pia de higienização", HIGIENIZACAO)],
    fluxos: TODOS_OS_FLUXOS,
  },
  bufe: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, GAS, COZINHA, HIGIENIZACAO, ...COLABORADORES],
    equipamentos: [eq("Câmara fria", ESTOQUE), eq("Refrigerador", COZINHA), eq("Freezer", ESTOQUE), eq("Caixa térmica", COZINHA), eq("Estufa / balcão térmico", COZINHA), eq("Pia de higienização", HIGIENIZACAO)],
    fluxos: ["Recebimento", "Armazenamento", "Manipulação e produção", "Pré-preparo e preparo", "Porcionamento e fracionamento", "Distribuição", "Manejo de resíduos", "Entrada e saída de colaboradores"],
  },
  delivery: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, COZINHA, HIGIENIZACAO, ...COLABORADORES],
    equipamentos: [eq("Refrigerador", COZINHA), eq("Freezer", ESTOQUE), eq("Forno", COZINHA), eq("Estufa / balcão térmico", COZINHA), eq("Caixa térmica", COZINHA), eq("Pia de higienização", HIGIENIZACAO)],
    fluxos: ["Recebimento", "Armazenamento", "Manipulação e produção", "Pré-preparo e preparo", "Porcionamento e fracionamento", "Distribuição", "Manejo de resíduos", "Entrada e saída de colaboradores"],
  },
  ambulante: {
    ambientes: [ESTOQUE, COZINHA, HIGIENIZACAO],
    equipamentos: [eq("Refrigerador", COZINHA), eq("Caixa térmica", COZINHA), eq("Chapa", COZINHA)],
    fluxos: ["Recebimento", "Armazenamento", "Pré-preparo e preparo", "Distribuição", "Manejo de resíduos"],
  },
  outro: {
    ambientes: [RECEBIMENTO, ESTOQUE, DML, COZINHA, HIGIENIZACAO, ...COLABORADORES],
    equipamentos: [eq("Refrigerador", COZINHA), eq("Freezer", ESTOQUE), eq("Pia de higienização", HIGIENIZACAO)],
    fluxos: ["Recebimento", "Armazenamento", "Manipulação e produção", "Distribuição", "Manejo de resíduos", "Entrada e saída de colaboradores"],
  },
};

export function pacoteDoTipo(tipo: string | undefined): PacoteDoTipo {
  const p = PACOTES[idDoTipo(tipo)];
  return { ambientes: [...p.ambientes], equipamentos: p.equipamentos.map((e) => ({ ...e })), fluxos: [...p.fluxos] };
}

/** Limite de temperatura que a norma indica para este equipamento (só sugestão; o RT confirma). Sem limite conhecido: undefined. */
export function limiteSugeridoParaEquipamento(nome: string): LimiteDeTemperatura | undefined {
  return limiteSugerido([nome]);
}

/** As perguntas do questionário são sempre as padrão: nenhum tipo, CNAE ou pacote muda as perguntas. */
export const PERGUNTAS_SEMPRE_PADRAO = true as const;
