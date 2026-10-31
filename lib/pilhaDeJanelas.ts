// Pilha única de janelas (diálogos, "Trocar empresa", escolhas em janela e a janela do Manual).
// Só a janela do topo recebe Esc e cliques; as de baixo ficam inertes. Quem abre entra no fim da pilha; quem fecha sai dela.

let pilha: string[] = [];
const ouvintes = new Set<() => void>();

const avisar = () => ouvintes.forEach((ouvinte) => ouvinte());

export function empilhar(id: string) {
  if (pilha.includes(id)) return;
  pilha = [...pilha, id];
  avisar();
}

export function desempilhar(id: string) {
  if (!pilha.includes(id)) return;
  pilha = pilha.filter((item) => item !== id);
  avisar();
}

/** A janela é a de cima? (Quem não está na pilha não é a de cima.) */
export function noTopo(id: string): boolean {
  return pilha.length > 0 && pilha[pilha.length - 1] === id;
}

/** Há alguma janela por cima desta? */
export function temJanelaPorCima(id: string): boolean {
  const posicao = pilha.indexOf(id);
  return posicao >= 0 && posicao < pilha.length - 1;
}

export function assinarPilha(ouvinte: () => void) {
  ouvintes.add(ouvinte);
  return () => {
    ouvintes.delete(ouvinte);
  };
}

export function tamanhoDaPilha(): number {
  return pilha.length;
}

/** Só para testes. */
export function limparPilha() {
  pilha = [];
  avisar();
}
