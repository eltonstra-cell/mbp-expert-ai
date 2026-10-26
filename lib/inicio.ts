// Início (PC): regras puras da tela (sem JSX): visitas recentes, visitas paradas, configuração da empresa e o guia de primeiros passos.
import { diasDeVisitaAberta } from "./visitasLista.ts";
import { palavra, quantidade } from "./plural.ts";
import type { Empresa, Visita } from "../types/index.ts";

export const DIAS_DE_VISITA_PARADA = 30;

type ComData = { data?: string; criadoEm?: string };

/** Da mais recente para a mais antiga (data da visita; empate pela criação). Não altera a lista recebida. */
export function ordenarRecentes<T extends ComData>(visitas: T[]): T[] {
  return [...visitas].sort((a, b) => (b.data || "").localeCompare(a.data || "") || (b.criadoEm || "").localeCompare(a.criadoEm || ""));
}

/** Visitas em andamento, não arquivadas, abertas há mais de 30 dias. */
export function visitasParadas<T extends Pick<Visita, "id" | "status" | "data" | "arquivada">>(visitas: T[], hoje: string, limite = DIAS_DE_VISITA_PARADA): T[] {
  return visitas.filter((visita) => visita.status === "Em andamento" && !visita.arquivada && diasDeVisitaAberta(visita.data, hoje) > limite);
}

export function textoDasParadas(n: number): string {
  return `${quantidade(n, "visita parada", "visitas paradas")} há mais de ${DIAS_DE_VISITA_PARADA} dias`;
}

/** Resumo do cabeçalho de "Visitas recentes" quando está fechado. */
export function resumoDeVisitasRecentes(emAndamento: number, paradas: number): string {
  const base = `${emAndamento} em andamento`;
  return paradas > 0 ? `${base} · ${quantidade(paradas, "parada", "paradas")} há mais de ${DIAS_DE_VISITA_PARADA} dias` : base;
}

export const linhaDaVisita = (numero: number | undefined, data: string): string => `Visita ${numero ?? "—"} · ${data}`;

/** Sem itens no checklist não há barra nem "0 de 0": diz que ainda não há resposta. */
export function textoDeProgresso(respondidos: number, total: number): string {
  return total === 0 ? "ainda sem itens respondidos" : `${respondidos} de ${total} itens respondidos`;
}

export type PassoDeConfiguracao = { chave: "perfil" | "empresa" | "ambientes" | "equipamentos" | "fluxos" | "visita" | "relatorio"; titulo: string; feito: boolean };

export const TITULO_DOS_PASSOS: Record<PassoDeConfiguracao["chave"], string> = {
  perfil: "Perfil",
  empresa: "Empresa",
  ambientes: "Ambientes",
  equipamentos: "Equipamentos",
  fluxos: "Fluxos",
  visita: "Visita",
  relatorio: "Relatório",
};

type DadosDoPerfil = { nome?: string; cargo?: string; perfil?: string; crn?: string; telefone?: string };

/**
 * UM cálculo só para "o que falta configurar": serve à linha do Início e ao guia de primeiros passos em Ajuda e guias.
 * Tudo vem de dados que já existem (nada novo é gravado).
 */
