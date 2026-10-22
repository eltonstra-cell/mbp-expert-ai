// Situação derivada e "próxima ação" de cada POP na lista da Central (Documentos › POPs).
// Nada é digitado: tudo vem dos dados que já existem. Sem prazo de norma escrito aqui.
import type { Colaborador, ComprovanteTerceiro, Empresa, LeituraPop, NaoConformidade, ProcedimentoOperacionalPadronizado, RegistroPop } from "../types/index.ts";
import { CONJUNTO_DA_NORMA, conjuntoDaEmpresa, hojeISO, popDoConjunto, popPrecisaRevisarPorNorma, popVigente, type DefinicaoPopDoConjunto } from "./popsNorma.ts";
import { diasEntre, leituraDaVersao, situacaoDaValidade } from "./registrosEmpresa.ts";
import { palavra } from "./plural.ts";
import { dataISOLocal, formatarDataCurta } from "./dataLocal.ts";

export type SituacaoDeGestao = "Falta criar" | "Rascunho" | "Aguardando aprovação" | "Vigente" | "Revisão vencida" | "Inativo";

/** Falta criar (sem versão) | Rascunho | Aguardando aprovação | Vigente | Revisão vencida. "Revisão vencida" só com "revisar até" vencido ou norma alterada. */
export function situacaoDeGestao(pop: ProcedimentoOperacionalPadronizado | undefined, hoje: string = hojeISO()): SituacaoDeGestao {
  if (!pop) return "Falta criar";
  if (pop.status === "Inativo") return "Inativo";
  if (pop.status === "Aprovado") {
    if (pop.proximaRevisao && pop.proximaRevisao < hoje) return "Revisão vencida";
    if (popPrecisaRevisarPorNorma(pop)) return "Revisão vencida";
    return "Vigente";
  }
  if (pop.status === "Aguardando aprovação" || pop.status === "Em revisão") return "Aguardando aprovação";
  return "Rascunho";
}

/** Cores das etiquetas: fundo, texto e cor da faixa à esquerda (texto branco nas fortes). */
export const CORES_DA_SITUACAO: Record<SituacaoDeGestao, { fundo: string; texto: string; faixa: string }> = {
  "Falta criar": { fundo: "#EEF1F5", texto: "#12202B", faixa: "#C9D3DB" },
  Rascunho: { fundo: "#FFF3D6", texto: "#12202B", faixa: "#E8B04B" },
  "Aguardando aprovação": { fundo: "#2F6FB5", texto: "#FFFFFF", faixa: "#2F6FB5" },
  Vigente: { fundo: "#2E8B57", texto: "#FFFFFF", faixa: "#2E8B57" },
  "Revisão vencida": { fundo: "#B35A36", texto: "#FFFFFF", faixa: "#B35A36" },
  Inativo: { fundo: "#EEF1F5", texto: "#12202B", faixa: "#C9D3DB" },
};

const NORMALIZAR = (texto: string) =>
  texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR");

/**
 * Frequência escrita pelo RT no POP, em dias. Só reconhece palavras comuns; texto que não dá para ler devolve null
 * (e então nenhum registro é cobrado como atrasado).
 */
export function diasDaFrequencia(texto: string | undefined): number | null {
  const t = NORMALIZAR(texto || "");
  if (!t.trim()) return null;
  const pares: [RegExp, number][] = [
    [/\b(diari[oa]|todo dia|todos os dias|cada dia)\b/, 1],
    [/\bsemanal|toda semana|todas as semanas\b/, 7],
    [/\bquinzenal\b/, 15],
    [/\bmensal|todo mes|todos os meses\b/, 30],
    [/\bbimestral\b/, 60],
    [/\btrimestral\b/, 90],
    [/\bsemestral\b/, 182],
    [/\banual|todo ano\b/, 365],
  ];
  for (const [regra, dias] of pares) if (regra.test(t)) return dias;
  return null;
}

