// Cartão-resumo + janela de escolha (Setores e Fluxos): regras puras, sem tela.
import type { FluxoOperacional } from "../types/index.ts";
import { obterSetorSugeridoParaFluxo } from "./operationalFlows.ts";

/** Aberto, a lista de chips passa a rolar por dentro depois desta quantidade de linhas. */
export const LINHAS_MAXIMAS_DE_CHIPS = 4;

/**
 * Fechado: quantos chips (do começo) cabem em UMA linha. Quando nem todos cabem, sobra espaço para o chip "+N ▾"
 * (largura `larguraDoMais`). `larguras` são as larguras de cada chip; `espaco` é o vão entre chips. Todos cabendo, devolve o total.
 */
export function quantosChipsCabem(larguras: number[], larguraTotal: number, espaco: number, larguraDoMais: number): number {
  const somaAte = (n: number) => larguras.slice(0, n).reduce((soma, largura, indice) => soma + largura + (indice > 0 ? espaco : 0), 0);
  if (somaAte(larguras.length) <= larguraTotal) return larguras.length;
  for (let n = larguras.length - 1; n >= 0; n--) {
    if (somaAte(n) + (n > 0 ? espaco : 0) + larguraDoMais <= larguraTotal) return n;
  }
  return 0;
}

/** "3 de 13 setores marcados" (o "de T" pede o plural, também para 1). */
export function linhaDeContagem(marcadas: number, total: number, palavra: string): string {
  return `${marcadas} de ${total} ${palavra}`;
}

/** "3 de 13 marcados" do rodapé da janela. */
export function contadorDaJanela(marcadas: number, total: number): string {
  return `${marcadas} de ${total} marcados`;
}

/** Marcados na ordem das opções (a ordem do cartão não muda conforme a ordem em que a pessoa marcou). */
export function marcadosNaOrdem(ids: string[], marcadas: string[]): string[] {
  return ids.filter((id) => marcadas.includes(id));
}

/** A escolha dentro da janela é diferente do estado de partida? (mesmos itens, ignorando a ordem do clique) */
export function escolhaMudou(antes: string[], depois: string[]): boolean {
  return antes.length !== depois.length || antes.some((id) => !depois.includes(id));
}

/**
 * Aplica a escolha de setores OFICIAIS à lista `setoresManual` (que também guarda os ambientes próprios da empresa).
 * Quem saiu da escolha sai da lista; quem entrou vai para o fim; o resto não muda de lugar. Sem mudança, devolve o MESMO array
 * (quem chama não deve marcar a área como "não salva").
 */
export function aplicarEscolhaDeSetores(setores: string[], oficiais: readonly string[], escolhidos: string[]): string[] {
  const eOficial = (setor: string) => oficiais.includes(setor);
  const atuaisOficiais = setores.filter(eOficial);
  if (!escolhaMudou(atuaisOficiais, escolhidos)) return setores;
  const mantidos = setores.filter((setor) => !eOficial(setor) || escolhidos.includes(setor));
  const novos = oficiais.filter((setor) => escolhidos.includes(setor) && !setores.includes(setor));
  return [...mantidos, ...novos];
}

/**
 * Aplica a escolha de fluxos: `aplicavel` de cada fluxo passa a refletir a escolha. Ao marcar um fluxo cujo setor não está na lista de
 * setores da empresa, o setor vinculado vai para o sugerido (a mesma regra de antes). Sem mudança, devolve o MESMO array.
 */
export function aplicarEscolhaDeFluxos(fluxos: FluxoOperacional[], setores: string[], escolhidos: string[]): FluxoOperacional[] {
  const atuais = fluxos.filter((fluxo) => fluxo.aplicavel).map((fluxo) => fluxo.id);
  if (!escolhaMudou(atuais, escolhidos)) return fluxos;
  return fluxos.map((fluxo) => {
    const marcar = escolhidos.includes(fluxo.id);
    if (marcar === fluxo.aplicavel) return fluxo;
    return {
      ...fluxo,
      aplicavel: marcar,
      setorVinculado: marcar && setores.length > 0 && !setores.includes(fluxo.setorVinculado) ? obterSetorSugeridoParaFluxo(fluxo.tipo, setores, fluxo.setorVinculado) : fluxo.setorVinculado,
    };
  });
}

export const ROTULO_DO_SELO = "Falta salvar";

/** Chip "salvo" (azul-céu) só se o mesmo item estava marcado no último salvo; senão "Falta salvar" (cinza). Sem base salva, tudo falta salvar. */
export function chipPendente(id: string, salvos: readonly string[] | undefined): boolean {
  return !(salvos || []).includes(id);
}

/** Lê do texto da assinatura do último salvo (`assinaturaEdicaoEmpresa`) o que estava marcado de setores e de fluxos. */
export function marcadosDoUltimoSalvo(assinaturaSalva: string): { setores: string[]; fluxos: string[] } {
  if (!assinaturaSalva) return { setores: [], fluxos: [] };
  try {
    const dados = JSON.parse(assinaturaSalva) as { setores?: unknown; fluxos?: unknown };
    const setores = Array.isArray(dados.setores) ? dados.setores.filter((item): item is string => typeof item === "string") : [];
    const fluxos = Array.isArray(dados.fluxos)
      ? dados.fluxos.filter((fluxo): fluxo is { id: string; aplicavel?: boolean } => Boolean(fluxo) && typeof (fluxo as { id?: unknown }).id === "string" && Boolean((fluxo as { aplicavel?: unknown }).aplicavel)).map((fluxo) => fluxo.id)
      : [];
    return { setores, fluxos };
  } catch {
    return { setores: [], fluxos: [] };
  }
}

/** Barra de baixo da Central: "pendente" (creme com ponto âmbar) ou "salvo" (verde bem claro com ✓). */
export function estadoDaBarraDeSalvar(temAlteracoes: boolean): { classe: "is-pendente" | "is-salvo"; marca: string; texto: string } {
  return temAlteracoes
    ? { classe: "is-pendente", marca: "●", texto: "Alterações ainda não salvas" }
    : { classe: "is-salvo", marca: "✓", texto: "Tudo salvo" };
}