export function passosDeConfiguracao(entrada: {
  usuario?: DadosDoPerfil | null;
  empresa?: Pick<Empresa, "id" | "nomeFantasia" | "razaoSocial" | "cnpj" | "responsavel" | "responsavelEstabelecimento" | "setoresManual" | "equipamentosSetores" | "fluxosOperacionais"> | null;
  visitas: Pick<Visita, "empresaId" | "status" | "arquivada">[];
  relatoriosEmitidos?: { empresaId: string }[];
}): PassoDeConfiguracao[] {
  const { usuario, empresa } = entrada;
  const escrito = (valor?: string) => Boolean((valor || "").trim());
  const assina = usuario?.perfil === "Consultor/RT" || usuario?.perfil === "Administrador";
  const perfilFeito = Boolean(usuario) && escrito(usuario?.nome) && escrito(usuario?.cargo) && (!assina || (escrito(usuario?.crn) && escrito(usuario?.telefone)));
  const empresaFeita = Boolean(empresa) && escrito(empresa?.nomeFantasia || empresa?.razaoSocial) && escrito(empresa?.cnpj) && (escrito(empresa?.responsavel) || escrito(empresa?.responsavelEstabelecimento?.nome));
  const doAlvo = (id?: string) => entrada.visitas.filter((visita) => visita.empresaId === id && !visita.arquivada);
  const visitas = doAlvo(empresa?.id);
  const feitos: Record<PassoDeConfiguracao["chave"], boolean> = {
    perfil: perfilFeito,
    empresa: empresaFeita,
    ambientes: (empresa?.setoresManual || []).length > 0,
    equipamentos: (empresa?.equipamentosSetores || []).length > 0,
    fluxos: (empresa?.fluxosOperacionais || []).some((fluxo) => fluxo.aplicavel),
    visita: visitas.length > 0,
    relatorio: (entrada.relatoriosEmitidos || []).some((item) => item.empresaId === empresa?.id) || visitas.some((visita) => visita.status === "Concluída"),
  };
  return (Object.keys(TITULO_DOS_PASSOS) as PassoDeConfiguracao["chave"][]).map((chave) => ({ chave, titulo: TITULO_DOS_PASSOS[chave], feito: feitos[chave] }));
}

/** "Configuração da empresa: 4 de 7 · faltam" (os itens que faltam viram links na tela). Vazio quando tudo está completo. */
export function resumoDaConfiguracao(passos: PassoDeConfiguracao[]): { feitos: number; total: number; faltam: PassoDeConfiguracao[]; completo: boolean } {
  const faltam = passos.filter((passo) => !passo.feito);
  return { feitos: passos.length - faltam.length, total: passos.length, faltam, completo: faltam.length === 0 };
}

// ===== Início (PC) no desenho aprovado: caixas do "Continuar de onde parei" e as duas colunas (precisa de você / vencendo em 30 dias) =====
import { diasEntre } from "./registrosEmpresa.ts";
import type { TelaRecente } from "./continuarDeOndeParei.ts";
import type { ItemDoPainel } from "./painelHoje.ts";
import type { NaoConformidade, ProcedimentoOperacionalPadronizado } from "../types/index.ts";

export const MAXIMO_DE_CAIXAS = 3;

export type CaixaDoContinuar = { chave: string; tela: TelaRecente; titulo: string; subtitulo: string };

type VisitaDaCaixa = Pick<Visita, "id" | "status" | "data"> & { arquivada?: boolean };

/**
 * Caixas do cartão "Continuar de onde parei": no máximo 3, da mais recente para a mais antiga, tiradas do que o usuário abriu por último
 * (visitas em andamento, ficha de POP, Comprovantes). Nunca repete a mesma visita; visita que não está mais em andamento e POP que não existe mais
 * ficam de fora. Sem nada aberto, as visitas em andamento da empresa (a mais recente primeiro) completam a lista. Vazio = o cartão não aparece.
 * Só a primeira caixa tem 2 linhas ("próxima etapa: …" para visita; "último lugar de trabalho" para as outras telas).
 */
