// Registros por POP, comprovantes de terceiros com validade e a lista de pendências da empresa.
// Lógica pura (testável fora do navegador). Nenhum prazo de norma é escrito aqui: os prazos vêm de lib/normas/
// (todos marcados "conferir") ou do RT. Nada é apagado: registro fora do prazo de guarda só vai para a lista "Revisar".
import type { Capacitacao, Colaborador, ComprovanteTerceiro, Empresa, LeituraPop, PerfilUsuario, RegistroPop, TipoComprovante, UsuarioSistema } from "../types/index.ts";
import { CATALOGO_DE_NORMAS, normasDaEmpresa, type Norma } from "./normas/index.ts";
import { hojeISO } from "./popsNorma.ts";
import { acessoVigente } from "./validadeDeAcesso.ts";

// ===== Quem pode o quê (por perfil; o servidor repete a mesma conta) =====

type Quem = Pick<UsuarioSistema, "perfil" | "status" | "validoAte" | "acessoEncerradoEm"> | null | undefined;

const ativo = (usuario: Quem): usuario is NonNullable<Quem> => Boolean(usuario) && usuario!.status !== "Suspenso" && acessoVigente(usuario!);
const PERFIS_QUE_REGISTRAM: PerfilUsuario[] = ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente", "Executor de campo"];
const PERFIS_DE_GESTAO: PerfilUsuario[] = ["Administrador", "Consultor/RT", "Cliente Gestor", "Gerente"];

/** Executor de campo, Gerente, Gestor, RT e Administrador criam registro por POP; o Fiscal só lê. */
export function podeCriarRegistroPop(usuario: Quem): boolean {
  return ativo(usuario) && PERFIS_QUE_REGISTRAM.includes(usuario.perfil);
}
export function podeVerRegistrosPop(usuario: Quem): boolean {
  return ativo(usuario);
}
/** Criar, editar e renovar comprovantes: Administrador, RT, Gestor e Gerente. */
export function podeGerenciarComprovantes(usuario: Quem): boolean {
  return ativo(usuario) && PERFIS_DE_GESTAO.includes(usuario.perfil);
}
/** Pessoas, capacitações e leituras de POP: Administrador, RT, Gestor e Gerente (nem Fiscal nem Executor). */
export function podeGerenciarPessoas(usuario: Quem): boolean {
  return podeGerenciarComprovantes(usuario);
}
/** O Executor não vê comprovantes; o Fiscal lê. */
export function podeVerComprovantes(usuario: Quem): boolean {
  return podeGerenciarComprovantes(usuario) || (ativo(usuario) && usuario.perfil === "Fiscal");
}

// ===== Datas =====

const DIA_MS = 24 * 60 * 60 * 1000;

function dataEmMs(iso: string): number {
  const [ano, mes, dia] = iso.split("-").map(Number);
  return Date.UTC(ano, (mes || 1) - 1, dia || 1);
}

/** Dias de `de` até `ate` (AAAA-MM-DD); negativo quando `ate` é antes. */
export function diasEntre(de: string, ate: string): number {
  return Math.round((dataEmMs(ate) - dataEmMs(de)) / DIA_MS);
}

/** Soma meses mantendo o fim do mês quando o dia não existe (31/08 + 6 meses = 28/02 ou 29/02). */
export function somarMeses(iso: string, meses: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const total = ano * 12 + (mes - 1) + meses;
  const novoAno = Math.floor(total / 12);
  const novoMes = total % 12;
  const ultimoDia = new Date(Date.UTC(novoAno, novoMes + 1, 0)).getUTCDate();
  return `${String(novoAno).padStart(4, "0")}-${String(novoMes + 1).padStart(2, "0")}-${String(Math.min(dia, ultimoDia)).padStart(2, "0")}`;
}

export const DIAS_DE_AVISO_DE_VALIDADE = 30;

export type SituacaoDaValidade = "vencido" | "vence-em-breve" | "em-dia" | "sem-validade";

/** Vencido: validade antes de hoje. Vence em breve: de hoje até 30 dias à frente (inclusive). Em dia: depois disso. */
export function situacaoDaValidade(validade: string | undefined, hoje: string = hojeISO()): SituacaoDaValidade {
  if (!validade) return "sem-validade";
  const dias = diasEntre(hoje, validade);
  if (dias < 0) return "vencido";
  return dias <= DIAS_DE_AVISO_DE_VALIDADE ? "vence-em-breve" : "em-dia";
}

