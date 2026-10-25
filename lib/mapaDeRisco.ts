// Mapa de risco por ambiente: UMA cor por ambiente, derivada de uma regra explícita e visível, calculada só de dados registrados.
// A regra é do APP (critério do app, não exigência de norma): não usa limite de norma, não tem nota de corte e a cor NÃO altera o
// checklist nem decide ação; é informação, quem decide é o RT. Sem dado, a cor é cinza ("sem dados"); nunca se inventa cor.
import { chaveDoCriterio } from "./actionPlan.ts";
import { mesmasPerguntas, ncAberta, pontuacaoDosItens, prazoVencido, ROTULO_CRITERIO_DO_APP, type ItemDoRelatorio, type NcDoRelatorio, type PontuacaoDoSetor, type VisitaDoRelatorio } from "./relatorioDaVisita.ts";

export type CorDoMapa = "vermelho" | "laranja" | "amarelo" | "azul" | "cinza";

export const ROTULO_DA_COR: Record<CorDoMapa, string> = {
  vermelho: "Vermelho",
  laranja: "Laranja",
  amarelo: "Amarelo",
  azul: "Azul claro",
  cinza: "Sem dados",
};

/** A regra, escrita por extenso (aparece na tela e no relatório). A primeira que valer define a cor. */
export const REGRA_DA_COR: { cor: CorDoMapa; texto: string }[] = [
  { cor: "cinza", texto: "Cinza (sem dados): nenhum item do ambiente foi avaliado (conforme ou não conforme) em nenhuma visita." },
  { cor: "vermelho", texto: "Vermelho: há não conformidade CRÍTICA aberta neste ambiente." },
  { cor: "laranja", texto: "Laranja: há correção vencida (prazo passou) ou reincidência (o mesmo problema aberto em 2 visitas ou mais)." },
  { cor: "amarelo", texto: "Amarelo: há não conformidade aberta (importante ou leve) sem as condições acima." },
  { cor: "azul", texto: "Azul claro: o ambiente foi avaliado e não há não conformidade aberta." },
];
export const TITULO_DA_REGRA = `Regra da cor (${ROTULO_CRITERIO_DO_APP}). A pontuação do ambiente aparece ao lado, mas não entra na cor: o app não tem nota de corte.`;

export type CartaoDeRisco = {
  ambiente: string;
  cor: CorDoMapa;
  /** Uma linha: "1 NC crítica aberta, 2 correções vencidas". */
  motivo: string;
  /** Pontuação do ambiente na última visita em que foi avaliado (informação; não decide a cor). */
  pontuacao: (PontuacaoDoSetor & { data: string }) | null;
  tendencia: { serie: { data: string; percentual: number }[]; sentido: "subiu" | "caiu" | "igual" | null; texto: string };
  /** NCs abertas do ambiente (todas as visitas da empresa); tocar no cartão mostra estas. */
  ncsAbertas: NcDoRelatorio[];
  ultimaVisita: string;
};

const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/** A cor e o motivo de um ambiente. `reincidentes` = chaves de critério abertas em 2 visitas ou mais. */
export function corDoAmbiente(entrada: { ncsAbertas: NcDoRelatorio[]; hoje: string; reincidentes: Set<string>; teveAvaliacao: boolean }): { cor: CorDoMapa; motivo: string } {
  if (!entrada.teveAvaliacao && entrada.ncsAbertas.length === 0) return { cor: "cinza", motivo: "sem dados" };
  const criticas = entrada.ncsAbertas.filter((nc) => nc.criticidade === "Crítica").length;
  const vencidas = entrada.ncsAbertas.filter((nc) => prazoVencido(nc.prazo, entrada.hoje)).length;
  const reincidentes = entrada.ncsAbertas.filter((nc) => entrada.reincidentes.has(chaveDoCriterio(nc))).length;
  const partes = [
    criticas > 0 && plural(criticas, "NC crítica aberta", "NCs críticas abertas"),
    vencidas > 0 && plural(vencidas, "correção vencida", "correções vencidas"),
    reincidentes > 0 && plural(reincidentes, "reincidência", "reincidências"),
  ].filter(Boolean) as string[];
  if (criticas > 0) return { cor: "vermelho", motivo: partes.join(", ") };
  if (vencidas > 0 || reincidentes > 0) return { cor: "laranja", motivo: partes.join(", ") };
  if (entrada.ncsAbertas.length > 0) return { cor: "amarelo", motivo: plural(entrada.ncsAbertas.length, "NC aberta", "NCs abertas") };
  return { cor: "azul", motivo: "nenhuma NC aberta" };
}

const ordem = (a: VisitaDoRelatorio, b: VisitaDoRelatorio) => a.data.localeCompare(b.data) || (a.criadoEm || "").localeCompare(b.criadoEm || "");

/** Critérios com NC aberta que apareceram em 2 visitas ou mais da empresa (a atual e as anteriores). */
export function criteriosReincidentes(ncs: NcDoRelatorio[]): Set<string> {
  const visitasPorCriterio = new Map<string, Set<string>>();
  for (const nc of ncs) {
    if (nc.inativaNoChecklist || nc.canceladaPeloUsuarioEm) continue;
    const chave = chaveDoCriterio(nc);
    visitasPorCriterio.set(chave, (visitasPorCriterio.get(chave) || new Set<string>()).add(nc.visitaId));
  }
  return new Set([...visitasPorCriterio.entries()].filter(([, visitas]) => visitas.size >= 2).map(([chave]) => chave));
}

