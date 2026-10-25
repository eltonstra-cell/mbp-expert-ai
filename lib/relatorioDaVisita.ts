// Relatório que se monta sozinho: só CONTAS sobre dados registrados na visita (nada de parecer, conclusão técnica ou recomendação).
// Tudo aqui é critério do APP, não exigência de norma: a fórmula aparece escrita no relatório e o app não inventa faixa, nota de corte
// nem "aprovado/reprovado". Funciona só com os dados locais (sem rede) e é função pura, então vale igual no aparelho e no servidor.
import { historicoDaReincidencia } from "./memoriaDoPlano.ts";
import { fonteParaExibir } from "./fonteDaPergunta.ts";
import { linhasDeTemperaturaDoRelatorio } from "./limitesDeTemperatura.ts";
import type { CartaoDeRiscoResumido } from "./mapaDeRisco.ts";

export const ROTULO_CRITERIO_DO_APP = "critério do app, não exigência de norma";

export const FORMULA_DA_PONTUACAO =
  "Pontuação do setor = itens conformes ÷ (itens conformes + itens não conformes), em %. “Não se aplica” e itens sem resposta ficam fora da conta; os sem resposta aparecem à parte e nunca valem como conformes. Uma não conformidade nunca é escondida: ela entra na conta e aparece na lista de correções.";

export const FORMULA_DA_COMPARACAO =
  "Compara o setor com a visita anterior só quando o setor foi avaliado nas duas visitas com exatamente as mesmas perguntas. Resolvida = estava não conforme antes e agora está conforme; mantida = não conforme nas duas; nova = não conforme agora e não estava antes. Onde não dá para comparar, o relatório diz “sem visita comparável” e não estima.";

type Resposta = "Pendente" | "Conforme" | "Não Conforme" | "Não se aplica";

export type ItemDoRelatorio = {
  id: string;
  ambiente: string;
  titulo: string;
  categoria: string;
  status: string;
  criticidade?: string;
  criticidadeSugerida?: string;
  referencia?: string;
  lote?: unknown;
  porVoz?: boolean;
  temperatura?: unknown;
  avancouSozinho?: boolean;
};

export type VisitaDoRelatorio = {
  id: string;
  empresaId: string;
  data: string;
  criadoEm?: string;
  checklist?: ItemDoRelatorio[];
  ambientes?: string[];
  arquivada?: boolean;
};

export type NcDoRelatorio = {
  id: string;
  empresaId: string;
  visitaId: string;
  ambiente: string;
  categoria: string;
  titulo: string;
  criticidade: string;
  referencia?: string;
  status: string;
  acaoCorretiva?: string;
  responsavelAcao?: string;
  prazo?: string;
  inativaNoChecklist?: boolean;
  canceladaPeloUsuarioEm?: string;
  criadoEm?: string;
};

// ===== Pontuação por setor =====

export type PontuacaoDoSetor = {
  ambiente: string;
  total: number;
  conformes: number;
  naoConformes: number;
  naoSeAplica: number;
  semResposta: number;
  /** Conformes + não conformes: o denominador da pontuação. */
  avaliados: number;
  /** Conformes ÷ avaliados, em %; null quando nada foi avaliado (nunca 0% nem 100% por falta de dado). */
  percentual: number | null;
};

const contagem = (itens: { status: string }[]) => {
  const conformes = itens.filter((item) => item.status === "Conforme").length;
  const naoConformes = itens.filter((item) => item.status === "Não Conforme").length;
  const naoSeAplica = itens.filter((item) => item.status === "Não se aplica").length;
  const semResposta = itens.filter((item) => item.status === "Pendente" || !item.status).length;
  const avaliados = conformes + naoConformes;
  return { total: itens.length, conformes, naoConformes, naoSeAplica, semResposta, avaliados, percentual: avaliados ? Math.round((conformes / avaliados) * 100) : null };
};

export const pontuacaoDosItens = (ambiente: string, itens: { status: string }[]): PontuacaoDoSetor => ({ ambiente, ...contagem(itens) });

/** Um quadro por setor, na ordem em que o setor aparece na visita. */
export function pontuacaoPorSetor(itens: ItemDoRelatorio[]): PontuacaoDoSetor[] {
  const ordem: string[] = [];
  for (const item of itens) if (!ordem.includes(item.ambiente)) ordem.push(item.ambiente);
  return ordem.map((ambiente) => pontuacaoDosItens(ambiente, itens.filter((item) => item.ambiente === ambiente)));
}

