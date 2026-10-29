// Tipo de estabelecimento sugerido pelo CNAE e o PACOTE que o app propõe para ele (ambientes, equipamentos e fluxos).
// Tudo aqui é SUGESTÃO: o RT troca o tipo, desmarca o que não existe e nada é criado sem confirmação.
// As PERGUNTAS do questionário NÃO mudam por tipo (são sempre as padrão); este módulo não gera nem sugere perguntas.
// A tabela CNAE → tipo usa os códigos e nomes da CNAE 2.x do IBGE (API de CNAE do IBGE, conferida em 2026-10-24).
import { limiteSugerido, type LimiteDeTemperatura } from "./limitesDeTemperatura.ts";
import { cnaeExisteNaTabelaOficial, descricaoOficialLegivelDoCnae } from "./cnaeOficial.ts";
import { SETORES_OFICIAIS_MANUAL } from "./manualBase.ts";
import { nomeCurtoDoSetor, nomeExibidoDoSetor, descricaoDoSetor } from "./nomesDeSetor.ts";
export { nomeCurtoDoSetor, nomeExibidoDoSetor, descricaoDoSetor };
import { sinonimosDe } from "./sinonimosEquipamentos.ts";
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

/** CNAE só com dígitos: "5611201", "5611-2/01" e "56.11-2-01" dão o mesmo "5611201". Aceita número e valor ausente. */
export const normalizarCnae = (valor: unknown): string => String(valor ?? "").replace(/\D/g, "");

/** Descrição da CNAE do IBGE para um código da tabela (usada só quando o cadastro não trouxe a descrição). */
export const descricaoDoCnaeDaTabela = (codigo: string): string => descricaoOficialLegivelDoCnae(codigo) || CNAE_PARA_TIPO[normalizarCnae(codigo)]?.descricao || "";

/** Tipo sugerido pelo CNAE principal; se não houver correspondência, pelos secundários; senão "Outro". Nunca bloqueia. Vale com ou sem pontuação. */
export function tipoSugeridoPorCnae(principal: string | undefined, secundarios: { codigo: string }[] = []): { tipo: IdDoTipo; rotulo: string; codigo: string; correspondencia: boolean } {
  for (const bruto of [principal, ...(secundarios || []).map((s) => s?.codigo)]) {
    const codigo = normalizarCnae(bruto);
    const achado = CNAE_PARA_TIPO[codigo];
    if (achado) return { tipo: achado.tipo, rotulo: rotuloDoTipo(achado.tipo), codigo, correspondencia: true };
  }
  return { tipo: "outro", rotulo: "Outro", codigo: normalizarCnae(principal), correspondencia: false };
}

/**
 * O código (com ou sem pontuação) está na tabela do app? Essa é a ÚNICA tabela de CNAE que o app tem (poucos códigos de alimentação, só para sugerir o tipo);
 * NÃO é a CNAE completa. A consulta de CNPJ traz código e descrição, mas não há como validar um código digitado contra a lista oficial do IBGE.
 */
export const cnaeReconhecido = (codigo: unknown): boolean => Boolean(CNAE_PARA_TIPO[normalizarCnae(codigo)]);

/**
 * "formato" = não tem 7 dígitos; "inexistente" = 7 dígitos que NÃO estão na tabela oficial; "sem-sugestao" = existe na tabela oficial mas não é um tipo de alimentação
 * do app; "ok" = existe e tem tipo no app.
 */
export type ValidacaoDoCnae = { situacao: "vazio" | "formato" | "inexistente" | "sem-sugestao" | "ok"; digitos: number; mensagem: string };

/** Formato inválido ou código inexistente na tabela oficial. */
export const MENSAGEM_CNAE_NAO_RECONHECIDO = "CNAE não reconhecido · sem sugestões";
/** Código que existe na tabela oficial, mas o app não tem sugestões para ele. */
export const MENSAGEM_CNAE_SEM_SUGESTOES = "CNAE reconhecido · sem sugestões neste app";
/** Código de 7 dígitos que não existe na tabela oficial (validação na hora, no campo). */
export const MENSAGEM_CNAE_INEXISTENTE = "CNAE não encontrado na tabela oficial";

/** Mensagem de "sem sugestão" conforme o código: existe na tabela oficial = "reconhecido"; formato inválido ou inexistente = "não reconhecido". */
export const mensagemSemSugestaoDoCnae = (codigo: unknown): string => (cnaeExisteNaTabelaOficial(codigo) ? MENSAGEM_CNAE_SEM_SUGESTOES : MENSAGEM_CNAE_NAO_RECONHECIDO);

/** Validação na hora, no campo: 7 dígitos (a pontuação não conta; só letras também é inválido) e que o código exista na tabela oficial do IBGE. */
export function validarCnae(valor: unknown): ValidacaoDoCnae {
  const bruto = String(valor ?? "").trim();
  const digitos = normalizarCnae(valor).length;
  if (!bruto) return { situacao: "vazio", digitos, mensagem: "" };
  if (digitos === 0) return { situacao: "formato", digitos, mensagem: "O CNAE só tem números (7 dígitos)." };
  if (digitos !== 7) return { situacao: "formato", digitos, mensagem: `O CNAE tem 7 dígitos (você digitou ${digitos}).` };
  if (!cnaeExisteNaTabelaOficial(valor)) return { situacao: "inexistente", digitos, mensagem: MENSAGEM_CNAE_INEXISTENTE };
  if (!cnaeReconhecido(valor)) return { situacao: "sem-sugestao", digitos, mensagem: MENSAGEM_CNAE_SEM_SUGESTOES };
  return { situacao: "ok", digitos, mensagem: "" };
}