export type EntradaDaAcao = {
  pop: ProcedimentoOperacionalPadronizado | undefined;
  /** Definição do conjunto da norma, quando o POP é de lá (nome do "Falta criar"). */
  definicao?: DefinicaoPopDoConjunto;
  hoje?: string;
  comprovantes?: ComprovanteTerceiro[];
  ncs?: Pick<NaoConformidade, "status" | "prazo" | "categoria" | "popCatalogoId" | "inativaNoChecklist" | "canceladaPeloUsuarioEm">[];
  registros?: RegistroPop[];
  /** Colaboradores ativos que ainda não leram a versão vigente (nomes). */
  leituraPendente?: { lidos: number; total: number; faltam: string[] };
  /** O usuário que olha é o responsável do estabelecimento vinculado (único que aprova). */
  podeAprovar: boolean;
};

export type TipoDaAcao =
  | "comprovante-vencido"
  | "correcao-atrasada"
  | "aguardando-aprovacao"
  | "registro-atrasado"
  | "leitura-pendente"
  | "comprovante-vence"
  | "em-dia"
  | "concluir-rascunho"
  | "criar";

export type AcaoDoPop = {
  tipo: TipoDaAcao;
  /** Posição na ordem da regra; menor primeiro (1 a 6), depois "Em dia" e "Falta criar". */
  prioridade: number;
  texto: string;
  /** Botão laranja compatível da aba Resumo. */
  botao?: { rotulo: string; destino: "comprovantes" | "documento" | "registros" | "leitura" | "aprovar" };
};

export const PRIORIDADE_DA_ACAO: Record<TipoDaAcao, number> = {
  "comprovante-vencido": 1,
  "correcao-atrasada": 2,
  "aguardando-aprovacao": 3,
  "registro-atrasado": 4,
  "leitura-pendente": 5,
  "comprovante-vence": 6,
  "concluir-rascunho": 7,
  "em-dia": 8,
  criar: 9,
};

function dataCurta(iso: string): string {
  return formatarDataCurta(iso);
}

/** Comprovantes ligados a este POP (campo "POP vinculado"). */
export function comprovantesDoPop(comprovantes: ComprovanteTerceiro[] | undefined, popId: string): ComprovanteTerceiro[] {
  return (comprovantes || []).filter((item) => item.popId === popId);
}

/** Só o mais recente de cada renovação conta (os antigos já foram renovados). */
export function comprovantesVigentesDoPop(comprovantes: ComprovanteTerceiro[] | undefined, popId: string): ComprovanteTerceiro[] {
  const doPop = comprovantesDoPop(comprovantes, popId);
  const renovados = new Set(doPop.map((item) => item.renovaId).filter(Boolean));
  return doPop.filter((item) => !renovados.has(item.id) && !item.substituidoPor);
}

/** Correções abertas e com prazo vencido ligadas ao POP: vínculo escolhido à mão, ou o padrão pela categoria. */
export function correcoesAtrasadasDoPop(
  pop: Pick<ProcedimentoOperacionalPadronizado, "catalogoId">,
  ncs: EntradaDaAcao["ncs"],
  hoje: string = hojeISO()
): number {
  if (!pop.catalogoId) return 0;
  const definicao = CONJUNTO_DA_NORMA.find((item) => item.catalogoId === pop.catalogoId);
  return (ncs || []).filter((nc) => {
    if (nc.status === "Resolvida" || nc.inativaNoChecklist || nc.canceladaPeloUsuarioEm || !nc.prazo || nc.prazo >= hoje) return false;
    if (nc.popCatalogoId) return nc.popCatalogoId === pop.catalogoId;
    return Boolean(definicao?.categoriasDeNc.some((categoria) => NORMALIZAR(categoria) === NORMALIZAR(nc.categoria)));
  }).length;
}