export function caixasDoContinuar(entrada: {
  telas: TelaRecente[];
  visitas: VisitaDaCaixa[];
  pops: Pick<ProcedimentoOperacionalPadronizado, "id" | "arquivado">[];
  numeroDaVisita: (id: string) => number | undefined;
  formatarData: (iso: string) => string;
  proximaEtapa: (visitaId: string) => string;
  maximo?: number;
}): CaixaDoContinuar[] {
  const maximo = entrada.maximo ?? MAXIMO_DE_CAIXAS;
  const caixas: CaixaDoContinuar[] = [];
  const vistos = new Set<string>();
  const emAndamento = (id: string) => entrada.visitas.find((visita) => visita.id === id && visita.status === "Em andamento" && !visita.arquivada);
  const acrescentar = (tela: TelaRecente, titulo: string, subtitulo: string) => {
    const chave = `${tela.tipo}:${tela.id}`;
    if (vistos.has(chave) || caixas.length >= maximo) return;
    vistos.add(chave);
    caixas.push({ chave, tela, titulo, subtitulo });
  };
  const daVisita = (id: string) => {
    const visita = emAndamento(id);
    if (!visita) return null;
    return { titulo: linhaDaVisita(entrada.numeroDaVisita(id), entrada.formatarData(visita.data)), subtitulo: `próxima etapa: ${entrada.proximaEtapa(id)}` };
  };
  for (const tela of entrada.telas) {
    if (tela.tipo === "visita") {
      const dados = daVisita(tela.id);
      if (dados) acrescentar(tela, dados.titulo, dados.subtitulo);
    } else if (tela.tipo === "pop") {
      if (entrada.pops.some((pop) => pop.id === tela.id && !pop.arquivado)) acrescentar(tela, tela.rotulo, "último lugar de trabalho");
    } else {
      acrescentar(tela, tela.rotulo || "Comprovantes", "último lugar de trabalho");
    }
  }
  const abertas = ordenarRecentes(entrada.visitas.filter((visita) => visita.status === "Em andamento" && !visita.arquivada));
  for (const visita of abertas) {
    const dados = daVisita(visita.id);
    if (dados) acrescentar({ tipo: "visita", id: visita.id, rotulo: dados.titulo }, dados.titulo, dados.subtitulo);
  }
  // Só a primeira tem 2 linhas.
  return caixas.map((caixa, indice) => (indice === 0 ? caixa : { ...caixa, subtitulo: "" }));
}

export type ItemDeVencimento = {
  id: string;
  /** "pop-revisao" é a data "Revisar até" de um POP aprovado; as outras vêm do painel Hoje. */
  origem: ItemDoPainel["origem"] | "pop-revisao";
  titulo: string;
  quem: string;
  /** AAAA-MM-DD */
  validade: string;
  dias: number;
};

/** Correção aberta que ainda não tem prazo: entra em "Hoje precisa de você" depois das vencidas e dos POPs aguardando. */
export type ItemSemPrazo = Omit<ItemDoPainel, "situacao"> & { situacao: "sem-prazo" };
export type ItemDaEsquerda = (ItemDoPainel | ItemSemPrazo) & { /** Ambiente da correção (só correções). */ ambiente?: string };

/** Texto que o painel e as correções já usam quando ninguém foi indicado. */
export const SEM_RESPONSAVEL = "Responsável ainda não definido";

/** Correções abertas (não resolvidas, ativas) da empresa que ainda não têm prazo. */
export function correcoesSemPrazo(ncs: Pick<NaoConformidade, "id" | "empresaId" | "titulo" | "status" | "prazo" | "inativaNoChecklist" | "canceladaPeloUsuarioEm" | "responsavelAcao">[] | undefined, empresaId: string): ItemSemPrazo[] {
  return (ncs || [])
    .filter((nc) => nc.empresaId === empresaId && nc.status !== "Resolvida" && !nc.inativaNoChecklist && !nc.canceladaPeloUsuarioEm && !(nc.prazo || "").trim())
    .map((nc) => ({
      id: `correcao:${nc.id}`,
      origem: "correcao" as const,
      titulo: nc.titulo,
      prazo: "aberta",
      situacao: "sem-prazo" as const,
      dias: null,
      quem: nc.responsavelAcao?.trim() ? nc.responsavelAcao.trim() : SEM_RESPONSAVEL,
      acao: "abrir" as const,
      rotuloDaAcao: "Abrir",
    }));
}

export type VencidosPorOrigem = Record<ItemDoPainel["origem"], number>;

