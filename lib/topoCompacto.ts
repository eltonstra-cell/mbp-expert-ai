// Linha do topo em janela estreita. Prioridade de espaço, nesta ordem: nome da página, empresa ativa, busca, status.
// Estas larguras (da janela, em px) valem também no CSS (app/globals.css); um teste confere que as duas pontas combinam.

/** Abaixo disso a busca vira lupa + "Ctrl K" e o campo de digitação passa para dentro do painel. */
export const LARGURA_DA_BUSCA_LARGA = 1400;
/** Abaixo disso "Sincronizado" e "Computador · Completo" viram só ícone com dica. */
export const LARGURA_DO_STATUS_POR_EXTENSO = 1500;
/** Só abaixo disso o nome da página aceita reticências; de 1100 para cima ele nunca é cortado. */
export const LARGURA_MINIMA_SEM_CORTE_DO_NOME = 1100;
/** A empresa ativa nunca perde o nome: largura mínima da caixa. */
export const LARGURA_MINIMA_DA_EMPRESA_ATIVA = 180;
/** Largura do painel de busca (limitada à janela). */
export const LARGURA_DO_PAINEL_DA_BUSCA = 520;

export type ModoDaBusca = "larga" | "compacta";
export type ModoDoStatus = "por-extenso" | "icone";

export function modoDaBusca(larguraDaJanela: number): ModoDaBusca {
  return larguraDaJanela >= LARGURA_DA_BUSCA_LARGA ? "larga" : "compacta";
}

/** O chip de sincronização do topo sempre traz o texto ("Sincronizado", "Sem sinal", "N pendentes de envio"). */
export function modoDoStatus(_larguraDaJanela: number): ModoDoStatus {
  return "por-extenso";
}

/** Largura do painel de busca na janela: 520 px, nunca maior que a janela menos uma folga de 16 px de cada lado. */
export function larguraDoPainelDaBusca(larguraDaJanela: number): number {
  return Math.max(280, Math.min(LARGURA_DO_PAINEL_DA_BUSCA, larguraDaJanela - 32));
}

/** O nome da página pode ser cortado com reticências nesta largura? (Só abaixo de 1100 px.) */
export function nomeDaPaginaPodeCortar(larguraDaJanela: number): boolean {
  return larguraDaJanela < LARGURA_MINIMA_SEM_CORTE_DO_NOME;
}