/** Registro atrasado: a frequência do POP é legível e o último registro (ou a aprovação) é mais antigo que ela. */
export function registroAtrasado(pop: ProcedimentoOperacionalPadronizado, registros: RegistroPop[] | undefined, hoje: string = hojeISO()): boolean {
  const vigente = popVigente(pop);
  if (!vigente) return false;
  const dias = diasDaFrequencia(vigente.conteudo?.frequencia);
  if (!dias) return false;
  const doPop = (registros || []).filter((registro) => registro.popId === pop.id);
  const ultimo = doPop.map((registro) => dataISOLocal(registro.dataHora)).sort().pop();
  const base = ultimo || (vigente.aprovacao?.em ? dataISOLocal(vigente.aprovacao.em) : undefined);
  if (!base) return false;
  return diasEntre(base, hoje) > dias;
}

export function ultimoRegistroDoPop(registros: RegistroPop[] | undefined, popId: string): RegistroPop | undefined {
  return (registros || []).filter((registro) => registro.popId === popId).sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];
}

/**
 * Uma só próxima ação, a primeira que valer: 1 comprovante vinculado vencido; 2 correção atrasada vinculada ao POP;
 * 3 POP aguardando aprovação; 4 registro atrasado; 5 leitura pendente da versão vigente; 6 comprovante vence em até 30 dias;
 * 7 nada pendente: "Em dia". POP sem versão: "Criar do modelo e revisar". Rascunho sem pendência de 1 a 6: concluir e enviar.
 */
export function proximaAcaoDoPop(entrada: EntradaDaAcao): AcaoDoPop {
  const hoje = entrada.hoje || hojeISO();
  const pop = entrada.pop;
  if (!pop) return { tipo: "criar", prioridade: PRIORIDADE_DA_ACAO.criar, texto: "Criar do modelo e revisar", botao: { rotulo: "Criar do modelo", destino: "documento" } };

  const vigentes = comprovantesVigentesDoPop(entrada.comprovantes, pop.id);
  const comSituacao = vigentes.map((item) => ({ item, situacao: situacaoDaValidade(item.validade, hoje), dias: diasEntre(hoje, item.validade) }));
  const vencidos = comSituacao.filter((linha) => linha.situacao === "vencido");
  if (vencidos.length) {
    const mais = vencidos.sort((a, b) => a.dias - b.dias)[0];
    return {
      tipo: "comprovante-vencido",
      prioridade: 1,
      texto: vencidos.length === 1 ? `Comprovante vencido em ${dataCurta(mais.item.validade)}: renovar` : `${vencidos.length} comprovantes vencidos: renovar`,
      botao: { rotulo: "Renovar comprovante", destino: "comprovantes" },
    };
  }

  const atrasadas = correcoesAtrasadasDoPop(pop, entrada.ncs, hoje);
  if (atrasadas > 0) {
    return {
      tipo: "correcao-atrasada",
      prioridade: 2,
      texto: `${atrasadas} ${palavra(atrasadas, "correção atrasada", "correções atrasadas")} ligada${atrasadas === 1 ? "" : "s"} a este POP`,
    };
  }

  const situacao = situacaoDeGestao(pop, hoje);
  if (situacao === "Aguardando aprovação") {
    return entrada.podeAprovar
      ? { tipo: "aguardando-aprovacao", prioridade: 3, texto: "Aprovar este POP (você é o responsável do estabelecimento)", botao: { rotulo: "Aprovar", destino: "aprovar" } }
      : { tipo: "aguardando-aprovacao", prioridade: 3, texto: "Aguardando o responsável" };
  }

  if (registroAtrasado(pop, entrada.registros, hoje)) {
    return { tipo: "registro-atrasado", prioridade: 4, texto: "Registro atrasado em relação à frequência do POP", botao: { rotulo: "Registrar execução", destino: "registros" } };
  }

  const leitura = entrada.leituraPendente;
  if (leitura && leitura.total > 0 && leitura.lidos < leitura.total && popVigente(pop)) {
    const faltam = leitura.total - leitura.lidos;
    // Sem os nomes: quem falta aparece no bloco "Quem ainda não leu" do Resumo, com o botão de cada pessoa.
    return {
      tipo: "leitura-pendente",
      prioridade: 5,
      texto: `${faltam === 1 ? "Falta 1 pessoa ler" : `Faltam ${faltam} pessoas lerem`} a v${popVigente(pop)!.versao}`,
      botao: { rotulo: "Ver quem falta", destino: "leitura" },
    };
  }

  const aVencer = comSituacao.filter((linha) => linha.situacao === "vence-em-breve").sort((a, b) => a.dias - b.dias)[0];
  if (aVencer) {
    return { tipo: "comprovante-vence", prioridade: 6, texto: `Comprovante vence em ${dataCurta(aVencer.item.validade)}`, botao: { rotulo: "Ver comprovante", destino: "comprovantes" } };
  }

  if (situacao === "Rascunho") {
    return { tipo: "concluir-rascunho", prioridade: PRIORIDADE_DA_ACAO["concluir-rascunho"], texto: "Concluir o texto e enviar para aprovação", botao: { rotulo: "Abrir documento", destino: "documento" } };
  }
  return { tipo: "em-dia", prioridade: PRIORIDADE_DA_ACAO["em-dia"], texto: "Em dia" };
}