export type ColunasDoInicio = {
  /** Vencidos, POPs aguardando aprovação e, por último, correções abertas sem prazo. */
  precisa: ItemDaEsquerda[];
  /** Vence em até 30 dias, por data. */
  vencendo: ItemDeVencimento[];
  vencidos: number;
  /** Os mesmos vencidos, por origem (o cabeçalho diz o tipo de cada número). */
  vencidosPorOrigem: VencidosPorOrigem;
  aguardando: number;
  /** Correções abertas sem prazo (parte do contador, nunca "vencidas"). */
  semPrazo: number;
  /** Linhas da coluna esquerda sem responsável definido (aparece uma vez, no cabeçalho). */
  semResponsavel: number;
};

export const DIAS_DA_JANELA_DE_VENCIMENTO = 30;
export const DIAS_DO_AMARELO = 14;

/**
 * Coluna esquerda: o que já venceu e o que espera aprovação. Coluna direita: só itens que o app JÁ guarda com data (correção com prazo,
 * comprovante com validade, treinamento com vencimento e a data "Revisar até" do POP aprovado), de hoje a 30 dias, ordenados por data.
 */
export function colunasDoInicio(itens: ItemDoPainel[], pops: Pick<ProcedimentoOperacionalPadronizado, "id" | "codigo" | "titulo" | "status" | "proximaRevisao" | "arquivado" | "responsavel">[], hoje: string, semPrazo: ItemSemPrazo[] = []): ColunasDoInicio {
  const urgentes = itens.filter((item) => item.situacao === "vencido" || item.situacao === "aguardando");
  const ordem = (item: ItemDaEsquerda) => (item.situacao === "vencido" ? 0 : item.situacao === "aguardando" ? 1 : 2);
  const precisa: ItemDaEsquerda[] = [...urgentes, ...semPrazo.filter((extra) => !urgentes.some((item) => item.id === extra.id))].sort((a, b) => ordem(a) - ordem(b));
  const vencendo: ItemDeVencimento[] = [];
  for (const item of itens) {
    if (item.situacao !== "vence-em-breve" || item.dias === null || !item.validade) continue;
    if (item.dias < 0 || item.dias > DIAS_DA_JANELA_DE_VENCIMENTO) continue;
    vencendo.push({ id: item.id, origem: item.origem, titulo: item.titulo, quem: item.quem, validade: item.validade, dias: item.dias });
  }
  for (const pop of pops) {
    if (pop.arquivado || pop.status !== "Aprovado" || !pop.proximaRevisao) continue;
    const dias = diasEntre(hoje, pop.proximaRevisao);
    if (dias < 0 || dias > DIAS_DA_JANELA_DE_VENCIMENTO) continue;
    vencendo.push({ id: `revisao:${pop.id}`, origem: "pop-revisao", titulo: `${pop.codigo ? `${pop.codigo} · ` : ""}${pop.titulo} (revisão)`, quem: pop.responsavel?.trim() || "Responsável do estabelecimento", validade: pop.proximaRevisao, dias });
  }
  vencendo.sort((a, b) => a.validade.localeCompare(b.validade) || a.titulo.localeCompare(b.titulo, "pt-BR"));
  const vencidosDaEsquerda = urgentes.filter((item) => item.situacao === "vencido");
  const vencidosPorOrigem: VencidosPorOrigem = { comprovante: 0, capacitacao: 0, correcao: 0, pop: 0 };
  for (const item of vencidosDaEsquerda) vencidosPorOrigem[item.origem] += 1;
  return { precisa, vencendo, vencidos: vencidosDaEsquerda.length, vencidosPorOrigem, aguardando: urgentes.filter((item) => item.situacao === "aguardando").length, semPrazo: precisa.filter((item) => item.situacao === "sem-prazo").length, semResponsavel: precisa.filter((item) => item.quem === SEM_RESPONSAVEL).length };
}