/** CNAE que não pode ser gravado: fora do formato ou inexistente na tabela oficial. */
export const cnaeInvalido = (valor: unknown): boolean => {
  const situacao = validarCnae(valor).situacao;
  return situacao === "formato" || situacao === "inexistente";
};

/** Valor gravado em Empresa.tipo quando a pessoa escolhe "Outro" de propósito (o "Outro" simples, que é o padrão, significa seguir o CNAE). */
export const TIPO_OUTRO_ESCOLHIDO = "Outro (escolhido)";
/** Valor da opção "Seguir o CNAE" no menu (grava "Outro"). */
export const OPCAO_SEGUIR_O_CNAE = "__seguir_o_cnae__";

/**
 * Tipo que vale para a empresa: o que o usuário ajustou ou, sem ajuste, o do CNAE (principal, depois secundários).
 * Empresa.tipo "Outro", vazio ou texto antigo fora da lista = segue o CNAE; um tipo da lista diferente do CNAE = ajuste; "Outro (escolhido)" = "Outro" de propósito
 * (vale como ajuste também com CNAE sem tipo no app).
 */
export function tipoEfetivoDaEmpresa(empresa: { cnae?: string; cnaesSecundarios?: { codigo: string }[]; tipo?: string }): { id: IdDoTipo; rotulo: string; ajustado: boolean; escolhidoOutro: boolean; doCnae: ReturnType<typeof tipoSugeridoPorCnae> } {
  const doCnae = tipoSugeridoPorCnae(empresa.cnae, empresa.cnaesSecundarios || []);
  const escolhidoOutro = empresa.tipo === TIPO_OUTRO_ESCOLHIDO;
  if (escolhidoOutro) return { id: "outro", rotulo: rotuloDoTipo("outro"), ajustado: true, escolhidoOutro: true, doCnae };
  const gravado = TIPOS_DE_ESTABELECIMENTO.some((tipo) => tipo.rotulo === empresa.tipo || tipo.id === empresa.tipo) ? idDoTipo(empresa.tipo) : "outro";
  const ajustado = gravado !== "outro" && gravado !== doCnae.tipo;
  const id = ajustado ? gravado : doCnae.tipo;
  return { id, rotulo: rotuloDoTipo(id), ajustado, escolhidoOutro: false, doCnae };
}

/**
 * O que gravar em Empresa.tipo quando a pessoa escolhe no menu: "Seguir o CNAE" ou o tipo do próprio CNAE = "Outro" (nada de ajuste);
 * "Outro" escolhido de propósito = "Outro (escolhido)"; outro tipo da lista = o rótulo; texto antigo fora da lista passa como está.
 */
export function valorDoTipoParaGuardar(escolhido: string, idDoCnae: IdDoTipo): string {
  if (escolhido === OPCAO_SEGUIR_O_CNAE || escolhido === "Outro") return "Outro";
  if (escolhido === TIPO_OUTRO_ESCOLHIDO) return TIPO_OUTRO_ESCOLHIDO;
  const conhecido = TIPOS_DE_ESTABELECIMENTO.find((tipo) => tipo.rotulo === escolhido || tipo.id === escolhido);
  if (!conhecido) return escolhido;
  return conhecido.id === idDoCnae ? "Outro" : conhecido.rotulo;
}

const S = SETORES_OFICIAIS_MANUAL;
const [RECEBIMENTO, ESTOQUE, DML, GAS, COZINHA, HIGIENIZACAO, SALAO, VEST_F, BAN_F, VEST_M, BAN_M, CLI_F, CLI_M] = S;
const COLABORADORES = [VEST_F, BAN_F, VEST_M, BAN_M];
const CLIENTES = [CLI_F, CLI_M];

/** Quem usa o setor: agrupa a lista do pacote (colaboradores, depois clientes). */
export const publicoDoSetor = (nome: string): "Produção e apoio" | "Colaboradores" | "Clientes" =>
  COLABORADORES.includes(nome as never) ? "Colaboradores" : CLIENTES.includes(nome as never) ? "Clientes" : "Produção e apoio";

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

/** Limite de temperatura que a norma indica para este equipamento (só sugestão; o RT confirma). Sem limite conhecido: undefined. Considera os sinônimos ("Geladeira" = "Refrigerador"). */
export function limiteSugeridoParaEquipamento(nome: string): LimiteDeTemperatura | undefined {
  return limiteSugerido([nome]) || limiteSugerido(sinonimosDe(nome));
}

/** As perguntas do questionário são sempre as padrão: nenhum tipo, CNAE ou pacote muda as perguntas. */
export const PERGUNTAS_SEMPRE_PADRAO = true as const;

/** Salvar a empresa só é bloqueado por CNAE inválido (fora do formato ou inexistente na tabela oficial) quando a empresa é nova ou o código foi MUDADO em relação ao salvo; empresa antiga com o CNAE intacto só mostra o aviso e salva os outros campos. */
export function cnaeBloqueiaSalvar(cnaeDoFormulario: string | undefined, cnaeSalvo: string | undefined, empresaNova: boolean, veioDaConsulta = false): boolean {
  if (!cnaeInvalido(cnaeDoFormulario)) return false;
  // Código que veio da consulta de CNPJ (dado fiscal real) e só não está na tabela oficial: vira aviso, não bloqueia; só o formato inválido bloqueia.
  if (veioDaConsulta && validarCnae(cnaeDoFormulario).situacao === "inexistente") return false;
  return empresaNova || normalizarCnae(cnaeDoFormulario) !== normalizarCnae(cnaeSalvo);
}

/** A consulta de CNPJ só decide o tipo se a pessoa não ajustou nada ("Outro" ou vazio gravado); o ajuste dela nunca é apagado. */
export const consultaPodeTrocarOTipo = (tipoGravado: string | undefined): boolean => !tipoGravado || tipoGravado === "Outro";
