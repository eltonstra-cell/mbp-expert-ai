import type { ProcedimentoOperacionalPadronizado } from "@/types";

export type SituacaoRevisaoPOP = {
  label: "Em elaboração" | "Em revisão" | "Inativo" | "Revisão não definida" | "Revisão vencida" | "Revisão próxima" | "Em dia";
  classe: string;
};

export const SUGESTOES_POPS_MANUAL = [
  {
    codigo: "POP-01",
    titulo: "Higienização de instalações, equipamentos e móveis",
    programaRelacionado: "Limpeza e higienização/sanitização",
  },
  {
    codigo: "POP-02",
    titulo: "Controle da potabilidade da água",
    programaRelacionado: "Controle da potabilidade da água",
  },
  {
    codigo: "POP-03",
    titulo: "Monitoramento de temperatura de equipamentos",
    programaRelacionado: "Controle de temperatura",
  },
] as const;

export function situacaoRevisaoPOP(
  pop: ProcedimentoOperacionalPadronizado,
  hoje = new Date().toISOString().slice(0, 10)
): SituacaoRevisaoPOP {
  if (pop.status === "Inativo") {
    return { label: "Inativo", classe: "bg-slate-100 text-slate-600" };
  }
  if (pop.status === "Rascunho") {
    return { label: "Em elaboração", classe: "bg-amber-50 text-amber-800" };
  }
  if (pop.status === "Em revisão") {
    return { label: "Em revisão", classe: "bg-blue-50 text-blue-800" };
  }
  if (!pop.proximaRevisao) {
    return { label: "Revisão não definida", classe: "bg-amber-50 text-amber-800" };
  }

  const hojeData = new Date(`${hoje}T12:00:00`);
  const revisaoData = new Date(`${pop.proximaRevisao}T12:00:00`);
  const dias = Math.ceil((revisaoData.getTime() - hojeData.getTime()) / 86400000);

  if (dias < 0) {
    return { label: "Revisão vencida", classe: "bg-red-50 text-red-700" };
  }
  if (dias <= 30) {
    return { label: "Revisão próxima", classe: "bg-amber-50 text-amber-800" };
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
    emPreparacao: pops.filter((pop) => pop.status === "Rascunho" || pop.status === "Em revisão").length,
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
export function popSugeridoParaNc(nc: { categoria: string }): SugestaoPop | null {
  return SUGESTOES_POPS_MANUAL.find((sugestao) => chave(sugestao.programaRelacionado) === chave(nc.categoria)) || null;
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
  if (pop.status === "Em revisão") return "em-revisao";
  if (pop.status === "Inativo") return "inativo";
  return "rascunho";
}

export function popsDaVisita(
  ncs: { numero: number; categoria: string }[],
  pops: ProcedimentoOperacionalPadronizado[]
) {
  const linhas: LinhaPopVisita[] = [];
  const semPop: number[] = [];
  ncs.forEach((nc) => {
    const sugestao = popSugeridoParaNc(nc);
    if (!sugestao) {
      semPop.push(nc.numero);
      return;
    }
    const existente = linhas.find((linha) => linha.sugestao.codigo === sugestao.codigo);
    if (existente) {
      existente.ncs.push(nc.numero);
      return;
    }
    const pop = pops.find((registro) => chave(registro.titulo) === chave(sugestao.titulo) || chave(registro.programaRelacionado) === chave(sugestao.programaRelacionado));
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
  const copia: ProcedimentoOperacionalPadronizado = {
    ...origem,
    id: novoId,
    codigo: "",
    titulo: `${origem.titulo} (cópia)`,
    versao: "1.0",
    status: "Rascunho",
    arquivado: false,
  };
  const posicao = pops.findIndex((pop) => pop.id === id);
  return [...pops.slice(0, posicao + 1), copia, ...pops.slice(posicao + 1)];
}

export function arquivarPop(
  pops: ProcedimentoOperacionalPadronizado[],
  id: string,
  arquivado: boolean
): ProcedimentoOperacionalPadronizado[] {
  return pops.map((pop) => (pop.id === id ? { ...pop, arquivado } : pop));
}

export function popsAtivos(pops: ProcedimentoOperacionalPadronizado[]): ProcedimentoOperacionalPadronizado[] {
  return pops.filter((pop) => !pop.arquivado);
}