/** Acrescenta o ambiente às linhas que são correções (o painel de hoje não o carrega). */
export function comAmbienteDasCorrecoes(itens: ItemDaEsquerda[], ncs: Pick<NaoConformidade, "id" | "ambiente">[] | undefined): ItemDaEsquerda[] {
  return itens.map((item) => {
    if (item.origem !== "correcao") return item;
    const ambiente = (ncs || []).find((nc) => `correcao:${nc.id}` === item.id)?.ambiente?.trim();
    return ambiente ? { ...item, ambiente } : item;
  });
}

/**
 * Cabeçalho de "Hoje precisa de você": só as partes maiores que zero, separadas por " · "; vazio quando tudo é zero.
 * Cada vencido diz o seu tipo: "2 correções vencidas · 1 comprovante vencido · 2 treinamentos vencidos".
 */
export function contadorDoPainel(c: { vencidosPorOrigem: VencidosPorOrigem; aguardando: number; semPrazo: number }): string {
  return partesDoContador(c).map((parte) => parte.texto).join(" · ");
}

export type ParteDoContador = { texto: string; /** Vencido (correção, comprovante, treinamento ou POP): a tela dá cor de função a esta parte. */ urgente: boolean };

/** As mesmas partes de `contadorDoPainel`, uma por tipo, dizendo quais são vencidas. */
export function partesDoContador(c: { vencidosPorOrigem: VencidosPorOrigem; aguardando: number; semPrazo: number }): ParteDoContador[] {
  const v = c.vencidosPorOrigem;
  const partes: ParteDoContador[] = [];
  if (v.correcao > 0) partes.push({ texto: `${quantidade(v.correcao, "correção", "correções")} ${palavra(v.correcao, "vencida", "vencidas")}`, urgente: true });
  if (v.comprovante > 0) partes.push({ texto: `${quantidade(v.comprovante, "comprovante", "comprovantes")} ${palavra(v.comprovante, "vencido", "vencidos")}`, urgente: true });
  if (v.capacitacao > 0) partes.push({ texto: `${quantidade(v.capacitacao, "treinamento", "treinamentos")} ${palavra(v.capacitacao, "vencido", "vencidos")}`, urgente: true });
  if (v.pop > 0) partes.push({ texto: `${quantidade(v.pop, "POP", "POPs")} ${palavra(v.pop, "vencido", "vencidos")}`, urgente: true });
  if (c.aguardando > 0) partes.push({ texto: `${c.aguardando} aguardando aprovação`, urgente: false });
  if (c.semPrazo > 0) partes.push({ texto: `${c.semPrazo} ${c.semPrazo === 1 ? "aberta" : "abertas"} sem prazo`, urgente: false });
  return partes;
}

/** Segunda linha de cada item: correção = "Ambiente · Correção · situação · responsável"; o responsável indefinido não se repete por linha. */
export function subDaLinhaDoPainel(item: ItemDaEsquerda, tipo: string): string {
  const partes = [item.origem === "correcao" ? item.ambiente : "", tipo, item.prazo, item.quem === SEM_RESPONSAVEL ? "" : item.quem];
  return partes.filter((parte) => parte && parte.trim()).join(" · ");
}

const MESES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** Quadradinho da coluna direita: dia e mês; âmbar até 14 dias, azul depois. */
export function quadradoDoVencimento(validade: string, dias: number): { dia: string; mes: string; tom: "ambar" | "azul" } {
  const [, mes, dia] = validade.slice(0, 10).split("-");
  return { dia: String(Number(dia)), mes: MESES[Number(mes) - 1] || "", tom: dias <= DIAS_DO_AMARELO ? "ambar" : "azul" };
}

export const textoDoPrazoEm = (dias: number): string => (dias <= 0 ? "vence hoje" : dias === 1 ? "em 1 dia" : `em ${dias} dias`);

export const LIMITE_DE_LINHAS_DO_PAINEL = 6;
