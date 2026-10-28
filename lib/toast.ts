// Aviso curto na tela ("Salvo"). Funciona fora do React: quem chama só dá o texto; o <ToastHost /> mostra e some sozinho.

export type Toast = { id: number; texto: string; tipo: "ok" | "aviso"; acao?: { rotulo: string; aoClicar: () => void } };

let atual: Toast | null = null;
let contador = 0;
let temporizador: ReturnType<typeof setTimeout> | null = null;
const ouvintes = new Set<() => void>();

const avisarOuvintes = () => ouvintes.forEach((ouvinte) => ouvinte());

export const DURACAO_DO_TOAST_MS = 2200;

export function mostrarToast(texto: string, opcoes: { tipo?: "ok" | "aviso"; duracaoMs?: number; acao?: { rotulo: string; aoClicar: () => void } } = {}): void {
  const duracaoMs = opcoes.duracaoMs ?? DURACAO_DO_TOAST_MS;
  if (!texto.trim()) return;
  if (temporizador) clearTimeout(temporizador);
  contador += 1;
  atual = { id: contador, texto: texto.trim(), tipo: opcoes.tipo || "ok", ...(opcoes.acao ? { acao: opcoes.acao } : {}) };
  avisarOuvintes();
  temporizador = setTimeout(() => {
    atual = null;
    temporizador = null;
    avisarOuvintes();
  }, duracaoMs);
}

export function toastAtual(): Toast | null {
  return atual;
}

export function assinarToast(ouvinte: () => void): () => void {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

/** Fecha o aviso agora (por exemplo, depois de tocar na ação dele). */
export function fecharToast(): void {
  limparToast();
}

/** Só para testes. */
export function limparToast(): void {
  if (temporizador) clearTimeout(temporizador);
  temporizador = null;
  atual = null;
  avisarOuvintes();
}