export const ROTULO_DA_VALIDADE: Record<SituacaoDaValidade, string> = {
  vencido: "Vencido",
  "vence-em-breve": "Vence em breve",
  "em-dia": "Em dia",
  "sem-validade": "Sem validade",
};

// ===== Guarda dos registros por POP =====

export type GuardaDosRegistros = {
  dias: number | null;
  /** "norma": a norma estadual aplicada fixa o prazo. "rt": o RT definiu. "sugestao": nada definido ainda. */
  origem: "norma" | "rt" | "sugestao";
  /** Item citado (ex.: "Portaria SES 799/2023 (RS) · Anexo I, 13.2"). */
  citacao: string;
  conferir: boolean;
  aviso: string;
  sugestaoDias: number | null;
};

export const AVISO_CONFIRA_NO_TEXTO_OFICIAL = "Confira no texto oficial.";

/** Guarda mínima da norma da empresa; sem norma estadual com prazo, vale o que o RT definiu (com sugestão e aviso). */
export function guardaDosRegistros(empresa: Pick<Empresa, "normasAplicadas" | "guardaRegistrosDias">, catalogo: Norma[] = CATALOGO_DE_NORMAS): GuardaDosRegistros {
  const normas = normasDaEmpresa(empresa, catalogo);
  const estaduais = normas
    .filter((norma) => norma.esfera === "estadual" && norma.itens["guarda-de-registros"]?.prazoDias)
    .sort((a, b) => (b.itens["guarda-de-registros"].prazoDias || 0) - (a.itens["guarda-de-registros"].prazoDias || 0));
  if (estaduais.length) {
    const norma = estaduais[0];
    const item = norma.itens["guarda-de-registros"];
    return {
      dias: item.prazoDias!,
      origem: "norma",
      citacao: `${norma.nome} · ${item.rotulo}`,
      conferir: Boolean(item.conferir) || norma.conferidoEm === null,
      aviso: AVISO_CONFIRA_NO_TEXTO_OFICIAL,
      sugestaoDias: null,
    };
  }
  const federal = normas.find((norma) => norma.itens["guarda-de-registros"]?.prazoDias) || catalogo.find((norma) => norma.esfera === "federal" && norma.itens["guarda-de-registros"]?.prazoDias);
  const sugestao = federal?.itens["guarda-de-registros"].prazoDias ?? null;
  const citacaoDaSugestao = federal ? `${federal.nome} · ${federal.itens["guarda-de-registros"].rotulo}` : "";
  const dias = empresa.guardaRegistrosDias && empresa.guardaRegistrosDias > 0 ? Math.round(empresa.guardaRegistrosDias) : null;
  if (dias) {
    return {
      dias,
      origem: "rt",
      citacao: "Prazo definido pelo RT para esta empresa",
      conferir: false,
      aviso: "Norma estadual não cadastrada; consulte a Vigilância Sanitária local.",
      sugestaoDias: sugestao,
    };
  }
  return {
    dias: null,
    origem: "sugestao",
    citacao: citacaoDaSugestao,
    conferir: true,
    aviso: `Defina o prazo da guarda nesta empresa. ${sugestao ? `Sugestão: ${sugestao} dias (${citacaoDaSugestao}). ` : ""}${AVISO_CONFIRA_NO_TEXTO_OFICIAL}`,
    sugestaoDias: sugestao,
  };
}

/** Separa os registros de um POP: dentro do prazo de guarda e fora dele ("Revisar", só leitura). Nada é apagado. */
export function separarRegistros(
  registros: RegistroPop[],
  popId: string,
  guardaDias: number | null,
  agora: Date = new Date()
): { recentes: RegistroPop[]; revisar: RegistroPop[] } {
  const doPop = registros.filter((registro) => registro.popId === popId).sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  if (!guardaDias) return { recentes: doPop, revisar: [] };
  const corte = agora.getTime() - guardaDias * DIA_MS;
  return {
    recentes: doPop.filter((registro) => new Date(registro.dataHora).getTime() >= corte),
    revisar: doPop.filter((registro) => new Date(registro.dataHora).getTime() < corte),
  };
}