export type LinhaDaLista = {
  chave: string;
  /** "POP-01": o do POP, ou o do modelo quando o POP ainda falta criar; vazio só em "Outros" sem código. */
  codigo: string;
  pop?: ProcedimentoOperacionalPadronizado;
  definicao?: DefinicaoPopDoConjunto;
  titulo: string;
  situacao: SituacaoDeGestao;
  acao: AcaoDoPop;
};

/** O que precisa de alguém primeiro (1 a 6 e rascunho), depois "Em dia", depois "Falta criar"; empate pela ordem de entrada. */
export function ordenarLinhas<T extends { acao: AcaoDoPop }>(linhas: T[]): T[] {
  return linhas
    .map((linha, indice) => ({ linha, indice }))
    .sort((a, b) => a.linha.acao.prioridade - b.linha.acao.prioridade || a.indice - b.indice)
    .map(({ linha }) => linha);
}

/** Cada POP cai em UMA só caixa, então a soma é sempre o total de POPs. */
export type ContadoresDaLista = { total: number; vigentesEmDia: number; vigentesComPendencia: number; aguardando: number; rascunho: number; faltaCriar: number };

/**
 * Contadores exclusivos: vigentes em dia, vigentes com pendência (ação diferente de "Em dia" ou revisão vencida), aguardando aprovação,
 * em rascunho e falta criar. Inativo não conta.
 */
export function contadoresDaLista(linhas: Pick<LinhaDaLista, "situacao" | "acao">[]): ContadoresDaLista {
  const ativas = linhas.filter((linha) => linha.situacao !== "Inativo");
  const quantas = (regra: (linha: Pick<LinhaDaLista, "situacao" | "acao">) => boolean) => ativas.filter(regra).length;
  const vigente = (linha: Pick<LinhaDaLista, "situacao">) => linha.situacao === "Vigente" || linha.situacao === "Revisão vencida";
  return {
    total: ativas.length,
    vigentesEmDia: quantas((linha) => vigente(linha) && linha.situacao !== "Revisão vencida" && linha.acao.tipo === "em-dia"),
    vigentesComPendencia: quantas((linha) => vigente(linha) && (linha.situacao === "Revisão vencida" || linha.acao.tipo !== "em-dia")),
    aguardando: quantas((linha) => linha.situacao === "Aguardando aprovação"),
    rascunho: quantas((linha) => linha.situacao === "Rascunho"),
    faltaCriar: quantas((linha) => linha.situacao === "Falta criar"),
  };
}

/** Texto do detalhe da linha: "v1.0 · leram 3 de 6 · último registro 10/11". */
export function detalheDaLinha(
  pop: ProcedimentoOperacionalPadronizado | undefined,
  leitura: { lidos: number; total: number } | undefined,
  ultimo: RegistroPop | undefined
): string {
  if (!pop) return "sem versão";
  const partes = [`v${pop.versao || "—"}`];
  if (leitura && leitura.total > 0 && popVigente(pop)) partes.push(`leram ${leitura.lidos} de ${leitura.total}`);
  if (ultimo) partes.push(`último registro ${dataCurta(ultimo.dataHora)}`);
  return partes.join(" · ");
}

