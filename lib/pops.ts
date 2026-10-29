import type { MotivoDeMudancaDoPop, ProcedimentoOperacionalPadronizado } from "@/types";
import { hojeLocalISO } from "./dataLocal.ts";
import { CONJUNTO_DA_NORMA, popDoConjunto, popSugeridoParaNcDoConjunto, type DefinicaoPopDoConjunto } from "./popsNorma.ts";

export type SituacaoRevisaoPOP = {
  label: "Em elaboração" | "Em revisão" | "Inativo" | "Revisão não definida" | "Revisão vencida" | "Revisão próxima" | "Em dia";
  classe: string;
};

// Sugestões de POP = conjunto da norma (RDC 216/2004, 4.11.4 a–d). "Controle da potabilidade da água" e
// "Monitoramento de temperatura" deixaram de ser sugeridos como POPs obrigatórios.
export const SUGESTOES_POPS_MANUAL = CONJUNTO_DA_NORMA.map((definicao) => ({
  codigo: definicao.codigo,
  titulo: definicao.titulo,
  programaRelacionado: definicao.programaRelacionado,
  catalogoId: definicao.catalogoId,
}));

export function situacaoRevisaoPOP(
  pop: ProcedimentoOperacionalPadronizado,
  hoje = hojeLocalISO()
): SituacaoRevisaoPOP {
  if (pop.status === "Inativo") {
    return { label: "Inativo", classe: "bg-slate-100 text-slate-600" };
  }
  if (pop.status === "Rascunho") {
    return { label: "Em elaboração", classe: "bg-[#FFE8A3] text-[color:var(--ink)]" };
  }
  if (pop.status === "Em revisão") {
    return { label: "Em revisão", classe: "bg-blue-50 text-blue-800" };
  }
  if (!pop.proximaRevisao) {
    return { label: "Revisão não definida", classe: "bg-[#FFE8A3] text-[color:var(--ink)]" };
  }

  const hojeData = new Date(`${hoje}T12:00:00`);
  const revisaoData = new Date(`${pop.proximaRevisao}T12:00:00`);
  const dias = Math.ceil((revisaoData.getTime() - hojeData.getTime()) / 86400000);

  if (dias < 0) {
    return { label: "Revisão vencida", classe: "bg-red-50 text-red-700" };
  }
  if (dias <= 30) {
    return { label: "Revisão próxima", classe: "bg-[#FFE8A3] text-[color:var(--ink)]" };
  }
  return { label: "Em dia", classe: "bg-emerald-50 text-emerald-800" };
}

export function normalizarPops(
  pops?: ProcedimentoOperacionalPadronizado[]
): ProcedimentoOperacionalPadronizado[] {
  if (!Array.isArray(pops)) return [];
  return pops
    .filter((pop) => pop && (pop.titulo || pop.codigo))
    .map((pop, indice) => ({
      // Os campos novos (conteúdo, aprovação, versões, origem) passam inteiros; só os básicos são normalizados.
      ...pop,
      id: pop.id || `pop-${indice + 1}`,
      codigo: pop.codigo || "",
      titulo: pop.titulo || "",
      versao: pop.versao || "",
      status: pop.status || "Rascunho",
      programaRelacionado: pop.programaRelacionado || "",
      responsavel: pop.responsavel || "",
      proximaRevisao: pop.proximaRevisao || "",
      ...(pop.arquivado ? { arquivado: true } : {}),
    }));
}

function chave(texto: string) {
  return texto.trim().toLocaleLowerCase("pt-BR");
}

export type ResultadoNovoPOP =
  | { ok: true; pops: ProcedimentoOperacionalPadronizado[] }
  | { ok: false; campo: "titulo" | "codigo"; aviso: string };

/** Valida e adiciona um POP novo (mesmas regras do cadastro atual). */
export function adicionarPop(
  pops: ProcedimentoOperacionalPadronizado[],
  codigo: string,
  titulo: string,
  id: string
): ResultadoNovoPOP {
  if (!titulo.trim()) return { ok: false, campo: "titulo", aviso: "Informe o título do POP." };
  if (codigo.trim() && pops.some((pop) => chave(pop.codigo) === chave(codigo))) {
    return { ok: false, campo: "codigo", aviso: "Este código já está sendo utilizado em outro POP." };
  }
  return {
    ok: true,
    pops: [
      ...pops,
      {
        id,
        codigo: codigo.trim(),
        titulo: titulo.trim(),
        versao: "1.0",
        status: "Rascunho",
        programaRelacionado: "",
        responsavel: "",
        proximaRevisao: "",
      },
    ],
  };
}

export function sugestaoJaCriada(
  pops: ProcedimentoOperacionalPadronizado[],
  sugestao: { titulo: string }
): boolean {
  return pops.some((pop) => chave(pop.titulo) === chave(sugestao.titulo));
}