// ===== Resumo da visita =====

export type CorrecaoAbertaDoResumo = { titulo: string; ambiente: string; criticidade: string; prazo: string; responsavel: string; vencida: boolean };

export type ResumoDaVisita = {
  data: string;
  ambientes: string[];
  total: number;
  /** Itens com qualquer resposta (inclui "Não se aplica"). */
  respondidos: number;
  conformes: number;
  naoConformes: number;
  naoSeAplica: number;
  semResposta: number;
  correcoesAbertas: CorrecaoAbertaDoResumo[];
};

export const ncAberta = (nc: Pick<NcDoRelatorio, "status" | "inativaNoChecklist" | "canceladaPeloUsuarioEm">): boolean =>
  nc.status !== "Resolvida" && !nc.inativaNoChecklist && !nc.canceladaPeloUsuarioEm;

export const prazoVencido = (prazo: string | undefined, hoje: string): boolean => Boolean(prazo) && (prazo as string) < hoje;

export function resumoDaVisita(visita: VisitaDoRelatorio, ncsDaVisita: NcDoRelatorio[], hoje: string): ResumoDaVisita {
  const itens = visita.checklist || [];
  const c = contagem(itens);
  const ambientes = visita.ambientes?.length ? visita.ambientes : [...new Set(itens.map((item) => item.ambiente))];
  return {
    data: visita.data,
    ambientes,
    total: c.total,
    respondidos: c.total - c.semResposta,
    conformes: c.conformes,
    naoConformes: c.naoConformes,
    naoSeAplica: c.naoSeAplica,
    semResposta: c.semResposta,
    correcoesAbertas: ncsDaVisita.filter(ncAberta).map((nc) => ({ titulo: nc.titulo, ambiente: nc.ambiente, criticidade: nc.criticidade, prazo: nc.prazo || "", responsavel: nc.responsavelAcao || "", vencida: prazoVencido(nc.prazo, hoje) })),
  };
}

// ===== Comparação com a visita anterior =====

const chaveDaPergunta = (item: { categoria: string; titulo: string }) => `${item.categoria}|${item.titulo}`.trim().toLocaleLowerCase("pt-BR");

const ordemDaVisita = (a: VisitaDoRelatorio, b: VisitaDoRelatorio) => a.data.localeCompare(b.data) || (a.criadoEm || "").localeCompare(b.criadoEm || "");

/** Visitas da mesma empresa ANTERIORES à visita, da mais nova para a mais antiga (arquivadas não contam). */
export function visitasAnterioresDe(visita: VisitaDoRelatorio, todas: VisitaDoRelatorio[]): VisitaDoRelatorio[] {
  return todas
    .filter((outra) => outra.id !== visita.id && outra.empresaId === visita.empresaId && !outra.arquivada && ordemDaVisita(outra, visita) < 0)
    .sort((a, b) => ordemDaVisita(b, a));
}

