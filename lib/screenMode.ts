// Modo de tela POR APARELHO: Campo (celular), Equilibrado (tablet) e Completo (PC).
// A escolha fica só no aparelho (localStorage); não vai ao servidor nem à conta.

export type ModoTela = "campo" | "equilibrado" | "completo";

export const CHAVE_MODO_TELA = "mbp-expert-ai:modo-tela:v1";

export type PreferenciaDeTela = {
  /** true = o modo acompanha o tamanho da tela. */
  automatico: boolean;
  /** Modo escolhido à mão (vale quando automatico = false). */
  modo: ModoTela;
  /** Nome opcional do aparelho, só para a pessoa se reconhecer. */
  nome: string;
};

export const PREFERENCIA_PADRAO: PreferenciaDeTela = { automatico: true, modo: "completo", nome: "" };

export const ROTULO_DO_MODO: Record<ModoTela, string> = {
  campo: "Campo",
  equilibrado: "Equilibrado",
  completo: "Completo",
};

/** Automático: < 1100 px Campo (celular e tablet, sem barra lateral; o layout se ajusta em 600 px); >= 1100 Completo. O Equilibrado continua como escolha manual. */
export function modoAutomatico(larguraDaTela: number): ModoTela {
  if (larguraDaTela < 1100) return "campo";
  return "completo";
}

export function modoEmUso(preferencia: PreferenciaDeTela, larguraDaTela: number): ModoTela {
  return preferencia.automatico ? modoAutomatico(larguraDaTela) : preferencia.modo;
}

const MODOS: ModoTela[] = ["campo", "equilibrado", "completo"];

/** Lê o que está salvo; qualquer coisa estranha volta ao Automático. */
export function lerPreferencia(texto: string | null | undefined): PreferenciaDeTela {
  if (!texto) return { ...PREFERENCIA_PADRAO };
  try {
    const bruto = JSON.parse(texto) as Partial<PreferenciaDeTela> | null;
    if (!bruto || typeof bruto !== "object") return { ...PREFERENCIA_PADRAO };
    const modo = MODOS.includes(bruto.modo as ModoTela) ? (bruto.modo as ModoTela) : "completo";
    return {
      automatico: bruto.automatico !== false,
      modo,
      nome: typeof bruto.nome === "string" ? bruto.nome.slice(0, 40) : "",
    };
  } catch {
    return { ...PREFERENCIA_PADRAO };
  }
}

export function serializarPreferencia(preferencia: PreferenciaDeTela): string {
  return JSON.stringify({ automatico: preferencia.automatico, modo: preferencia.modo, nome: preferencia.nome.trim().slice(0, 40) });
}

/** Rótulo do aparelho para a tela de configuração ("Celular", "Tablet 11\"", "Computador"). */
export function descreverAparelho(larguraDaTela: number): string {
  if (larguraDaTela < 768) return "Celular";
  if (larguraDaTela < 1100) return "Tablet";
  return "Computador";
}

/**
 * Largura que a página deve usar para o layout do modo escolhido quando a tela real é mais estreita
 * (por exemplo, "Completo" no celular): evita o layout do computador espremido em 390 px.
 * Retorna null quando o navegador pode usar a largura do aparelho.
 */
export function larguraDoLayout(modo: ModoTela, larguraDaTela: number): number | null {
  if (modo === "completo" && larguraDaTela < 1024) return 1280;
  if (modo === "equilibrado" && larguraDaTela < 768) return 820;
  return null;
}

/** Nome do modo com o aparelho a que ele serve, para o chip e a lista do menu ⋯. */
export const ROTULO_DE_USO: Record<ModoTela, string> = {
  campo: "Celular · Campo",
  equilibrado: "Tablet · Visita e demonstração",
  completo: "Computador · Completo",
};