export type DadosDoRegistro = {
  id: string;
  empresaId: string;
  popId: string;
  popVersao: string;
  dataHora: string;
  responsavel: string;
  responsavelId?: string;
  descricao: string;
  ambiente?: string;
  corrigeRegistroId?: string;
};

export type ResultadoDoRegistro = { ok: true; registro: RegistroPop } | { ok: false; erro: string };

/** Valida e monta um registro novo. Registro existente nunca é alterado: corrigir é criar outro que cita o anterior. */
export function criarRegistroPop(dados: DadosDoRegistro, agora: Date = new Date()): ResultadoDoRegistro {
  if (!dados.descricao.trim()) return { ok: false, erro: "Descreva o que foi feito." };
  if (!dados.responsavel.trim()) return { ok: false, erro: "Informe o responsável." };
  const quando = new Date(dados.dataHora);
  if (Number.isNaN(quando.getTime())) return { ok: false, erro: "Informe a data e a hora." };
  if (quando.getTime() > agora.getTime() + 5 * 60 * 1000) return { ok: false, erro: "A data e a hora não podem estar no futuro." };
  return {
    ok: true,
    registro: {
      id: dados.id,
      empresaId: dados.empresaId,
      popId: dados.popId,
      popVersao: dados.popVersao,
      dataHora: quando.toISOString(),
      responsavel: dados.responsavel.trim(),
      ...(dados.responsavelId ? { responsavelId: dados.responsavelId } : {}),
      descricao: dados.descricao.trim(),
      ...(dados.ambiente?.trim() ? { ambiente: dados.ambiente.trim() } : {}),
      ...(dados.corrigeRegistroId ? { corrigeRegistroId: dados.corrigeRegistroId } : {}),
      criadoEm: agora.toISOString(),
    },
  };
}

// ===== Comprovantes de terceiros =====

export const TIPOS_DE_COMPROVANTE: { id: TipoComprovante; rotulo: string }[] = [
  { id: "pragas", rotulo: "Controle de pragas" },
  { id: "reservatorio", rotulo: "Limpeza do reservatório" },
  { id: "contrato-rt", rotulo: "Contrato do RT" },
  { id: "outro", rotulo: "Outro" },
];

export function rotuloDoTipo(tipo: TipoComprovante): string {
  return TIPOS_DE_COMPROVANTE.find((item) => item.id === tipo)?.rotulo || "Outro";
}

export type SugestaoDeValidade = { validade: string; texto: string; fonte: string; conferir: boolean };

/** Só o reservatório tem sugestão (6 meses depois do serviço, conforme o item cadastrado); os demais tipos o usuário informa. */
export function sugerirValidade(tipo: TipoComprovante, dataServico: string, catalogo: Norma[] = CATALOGO_DE_NORMAS): SugestaoDeValidade | null {
  if (tipo !== "reservatorio" || !/^\d{4}-\d{2}-\d{2}$/.test(dataServico)) return null;
  for (const norma of catalogo) {
    const item = norma.itens["reservatorio-intervalo"];
    if (item?.prazoMeses) {
      return {
        validade: somarMeses(dataServico, item.prazoMeses),
        texto: `Sugestão: ${item.prazoMeses} meses depois da data do serviço. Confira no certificado.`,
        fonte: `${norma.nome} · ${item.rotulo}`,
        conferir: Boolean(item.conferir) || norma.conferidoEm === null,
      };
    }
  }
  return null;
}

export type ErrosDoComprovante = Partial<Record<"emissor" | "dataServico" | "validade", string>>;

export function validarComprovante(dados: Pick<ComprovanteTerceiro, "emissor" | "dataServico" | "validade">): ErrosDoComprovante {
  const erros: ErrosDoComprovante = {};
  if (!dados.emissor.trim()) erros.emissor = "Informe quem emitiu.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dataServico)) erros.dataServico = "Informe a data do serviço.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.validade)) erros.validade = "Informe a validade.";
  else if (!erros.dataServico && dados.validade < dados.dataServico) erros.validade = "A validade não pode ser antes da data do serviço.";
  return erros;
}

export type ContagemDeValidade = { vencidos: number; venceEmBreve: number; emDia: number };