/** Adiciona uma sugestão do Manual; sem código se a numeração já estiver em uso. */
export function adicionarSugestaoPop(
  pops: ProcedimentoOperacionalPadronizado[],
  sugestao: { codigo: string; titulo: string; programaRelacionado: string },
  id: string
): { pops: ProcedimentoOperacionalPadronizado[]; aviso: string } {
  if (sugestaoJaCriada(pops, sugestao)) return { pops, aviso: "" };
  const codigoEmUso = pops.some((pop) => chave(pop.codigo) === chave(sugestao.codigo));
  const codigo = codigoEmUso ? "" : sugestao.codigo;
  return {
    pops: [
      ...pops,
      {
        id,
        codigo,
        titulo: sugestao.titulo,
        versao: "1.0",
        status: "Rascunho",
        programaRelacionado: sugestao.programaRelacionado,
        responsavel: "",
        proximaRevisao: "",
      },
    ],
    aviso: codigo ? "" : "Sugestão adicionada sem código porque essa numeração já estava em uso.",
  };
}

export function resumoPops(pops: ProcedimentoOperacionalPadronizado[], hoje?: string) {
  return {
    aprovados: pops.filter((pop) => pop.status === "Aprovado").length,
    emPreparacao: pops.filter((pop) => pop.status === "Rascunho" || pop.status === "Em revisão" || pop.status === "Aguardando aprovação").length,
    revisaoVencida: pops.filter((pop) => situacaoRevisaoPOP(pop, hoje).label === "Revisão vencida").length,
  };
}

/** Tom da pílula (texto sempre preto) para cada situação de revisão. */
export function tomSituacaoPOP(label: SituacaoRevisaoPOP["label"]): "ok" | "nc" | "pend" | "info" | "na" {
  switch (label) {
    case "Em dia":
      return "ok";
    case "Revisão vencida":
      return "nc";
    case "Em revisão":
      return "info";
    case "Inativo":
      return "na";
    default:
      return "pend";
  }
}

// ===== POPs da visita: NC -> POP sugerido (mapeamento já existente: programa de controle) =====

type SugestaoPop = (typeof SUGESTOES_POPS_MANUAL)[number];

/** O Manual só relaciona POPs a programas de controle; NC de outro critério fica "Sem POP sugerido". */
export function popSugeridoParaNc(nc: { categoria: string; popCatalogoId?: string }, definicoes: DefinicaoPopDoConjunto[] = CONJUNTO_DA_NORMA): SugestaoPop | null {
  // Vínculo escolhido à mão ("Trocar vínculo") vale mais que o padrão pela categoria.
  if (nc.popCatalogoId === "nenhum") return null;
  if (nc.popCatalogoId) {
    const escolhido = definicoes.find((item) => item.catalogoId === nc.popCatalogoId);
    const sugestaoEscolhida = escolhido ? SUGESTOES_POPS_MANUAL.find((sugestao) => sugestao.catalogoId === escolhido.catalogoId) : undefined;
    if (sugestaoEscolhida) return sugestaoEscolhida;
  }
  const definicao = popSugeridoParaNcDoConjunto(nc, definicoes);
  return definicao ? SUGESTOES_POPS_MANUAL.find((sugestao) => sugestao.catalogoId === definicao.catalogoId) || null : null;
}

export type SituacaoPopVisita = "a-criar" | "rascunho" | "em-revisao" | "aprovado" | "inativo";

export type LinhaPopVisita = {
  sugestao: SugestaoPop;
  /** Números das NCs (NC01, NC02...) que motivaram a sugestão. */
  ncs: number[];
  situacao: SituacaoPopVisita;
  popId: string;
};

function situacaoDoPopExistente(pop: ProcedimentoOperacionalPadronizado | undefined): SituacaoPopVisita {
  if (!pop) return "a-criar";
  if (pop.status === "Aprovado") return "aprovado";
  if (pop.status === "Em revisão" || pop.status === "Aguardando aprovação") return "em-revisao";
  if (pop.status === "Inativo") return "inativo";
  return "rascunho";
}

export function popsDaVisita(
  ncs: { numero: number; categoria: string; popCatalogoId?: string }[],
  pops: ProcedimentoOperacionalPadronizado[],
  /** Conjunto da norma da empresa; sem norma aplicada, vem vazio e nenhuma sugestão aparece. */
  definicoes: DefinicaoPopDoConjunto[] = CONJUNTO_DA_NORMA
) {
  const linhas: LinhaPopVisita[] = [];
  const semPop: number[] = [];
  ncs.forEach((nc) => {
    const sugestao = popSugeridoParaNc(nc, definicoes);
    if (!sugestao) {
      semPop.push(nc.numero);
      return;
    }
    const existente = linhas.find((linha) => linha.sugestao.codigo === sugestao.codigo);
    if (existente) {
      existente.ncs.push(nc.numero);
      return;
    }
    const definicao = definicoes.find((item) => item.catalogoId === sugestao.catalogoId);
    const pop = (definicao ? popDoConjunto(pops, definicao) : undefined) || pops.find((registro) => !registro.arquivado && !registro.catalogoId && chave(registro.titulo) === chave(sugestao.titulo));
    linhas.push({ sugestao, ncs: [nc.numero], situacao: situacaoDoPopExistente(pop), popId: pop?.id || "" });
  });
  const ncsComPop = ncs.length - semPop.length;
  return {
    linhas,
    semPop,
    totalNcs: ncs.length,
    ncsComPop,
    aCriar: linhas.filter((linha) => linha.situacao === "a-criar").length,
    rascunho: linhas.filter((linha) => linha.situacao === "rascunho").length,
    aprovados: linhas.filter((linha) => linha.situacao === "aprovado").length,
    /** Pendente = sem POP criado ou ainda em rascunho. */
    pendentes: linhas.filter((linha) => linha.situacao === "a-criar" || linha.situacao === "rascunho").length,
  };
}

