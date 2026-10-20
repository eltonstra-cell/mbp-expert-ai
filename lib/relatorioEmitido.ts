// Relatório de visita emitido e assinado. A emissão acontece no SERVIDOR: ele atribui o número (PC-AAAA-NNNN por empresa),
// guarda um instantâneo que nunca muda e, para corrigir, grava a versão 2 mantendo a 1. A assinatura é o nome e o CRN do RT
// cadastrado; NÃO é assinatura digital com certificado ICP-Brasil.
import type { AppDB, Evidencia, InstantaneoDoRelatorio, RelatorioEmitido, UsuarioSistema } from "../types/index.ts";
import { comprovacaoDaCorrecao } from "./fotosDoItem.ts";
import { acessoVigente } from "./validadeDeAcesso.ts";

export const AVISO_SEM_ICP = "Não é assinatura digital com certificado ICP-Brasil.";
export const TEXTO_CRN_PENDENTE = "CRN a preencher";

type Quem = Pick<UsuarioSistema, "perfil" | "status" | "validoAte" | "acessoEncerradoEm"> | null | undefined;

/** Só RT e Administrador emitem. */
export function podeEmitirRelatorio(usuario: Quem): boolean {
  return Boolean(usuario) && usuario!.status !== "Suspenso" && acessoVigente(usuario!) && (usuario!.perfil === "Administrador" || usuario!.perfil === "Consultor/RT");
}

export function formatarNumero(ano: number, sequencia: number): string {
  return `PC-${ano}-${String(sequencia).padStart(4, "0")}`;
}

/** Próxima sequência da empresa no ano: conta os números já usados (a versão 2 não gasta número). */
export function proximaSequencia(relatorios: Pick<RelatorioEmitido, "empresaId" | "ano" | "sequencia">[], empresaId: string, ano: number): number {
  return relatorios.filter((item) => item.empresaId === empresaId && item.ano === ano).reduce((maior, item) => Math.max(maior, item.sequencia), 0) + 1;
}

export function versoesDaVisita(relatorios: RelatorioEmitido[], visitaId: string): RelatorioEmitido[] {
  return relatorios.filter((item) => item.visitaId === visitaId).sort((a, b) => a.versao - b.versao);
}

export function ultimaVersao(relatorios: RelatorioEmitido[], visitaId: string): RelatorioEmitido | undefined {
  const lista = versoesDaVisita(relatorios, visitaId);
  return lista[lista.length - 1];
}

/** Fotos citadas em relatório emitido: ficam marcadas e fora da revisão e do descarte da guarda. Nada é apagado. */
export function evidenciasEmRelatorioEmitido(relatorios: RelatorioEmitido[] | undefined): Set<string> {
  const ids = new Set<string>();
  for (const relatorio of relatorios || []) for (const ev of relatorio.instantaneo.evidencias) ids.add(ev.id);
  return ids;
}

/** O servidor recoloca evidências citadas em relatório emitido que sumiram de uma lista recebida. */
export function preservarEvidenciasEmRelatorio(atuais: Evidencia[], resultado: Evidencia[], relatorios: RelatorioEmitido[] | undefined): Evidencia[] {
  const protegidas = evidenciasEmRelatorioEmitido(relatorios);
  if (protegidas.size === 0) return resultado;
  const presentes = new Set(resultado.map((ev) => ev.id));
  const faltando = atuais.filter((ev) => protegidas.has(ev.id) && !presentes.has(ev.id));
  return faltando.length ? [...resultado, ...faltando] : resultado;
}

/** Instantâneo montado dos dados do servidor (não do que o navegador mandou). */
export function montarInstantaneo(data: AppDB, visitaId: string): InstantaneoDoRelatorio | null {
  const visita = data.visitas.find((item) => item.id === visitaId);
  const empresa = visita ? data.empresas[visita.empresaId] : undefined;
  if (!visita || !empresa) return null;
  const itens = visita.checklist || [];
  const conformes = itens.filter((item) => item.status === "Conforme").length;
  const naoConformes = itens.filter((item) => item.status === "Não Conforme").length;
  const respondidos = conformes + naoConformes;
  const evidencias = (data.evidencias || []).filter((ev) => ev.visitaId === visita.id);
  const ncs = (data.ncs || []).filter((nc) => nc.visitaId === visita.id && !nc.inativaNoChecklist);
  return {
    empresa: { nome: empresa.nomeFantasia || empresa.razaoSocial, cnpj: empresa.cnpj, municipio: empresa.municipio, uf: empresa.uf },
    visita: { id: visita.id, data: visita.data, responsavel: visita.responsavel, observacoes: visita.observacoes || "", conclusao: visita.conclusao || "" },
    conformidade: { conformes, naoConformes, respondidos, percentual: respondidos ? Math.round((conformes / respondidos) * 100) : null },
    itens: itens.map((item) => ({ id: item.id, ambiente: item.ambiente, titulo: item.titulo, categoria: item.categoria, status: item.status, observacao: item.observacao || "", criticidade: item.criticidade })),
    ncs: ncs.map((nc) => ({
      id: nc.id,
      titulo: nc.titulo,
      ambiente: nc.ambiente,
      criticidade: nc.criticidade,
      status: nc.status,
      observacao: nc.observacao || "",
      acaoCorretiva: nc.acaoCorretiva,
      responsavelAcao: nc.responsavelAcao,
      prazo: nc.prazo,
      resolvidaEm: nc.resolvidaEm,
      semComprovacao: comprovacaoDaCorrecao(nc, evidencias).semComprovacao,
    })),
    evidencias: evidencias
      .filter((ev) => ev.tipo === "Foto")
      .map((ev) => ({ id: ev.id, tipo: ev.tipo, ambiente: ev.ambiente, descricao: ev.descricao, criadoEm: ev.criadoEm, registradoPorNome: ev.registradoPorNome, blobPathname: ev.blobPathname, papel: ev.papel, ncId: ev.ncId, checklistItemId: ev.checklistItemId })),
  };
}