export function contarPorValidade(itens: { validade?: string }[], hoje: string = hojeISO()): ContagemDeValidade {
  const contagem: ContagemDeValidade = { vencidos: 0, venceEmBreve: 0, emDia: 0 };
  for (const item of itens) {
    const situacao = situacaoDaValidade(item.validade, hoje);
    if (situacao === "vencido") contagem.vencidos += 1;
    else if (situacao === "vence-em-breve") contagem.venceEmBreve += 1;
    else if (situacao === "em-dia") contagem.emDia += 1;
  }
  return contagem;
}

/** Comprovantes ainda valendo: quando um foi renovado, o antigo sai da conta (só o mais novo da cadeia importa). */
export function comprovantesVigentes(comprovantes: ComprovanteTerceiro[]): ComprovanteTerceiro[] {
  const renovados = new Set(comprovantes.map((item) => item.renovaId).filter(Boolean));
  return comprovantes.filter((item) => !renovados.has(item.id));
}

// ===== Pendências da empresa (base do painel "Hoje"; o painel vem em outro pacote) =====

// ===== Treinamento nominal (Pacote 18) =====
// Guardado: só nome, cargo e datas. Nada de CPF, saúde, foto ou data de nascimento.

export type DadosDoColaborador = { nome: string; cargo: string };

export function validarColaborador(dados: DadosDoColaborador): Partial<Record<"nome" | "cargo", string>> {
  const erros: Partial<Record<"nome" | "cargo", string>> = {};
  if (!dados.nome.trim()) erros.nome = "Informe o nome.";
  if (!dados.cargo.trim()) erros.cargo = "Informe o cargo.";
  return erros;
}

export type LinhaDeLeitura = { colaborador: Colaborador; lido: boolean; data?: string };

/** Quem leu a versão vigente do POP: só os colaboradores ativos. Leitura de versão anterior não conta (nova versão zera). */
export function leituraDaVersao(popId: string, popVersao: string, colaboradores: Colaborador[], leituras: LeituraPop[]): { linhas: LinhaDeLeitura[]; lidos: number; total: number } {
  const ativos = colaboradores.filter((colaborador) => colaborador.ativo).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const linhas = ativos.map((colaborador) => {
    const leitura = leituras.filter((item) => item.popId === popId && item.popVersao === popVersao && item.colaboradorId === colaborador.id).sort((a, b) => b.data.localeCompare(a.data))[0];
    return { colaborador, lido: Boolean(leitura), data: leitura?.data };
  });
  return { linhas, lidos: linhas.filter((linha) => linha.lido).length, total: linhas.length };
}

export const ROTULO_DA_CAPACITACAO: Record<SituacaoDaValidade, string> = {
  "em-dia": "Em dia",
  "vence-em-breve": "Vence em breve",
  vencido: "Vencida",
  "sem-validade": "Sem vencimento",
};

export type ErrosDaCapacitacao = Partial<Record<"colaboradorId" | "conteudo" | "cargaHoraria" | "data" | "venceEm", string>>;

export function validarCapacitacao(dados: { colaboradorId: string; conteudo: string; cargaHoraria: number | string; data: string; venceEm: string }): ErrosDaCapacitacao {
  const erros: ErrosDaCapacitacao = {};
  if (!dados.colaboradorId) erros.colaboradorId = "Escolha a pessoa.";
  if (!dados.conteudo.trim()) erros.conteudo = "Informe o conteúdo do treinamento.";
  const horas = Number(String(dados.cargaHoraria).replace(",", "."));
  if (!Number.isFinite(horas) || horas <= 0) erros.cargaHoraria = "Informe a carga horária em horas.";
  else if (horas > 1000) erros.cargaHoraria = "Carga horária alta demais.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) erros.data = "Informe a data.";
  if (dados.venceEm) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.venceEm)) erros.venceEm = "Data de vencimento inválida.";
    else if (!erros.data && dados.venceEm < dados.data) erros.venceEm = "O vencimento não pode ser antes da data do treinamento.";
  }
  return erros;
}

export type ReferenciaDeCapacitacao = { norma: string; rotulo: string; orientacao: string; conferir: boolean };

const ITENS_DE_CAPACITACAO = ["capacitacao-admissional-anual", "curso-do-responsavel", "manipuladores"] as const;