/** Cria SOMENTE rascunhos dos POPs que ainda não existem; nunca altera um POP existente. */
export function criarRascunhosFaltantes(
  pops: ProcedimentoOperacionalPadronizado[],
  linhas: LinhaPopVisita[],
  gerarId: () => string
): { pops: ProcedimentoOperacionalPadronizado[]; criados: number } {
  let atual = pops;
  let criados = 0;
  linhas
    .filter((linha) => linha.situacao === "a-criar")
    .forEach((linha) => {
      const resultado = adicionarSugestaoPop(atual, linha.sugestao, gerarId());
      if (resultado.pops !== atual) criados += 1;
      atual = resultado.pops;
    });
  return { pops: atual, criados };
}

// ===== Duplicar / arquivar POP (sem apagar) =====

export function duplicarPop(
  pops: ProcedimentoOperacionalPadronizado[],
  id: string,
  novoId: string
): ProcedimentoOperacionalPadronizado[] {
  const origem = pops.find((pop) => pop.id === id);
  if (!origem) return pops;
  // Dois POPs do mesmo modelo não são permitidos: o POP de modelo (ou do conjunto da norma) não se duplica.
  if (origem.origemModelo || origem.catalogoId) return pops;
  // A cópia nasce Rascunho e NÃO leva aprovação, versões, assinatura, conferência feita nem a revisão da origem.
  const { aprovacao: _aprovacao, versoes: _versoes, versaoCatalogoAprovada: _catalogo, motivoDaVersao: _motivo, conferencia: _conferencia, arquivamento: _arquivamento, inativacao: _inativacao, catalogoId: _catalogoId, ...semHistorico } = origem;
  const copia: ProcedimentoOperacionalPadronizado = {
    ...semHistorico,
    id: novoId,
    codigo: "",
    titulo: `${origem.titulo} (cópia)`,
    versao: "1.0",
    status: "Rascunho",
    proximaRevisao: "",
    arquivado: false,
    ...(origem.origemModelo ? { conferencia: { conferido: false }, itensAConferir: (origem.itensAConferir || []).map((item) => ({ ...item, feito: false })) } : {}),
  };
  const posicao = pops.findIndex((pop) => pop.id === id);
  return [...pops.slice(0, posicao + 1), copia, ...pops.slice(posicao + 1)];
}

/** Um POP do mesmo modelo (catálogo de modelos ou conjunto da norma) já existe na empresa, sem contar o arquivado. */
export function jaTemOutroDoMesmoModelo(pops: ProcedimentoOperacionalPadronizado[], pop: ProcedimentoOperacionalPadronizado): boolean {
  const mesmo = (outro: ProcedimentoOperacionalPadronizado) =>
    outro.id !== pop.id && !outro.arquivado && ((pop.origemModelo && outro.origemModelo?.id === pop.origemModelo.id) || (pop.catalogoId && outro.catalogoId === pop.catalogoId));
  return pops.some((outro) => Boolean(mesmo(outro)));
}

export const AVISO_JA_TEM_DO_MODELO = "Já existe um POP deste modelo nesta empresa. Abra o que existe em vez de criar outro.";

/** Arquivar exige motivo, autor e data (ficam em `arquivamento`); sem motivo nada muda. Desarquivar mantém o registro do arquivamento. */
export function arquivarPop(
  pops: ProcedimentoOperacionalPadronizado[],
  id: string,
  arquivado: boolean,
  mudanca?: MotivoDeMudancaDoPop
): ProcedimentoOperacionalPadronizado[] {
  if (arquivado && !(mudanca?.motivo || "").trim()) return pops;
  return pops.map((pop) => (pop.id === id ? { ...pop, arquivado, ...(arquivado && mudanca ? { arquivamento: { ...mudanca, motivo: mudanca.motivo.trim() } } : {}) } : pop));
}

export function popsAtivos(pops: ProcedimentoOperacionalPadronizado[]): ProcedimentoOperacionalPadronizado[] {
  return pops.filter((pop) => !pop.arquivado);
}