/** Mesmas perguntas (categoria + título) nas duas listas, sem sobra nem falta. */
export function mesmasPerguntas(a: { categoria: string; titulo: string }[], b: { categoria: string; titulo: string }[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const conjuntoA = new Set(a.map(chaveDaPergunta));
  const conjuntoB = new Set(b.map(chaveDaPergunta));
  if (conjuntoA.size !== conjuntoB.size) return false;
  for (const chave of conjuntoA) if (!conjuntoB.has(chave)) return false;
  return true;
}

export type MotivoSemComparacao = "setor novo" | "perguntas mudaram" | "sem itens avaliados";

export type ComparacaoDoSetor =
  | {
      ambiente: string;
      comparavel: true;
      visitaDaComparacao: string;
      anterior: number;
      atual: number;
      /** Diferença em pontos percentuais (atual − anterior). */
      diferenca: number;
      resolvidas: number;
      mantidas: number;
      novas: number;
    }
  | { ambiente: string; comparavel: false; motivo: MotivoSemComparacao; texto: "sem visita comparável" };

export function compararComAnterior(visita: VisitaDoRelatorio, todas: VisitaDoRelatorio[]): ComparacaoDoSetor[] {
  const itensAtuais = visita.checklist || [];
  const anteriores = visitasAnterioresDe(visita, todas);
  const ambientes: string[] = [];
  for (const item of itensAtuais) if (!ambientes.includes(item.ambiente)) ambientes.push(item.ambiente);
  return ambientes.map((ambiente): ComparacaoDoSetor => {
    const atuais = itensAtuais.filter((item) => item.ambiente === ambiente);
    const contaAtual = contagem(atuais);
    let motivo: MotivoSemComparacao = "setor novo";
    for (const anterior of anteriores) {
      const antes = (anterior.checklist || []).filter((item) => item.ambiente === ambiente);
      if (antes.length === 0) continue;
      if (!mesmasPerguntas(antes, atuais)) {
        motivo = "perguntas mudaram";
        continue;
      }
      const contaAntes = contagem(antes);
      if (contaAntes.avaliados === 0 || contaAtual.avaliados === 0) {
        motivo = "sem itens avaliados";
        continue;
      }
      const ncAntes = new Set(antes.filter((item) => item.status === "Não Conforme").map(chaveDaPergunta));
      const ncAgora = new Set(atuais.filter((item) => item.status === "Não Conforme").map(chaveDaPergunta));
      const conformesAgora = new Set(atuais.filter((item) => item.status === "Conforme").map(chaveDaPergunta));
      return {
        ambiente,
        comparavel: true,
        visitaDaComparacao: anterior.data,
        anterior: contaAntes.percentual as number,
        atual: contaAtual.percentual as number,
        diferenca: (contaAtual.percentual as number) - (contaAntes.percentual as number),
        resolvidas: [...ncAntes].filter((chave) => conformesAgora.has(chave)).length,
        mantidas: [...ncAntes].filter((chave) => ncAgora.has(chave)).length,
        novas: [...ncAgora].filter((chave) => !ncAntes.has(chave)).length,
      };
    }
    return { ambiente, comparavel: false, motivo, texto: "sem visita comparável" };
  });
}

// ===== Reincidências =====

export type ReincidenciaDoRelatorio = { titulo: string; ambiente: string; vezes: number; acaoQueFuncionou: string };

export function reincidenciasDaVisita(ncsDaVisita: NcDoRelatorio[], todasAsNcs: NcDoRelatorio[], dataDaVisita: (visitaId: string) => string): ReincidenciaDoRelatorio[] {
  const comEmpresa = (nc: NcDoRelatorio) => ({ ...nc, empresaId: nc.empresaId });
  return ncsDaVisita
    .filter((nc) => !nc.inativaNoChecklist)
    .map((nc) => ({ nc, historico: historicoDaReincidencia(comEmpresa(nc), todasAsNcs.map(comEmpresa), dataDaVisita) }))
    .filter(({ historico }) => historico.vezes >= 2)
    .map(({ nc, historico }) => ({ titulo: nc.titulo, ambiente: nc.ambiente, vezes: historico.vezes, acaoQueFuncionou: historico.acaoQueFuncionou }));
}

// ===== Marcas de registro honesto =====

export type MarcasDeRegistro = {
  /** Itens marcados como Conforme em lote ("marcar o restante do ambiente"). */
  lote: number;
  /** Respostas que vieram de ditado por voz (conferidas pelo RT). */
  porVoz: number;
  /** Respostas seguidas do avanço automático (a resposta foi do RT; só a tela avançou sozinha). */
  avancoAutomatico: number;
  /** Itens com temperatura medida e classificada pelo app. */
  temperaturaClassificada: number;
  /** NCs cuja gravidade foi a sugerida pelo app e o RT não trocou. */
  gravidadeSugeridaMantida: number;
  naoConformes: number;
};

export function marcasDeRegistro(itens: ItemDoRelatorio[]): MarcasDeRegistro {
  const naoConformes = itens.filter((item) => item.status === "Não Conforme");
  return {
    lote: itens.filter((item) => item.lote).length,
    porVoz: itens.filter((item) => item.porVoz).length,
    avancoAutomatico: itens.filter((item) => item.avancouSozinho && item.status !== "Pendente").length,
    temperaturaClassificada: itens.filter((item) => item.temperatura).length,
    gravidadeSugeridaMantida: naoConformes.filter((item) => item.criticidade && !item.criticidadeSugerida).length,
    naoConformes: naoConformes.length,
  };
}

// ===== Fonte das perguntas =====

export type FonteDasPerguntas = { derivadas: number; parciais: number; semFonte: number };

/** Quantas das perguntas da visita têm fonte registrada (derivada do Manual, parcial) e quantas "Fonte não registrada". */
export function fonteDasPerguntas(itens: { referencia?: string }[]): FonteDasPerguntas {
  const fontes = itens.map((item) => fonteParaExibir(item.referencia));
  return { derivadas: fontes.filter((f) => f.startsWith("Derivada")).length, parciais: fontes.filter((f) => f.startsWith("Parcial")).length, semFonte: fontes.filter((f) => f === "Fonte não registrada").length };
}

// ===== Relatório montado (o mesmo objeto vira o rascunho na tela e o instantâneo emitido) =====

export type RelatorioMontado = {
  formulaDaPontuacao: string;
  formulaDaComparacao: string;
  criterio: string;
  resumo: ResumoDaVisita;
  pontuacao: PontuacaoDoSetor[];
  geral: PontuacaoDoSetor;
  comparacao: ComparacaoDoSetor[];
  reincidencias: ReincidenciaDoRelatorio[];
  marcas: MarcasDeRegistro;
  fontes: FonteDasPerguntas;
  /** Temperaturas medidas, com limite, norma, item e data de conferência ("classificado pelo app, confirmado pelo RT"). */
  temperaturas: string[];
  /** Mapa de risco da empresa no dia (critério do app); preenchido por quem emite ou monta o rascunho. */
  mapa?: CartaoDeRiscoResumido[];
};

export function montarRelatorio(entrada: { visita: VisitaDoRelatorio; visitas: VisitaDoRelatorio[]; ncs: NcDoRelatorio[]; hoje: string }): RelatorioMontado {
  const { visita, visitas, ncs, hoje } = entrada;
  const itens = visita.checklist || [];
  const ncsDaVisita = ncs.filter((nc) => nc.visitaId === visita.id && nc.empresaId === visita.empresaId);
  const dataPorId = new Map(visitas.map((v) => [v.id, v.data]));
  return {
    formulaDaPontuacao: FORMULA_DA_PONTUACAO,
    formulaDaComparacao: FORMULA_DA_COMPARACAO,
    criterio: ROTULO_CRITERIO_DO_APP,
    resumo: resumoDaVisita(visita, ncsDaVisita, hoje),
    pontuacao: pontuacaoPorSetor(itens),
    geral: pontuacaoDosItens("Visita toda", itens),
    comparacao: compararComAnterior(visita, visitas),
    reincidencias: reincidenciasDaVisita(ncsDaVisita, ncs.filter((nc) => nc.empresaId === visita.empresaId), (id) => dataPorId.get(id) || ""),
    marcas: marcasDeRegistro(itens),
    fontes: fonteDasPerguntas(itens),
    temperaturas: linhasDeTemperaturaDoRelatorio(itens as never),
  };
}

// ===== Estado do relatório =====

export type EstadoDoRelatorio = { estado: "Rascunho" } | { estado: "Emitido"; numero: string; versao: number; emitidoEm: string };

/** "Rascunho" até o RT emitir; depois "Emitido" (a versão mais alta). Editar depois de emitido gera outra versão, sem apagar a anterior. */
export function estadoDoRelatorio(emitidos: { visitaId: string; numero: string; versao: number; emitidoEm: string }[] | undefined, visitaId: string): EstadoDoRelatorio {
  const doVisita = (emitidos || []).filter((relatorio) => relatorio.visitaId === visitaId).sort((a, b) => a.versao - b.versao);
  const ultimo = doVisita[doVisita.length - 1];
  return ultimo ? { estado: "Emitido", numero: ultimo.numero, versao: ultimo.versao, emitidoEm: ultimo.emitidoEm } : { estado: "Rascunho" };
}

export const TEXTO_DO_RASCUNHO = "Rascunho para revisão: montado só com os dados registrados na visita. O parecer é seu; o app não escreve parecer.";

export const diferencaEmTexto = (pontos: number): string => (pontos === 0 ? "sem mudança" : `${pontos > 0 ? "+" : "−"}${Math.abs(pontos)} p.p.`);