export type PedidoDeEmissao = {
  visitaId: string;
  /** Emitir a versão seguinte de um relatório já emitido (correção posterior). */
  novaVersao?: boolean;
  motivo?: string;
};

export type Emissor = Pick<UsuarioSistema, "id" | "nome" | "perfil" | "crn" | "status" | "validoAte" | "acessoEncerradoEm">;

export type ResultadoDaEmissao = { ok: true; relatorio: RelatorioEmitido; relatorios: RelatorioEmitido[] } | { ok: false; erro: string; status: 400 | 403 | 404 | 409 };

/** Monta a nova linha da lista de relatórios emitidos. Nunca altera uma já emitida. */
export function emitir(data: AppDB, pedido: PedidoDeEmissao, emissor: Emissor | null, agora: Date, novoId: string, nomeLocal?: string): ResultadoDaEmissao {
  if (emissor && !podeEmitirRelatorio(emissor)) return { ok: false, erro: "Só o RT e o Administrador emitem relatório.", status: 403 };
  const visita = data.visitas.find((item) => item.id === pedido.visitaId);
  if (!visita) return { ok: false, erro: "Visita não encontrada.", status: 404 };
  if (emissor && emissor.perfil !== "Administrador" && !(emissor as UsuarioSistema).empresaIds?.includes(visita.empresaId)) {
    return { ok: false, erro: "Você não tem acesso a esta empresa.", status: 403 };
  }
  const instantaneo = montarInstantaneo(data, visita.id);
  if (!instantaneo) return { ok: false, erro: "Não foi possível montar o relatório desta visita.", status: 404 };
  const relatorios = data.relatoriosEmitidos || [];
  const anterior = ultimaVersao(relatorios, visita.id);
  if (anterior && !pedido.novaVersao) {
    return { ok: false, erro: `Esta visita já tem o relatório ${anterior.numero} (versão ${anterior.versao}). Para corrigir, emita a versão ${anterior.versao + 1}.`, status: 409 };
  }
  if (!anterior && pedido.novaVersao) return { ok: false, erro: "Ainda não há relatório emitido desta visita.", status: 409 };
  if (anterior && !(pedido.motivo || "").trim()) return { ok: false, erro: "Informe o motivo da nova versão.", status: 400 };

  const ano = Number(new Date(agora.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 4));
  const sequencia = anterior ? anterior.sequencia : proximaSequencia(relatorios, visita.empresaId, anterior ? (anterior as RelatorioEmitido).ano : ano);
  const anoDoNumero = anterior ? anterior.ano : ano;
  const crn = (emissor?.crn || "").trim();
  const relatorio: RelatorioEmitido = {
    id: novoId,
    empresaId: visita.empresaId,
    visitaId: visita.id,
    numero: formatarNumero(anoDoNumero, sequencia),
    ano: anoDoNumero,
    sequencia,
    versao: anterior ? anterior.versao + 1 : 1,
    emitidoEm: agora.toISOString(),
    emitidoPorId: emissor?.id,
    assinatura: {
      nome: emissor?.nome || nomeLocal || "RT",
      cargo: emissor?.perfil === "Administrador" ? "Administrador" : "Responsável técnico",
      crn: crn || TEXTO_CRN_PENDENTE,
      crnPendente: !crn,
    },
    aviso: AVISO_SEM_ICP,
    ...(anterior ? { motivoDaNovaVersao: (pedido.motivo || "").trim() } : {}),
    instantaneo,
  };
  return { ok: true, relatorio, relatorios: [...relatorios, relatorio] };
}

export type ArmazemDeEmissao = {
  /** Lê o estado e a versão atual dele. */
  ler: () => Promise<{ data: AppDB; versao: string }>;
  /** Grava a lista só se a versão ainda for a lida (comparar e trocar). Devolve false se mudou no meio. */
  gravar: (relatorios: RelatorioEmitido[], versaoEsperada: string) => Promise<boolean>;
};

/**
 * Emite com comparar-e-trocar: se outra emissão (ou outro salvamento) mudou o estado no meio, lê de novo e refaz,
 * então duas pessoas emitindo ao mesmo tempo nunca recebem o mesmo número.
 */
export async function emitirNoArmazem(armazem: ArmazemDeEmissao, pedido: PedidoDeEmissao, emissor: Emissor | null, agora: () => Date, novoId: () => string, nomeLocal?: string, tentativas = 8): Promise<ResultadoDaEmissao> {
  for (let i = 0; i < tentativas; i += 1) {
    const { data, versao } = await armazem.ler();
    const resultado = emitir(data, pedido, emissor, agora(), novoId(), nomeLocal);
    if (!resultado.ok) return resultado;
    if (await armazem.gravar(resultado.relatorios, versao)) return resultado;
  }
  return { ok: false, erro: "Muitas emissões ao mesmo tempo. Tente de novo.", status: 409 };
}