// ===== Montagem da lista (conjunto da norma + outros POPs) =====

export type EntradaDaLista = {
  empresa: Pick<Empresa, "normasAplicadas" | "pops">;
  hoje?: string;
  comprovantes?: ComprovanteTerceiro[];
  ncs?: EntradaDaAcao["ncs"];
  registros?: RegistroPop[];
  colaboradores?: Colaborador[];
  leituras?: LeituraPop[];
  podeAprovar: boolean;
  /** Mostra também os arquivados em "Outros". */
  comArquivados?: boolean;
};

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] || nome;

export type LinhaComDetalhe = LinhaDaLista & { detalhe: string };

export function montarLinhaDoPop(
  pop: ProcedimentoOperacionalPadronizado | undefined,
  definicao: DefinicaoPopDoConjunto | undefined,
  entrada: EntradaDaLista
): LinhaComDetalhe {
  const hoje = entrada.hoje || hojeISO();
  const vigente = popVigente(pop);
  const leitura =
    pop && vigente && (entrada.colaboradores || []).length
      ? leituraDaVersao(pop.id, vigente.versao, entrada.colaboradores || [], entrada.leituras || [])
      : undefined;
  const faltam = leitura ? leitura.linhas.filter((linha) => !linha.lido).map((linha) => primeiroNome(linha.colaborador.nome)) : [];
  const acao = proximaAcaoDoPop({
    pop,
    definicao,
    hoje,
    comprovantes: entrada.comprovantes,
    ncs: entrada.ncs,
    registros: entrada.registros,
    leituraPendente: leitura ? { lidos: leitura.lidos, total: leitura.total, faltam } : undefined,
    podeAprovar: entrada.podeAprovar,
  });
  return {
    chave: pop?.id || definicao?.catalogoId || "",
    codigo: pop ? pop.codigo || "" : definicao?.codigo || "",
    pop,
    definicao,
    titulo: pop?.titulo || definicao?.titulo || "POP sem título",
    situacao: situacaoDeGestao(pop, hoje),
    acao,
    detalhe: detalheDaLinha(pop, leitura ? { lidos: leitura.lidos, total: leitura.total } : undefined, pop ? ultimoRegistroDoPop(entrada.registros, pop.id) : undefined),
  };
}

/** "Outros POPs": por código (POP-05, POP-06…, números como números); sem código, no fim, por título. */
export function ordenarPorCodigo<T extends { codigo?: string; titulo: string }>(linhas: T[]): T[] {
  const comparar = (a: string, b: string) => a.localeCompare(b, "pt-BR", { numeric: true, sensitivity: "base" });
  return [...linhas].sort((a, b) => {
    const ca = (a.codigo || "").trim();
    const cb = (b.codigo || "").trim();
    if (ca && cb) return comparar(ca, cb) || comparar(a.titulo, b.titulo);
    if (ca !== cb) return ca ? -1 : 1;
    return comparar(a.titulo, b.titulo);
  });
}

/** Conjunto da norma (um por definição) e "Outros POPs e documentos", cada grupo na ordem da regra. */
export function montarListaDePops(entrada: EntradaDaLista): { conjunto: LinhaComDetalhe[]; outros: LinhaComDetalhe[] } {
  const pops = entrada.empresa.pops || [];
  const definicoes = conjuntoDaEmpresa(entrada.empresa);
  const idsDoConjunto = new Set<string>();
  const conjunto = definicoes.map((definicao) => {
    const pop = popDoConjunto(pops, definicao);
    if (pop) idsDoConjunto.add(pop.id);
    return montarLinhaDoPop(pop, definicao, entrada);
  });
  const outros = pops
    .filter((pop) => !idsDoConjunto.has(pop.id) && (entrada.comArquivados || !pop.arquivado))
    .map((pop) => montarLinhaDoPop(pop, undefined, entrada));
  return { conjunto: ordenarLinhas(conjunto), outros: ordenarPorCodigo(outros) };
}
