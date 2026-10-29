// Nomes diferentes para o MESMO equipamento ("Geladeira" = "Refrigerador"). Lista curta e simples, só dados: serve ao aviso de item repetido no setor,
// ao autocompletar e ao limite de temperatura sugerido. Não é regra técnica nem de norma; para incluir um grupo, basta acrescentar uma linha.

export const GRUPOS_DE_SINONIMOS: string[][] = [
  ["Geladeira", "Refrigerador", "Refrigeradora"],
  ["Freezer", "Congelador"],
  ["Câmara fria", "Câmara frigorífica"],
  ["Balcão refrigerado", "Balcão frigorífico", "Expositor refrigerado"],
  ["Forno micro-ondas", "Micro-ondas", "Microondas", "Forno de micro-ondas"],
  ["Fritadeira", "Fritador"],
];

/** Sem acento, sem diferença de maiúscula e sem pontuação: "Micro-ondas" e "microondas" têm a mesma chave. */
export const chaveDeEquipamento = (nome: string): string =>
  (nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const chaveSemEspaco = (nome: string) => chaveDeEquipamento(nome).replace(/ /g, "");

/** Os outros nomes do mesmo grupo (sem repetir o próprio). Nome fora da lista: vazio. */
export function sinonimosDe(nome: string): string[] {
  const chave = chaveSemEspaco(nome);
  if (!chave) return [];
  const grupo = GRUPOS_DE_SINONIMOS.find((nomes) => nomes.some((item) => chaveSemEspaco(item) === chave));
  return grupo ? grupo.filter((item) => chaveSemEspaco(item) !== chave) : [];
}

/** Mesmo nome (acento, caixa, pontuação) ou nomes do mesmo grupo de sinônimos. */
export function mesmoEquipamentoOuSinonimo(a: string, b: string): boolean {
  const chaveA = chaveSemEspaco(a);
  const chaveB = chaveSemEspaco(b);
  if (!chaveA || !chaveB) return false;
  if (chaveDeEquipamento(a) === chaveDeEquipamento(b)) return true;
  return GRUPOS_DE_SINONIMOS.some((nomes) => nomes.some((n) => chaveSemEspaco(n) === chaveA) && nomes.some((n) => chaveSemEspaco(n) === chaveB));
}

export const TODOS_OS_NOMES_COM_SINONIMO: string[] = GRUPOS_DE_SINONIMOS.flat();