/** Pontuação por visita do ambiente, só nas visitas COMPARÁVEIS com a mais recente (mesmas perguntas); menos de 2 = sem visita comparável. */
export function tendenciaDoAmbiente(ambiente: string, visitas: VisitaDoRelatorio[], limite = 6): CartaoDeRisco["tendencia"] {
  const comItens = visitas
    .filter((visita) => !visita.arquivada)
    .map((visita) => ({ visita, itens: (visita.checklist || []).filter((item) => item.ambiente === ambiente) }))
    .filter((registro) => registro.itens.length > 0)
    .sort((a, b) => ordem(b.visita, a.visita));
  const ultima = comItens[0];
  if (!ultima) return { serie: [], sentido: null, texto: "sem visita comparável" };
  const comparaveis = comItens.filter((registro) => mesmasPerguntas(registro.itens, ultima.itens) && pontuacaoDosItens(ambiente, registro.itens).avaliados > 0).slice(0, limite).reverse();
  const serie = comparaveis.map((registro) => ({ data: registro.visita.data, percentual: pontuacaoDosItens(ambiente, registro.itens).percentual as number }));
  if (serie.length < 2) return { serie, sentido: null, texto: "sem visita comparável" };
  const diferenca = serie[serie.length - 1].percentual - serie[serie.length - 2].percentual;
  const sentido = diferenca > 0 ? "subiu" : diferenca < 0 ? "caiu" : "igual";
  return { serie, sentido, texto: sentido === "igual" ? "igual à visita anterior" : `${sentido === "subiu" ? "subiu" : "caiu"} ${Math.abs(diferenca)} p.p. desde a visita anterior` };
}

export function mapaDeRisco(entrada: { empresaId: string; visitas: VisitaDoRelatorio[]; ncs: NcDoRelatorio[]; hoje: string; ambientesCadastrados?: string[] }): CartaoDeRisco[] {
  const visitas = entrada.visitas.filter((visita) => visita.empresaId === entrada.empresaId && !visita.arquivada);
  const ncs = entrada.ncs.filter((nc) => nc.empresaId === entrada.empresaId);
  const nomes: string[] = [...(entrada.ambientesCadastrados || [])];
  for (const visita of visitas) for (const item of visita.checklist || []) if (!nomes.includes(item.ambiente)) nomes.push(item.ambiente);
  for (const nc of ncs) if (ncAberta(nc) && !nomes.includes(nc.ambiente)) nomes.push(nc.ambiente);
  const reincidentes = criteriosReincidentes(ncs);
  return nomes.map((ambiente): CartaoDeRisco => {
    const abertas = ncs.filter((nc) => nc.ambiente === ambiente && ncAberta(nc));
    const doAmbiente = visitas
      .map((visita) => ({ visita, itens: (visita.checklist || []).filter((item: ItemDoRelatorio) => item.ambiente === ambiente) }))
      .filter((registro) => registro.itens.length > 0)
      .sort((a, b) => ordem(b.visita, a.visita));
    const avaliada = doAmbiente.find((registro) => pontuacaoDosItens(ambiente, registro.itens).avaliados > 0);
    const { cor, motivo } = corDoAmbiente({ ncsAbertas: abertas, hoje: entrada.hoje, reincidentes, teveAvaliacao: Boolean(avaliada) });
    return {
      ambiente,
      cor,
      motivo,
      pontuacao: avaliada ? { ...pontuacaoDosItens(ambiente, avaliada.itens), data: avaliada.visita.data } : null,
      tendencia: tendenciaDoAmbiente(ambiente, visitas),
      ncsAbertas: abertas,
      ultimaVisita: doAmbiente[0]?.visita.data || "",
    };
  });
}

/** O cartão como vai para o relatório emitido: só o essencial das NCs (sem texto longo). */
export type CartaoDeRiscoResumido = Omit<CartaoDeRisco, "ncsAbertas"> & { ncsAbertas: { titulo: string; criticidade: string; status: string; prazo: string; responsavel: string }[] };

export const cartaoParaRelatorio = (cartao: CartaoDeRisco): CartaoDeRiscoResumido => ({
  ...cartao,
  ncsAbertas: cartao.ncsAbertas.map((nc) => ({ titulo: nc.titulo, criticidade: nc.criticidade, status: nc.status, prazo: nc.prazo || "", responsavel: nc.responsavelAcao || "" })),
});

/** Do mais urgente ao menos: vermelho, laranja, amarelo, azul, cinza; empate em ordem alfabética. */
export function ordenarPorUrgencia(cartoes: CartaoDeRisco[]): CartaoDeRisco[] {
  const peso: Record<CorDoMapa, number> = { vermelho: 0, laranja: 1, amarelo: 2, azul: 3, cinza: 4 };
  return [...cartoes].sort((a, b) => peso[a.cor] - peso[b.cor] || a.ambiente.localeCompare(b.ambiente, "pt-BR"));
}