/** Texto de apoio: o que a norma cadastrada da empresa cita sobre capacitação (todas as citações marcadas conferir). */
export function referenciasDeCapacitacao(empresa: Pick<Empresa, "normasAplicadas">, catalogo: Norma[] = CATALOGO_DE_NORMAS): ReferenciaDeCapacitacao[] {
  const lista: ReferenciaDeCapacitacao[] = [];
  for (const norma of normasDaEmpresa(empresa, catalogo)) {
    for (const id of ITENS_DE_CAPACITACAO) {
      const item = norma.itens[id];
      if (!item) continue;
      lista.push({ norma: norma.nome, rotulo: item.rotulo, orientacao: item.orientacao, conferir: Boolean(item.conferir) || norma.conferidoEm === null });
    }
  }
  return lista;
}

export const AVISO_PRAZO_DE_CAPACITACAO = "Vale o que a norma cadastrada da empresa disser; o vencimento é sempre editável.";

/** Sugestão de vencimento: só quando a norma cadastrada da empresa traz prazo em meses para capacitação; o campo continua editável. */
export function sugerirVencimentoDaCapacitacao(empresa: Pick<Empresa, "normasAplicadas">, data: string, catalogo: Norma[] = CATALOGO_DE_NORMAS): { venceEm: string; texto: string } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  for (const norma of normasDaEmpresa(empresa, catalogo)) {
    const item = norma.itens["capacitacao-admissional-anual"];
    if (item?.prazoMeses) {
      return { venceEm: somarMeses(data, item.prazoMeses), texto: `Sugestão: ${item.prazoMeses} meses depois (${norma.nome} · ${item.rotulo}, conferir). Confira no texto oficial.` };
    }
  }
  return null;
}

/** Só a capacitação mais recente de cada pessoa e treinamento conta: a que foi renovada deixa de gerar pendência. */
export function capacitacoesVigentes(capacitacoes: Capacitacao[]): Capacitacao[] {
  const chave = (item: Capacitacao) => `${item.colaboradorId}|${item.conteudo.trim().toLocaleLowerCase("pt-BR")}`;
  const maisRecente = new Map<string, Capacitacao>();
  for (const item of capacitacoes) {
    const atual = maisRecente.get(chave(item));
    if (!atual || item.data > atual.data || (item.data === atual.data && item.criadoEm > atual.criadoEm)) maisRecente.set(chave(item), item);
  }
  return [...maisRecente.values()];
}

export type PendenciaDaEmpresa = {
  origem: "comprovante" | "capacitacao";
  id: string;
  empresaId: string;
  titulo: string;
  validade: string;
  situacao: "vencido" | "vence-em-breve";
  /** Negativo quando já venceu. */
  dias: number;
};

export function pendenciasDaEmpresa(
  empresaId: string,
  dados: { comprovantes?: ComprovanteTerceiro[]; capacitacoes?: Capacitacao[]; colaboradores?: Colaborador[] },
  hoje: string = hojeISO()
): PendenciaDaEmpresa[] {
  const lista: PendenciaDaEmpresa[] = [];
  for (const item of comprovantesVigentes((dados.comprovantes || []).filter((comprovante) => comprovante.empresaId === empresaId))) {
    const situacao = situacaoDaValidade(item.validade, hoje);
    if (situacao !== "vencido" && situacao !== "vence-em-breve") continue;
    lista.push({
      origem: "comprovante",
      id: item.id,
      empresaId,
      titulo: `${rotuloDoTipo(item.tipo)} · ${item.emissor}`,
      validade: item.validade,
      situacao,
      dias: diasEntre(hoje, item.validade),
    });
  }
  const ativos = new Map((dados.colaboradores || []).filter((pessoa) => pessoa.empresaId === empresaId && pessoa.ativo).map((pessoa) => [pessoa.id, pessoa]));
  for (const item of capacitacoesVigentes((dados.capacitacoes || []).filter((capacitacao) => capacitacao.empresaId === empresaId))) {
    const pessoa = ativos.get(item.colaboradorId);
    const situacao = situacaoDaValidade(item.venceEm, hoje);
    if (!pessoa || (situacao !== "vencido" && situacao !== "vence-em-breve")) continue;
    lista.push({
      origem: "capacitacao",
      id: item.id,
      empresaId,
      titulo: `${pessoa.nome} · ${item.conteudo}`,
      validade: item.venceEm,
      situacao,
      dias: diasEntre(hoje, item.venceEm),
    });
  }
  return lista.sort((a, b) => a.dias - b.dias);
}
