// Nomes de pessoas (dado pessoal): só compara e organiza o que já está no aparelho; nada sai daqui.

/** Chave de comparação: sem acento, sem diferença de maiúsculas e sem espaços sobrando. */
export function chaveDaPessoa(nome: string): string {
  return (nome || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

export function mesmaPessoa(a: string, b: string): boolean {
  const chaveA = chaveDaPessoa(a);
  return chaveA !== "" && chaveA === chaveDaPessoa(b);
}

/** Tira repetidos pela chave de comparação (fica a primeira grafia) e nomes vazios. */
export function pessoasUnicas(nomes: string[]): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const nome of nomes) {
    const chave = chaveDaPessoa(nome);
    if (!chave || vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(nome.trim().replace(/\s+/g, " "));
  }
  return saida;
}

const ORDEM_DE_NOMES = new Intl.Collator("pt-BR", { sensitivity: "base" });

/**
 * Lista empilhada do Responsável (uma pessoa por linha): as primeiras `limite` pessoas cadastradas na empresa (e o usuário atual),
 * SEMPRE em ordem alfabética pelo nome completo (sem acento nem caixa), igual em todas as correções. Quem já está escolhido continua na lista
 * (marcado na tela); se a escolhida não está entre as primeiras, entra no fim, para a escolha ficar sempre à vista. Nome digitado à mão só
 * aparece depois de escolhido (quem chama não passa o texto ainda em digitação).
 */
export function pessoasDaLista(dados: { cadastradas: string[]; usuarioAtual?: string; escolhido?: string; limite?: number }): string[] {
  const limite = dados.limite ?? 3;
  const todas = pessoasUnicas([...dados.cadastradas, ...(dados.usuarioAtual ? [dados.usuarioAtual] : [])]).sort((a, b) => ORDEM_DE_NOMES.compare(a, b));
  const lista = todas.slice(0, limite);
  const escolhido = pessoasUnicas([dados.escolhido || ""])[0] ?? "";
  if (escolhido && !lista.some((nome) => mesmaPessoa(nome, escolhido))) {
    lista.push(todas.find((nome) => mesmaPessoa(nome, escolhido)) ?? escolhido);
  }
  return lista;
}

const SUFIXOS_DE_NOME = new Set(["neto", "filho", "junior", "jr", "sobrinho"]);

/**
 * Nome curto para o chip: primeiro nome + último sobrenome ("Elton Volmir Strapazon" -> "Elton Strapazon"). Se o último termo é um sufixo
 * (Neto, Filho, Júnior, Jr, Sobrinho) usa o sobrenome anterior ("Francisco Vasconcelos Neto" -> "Francisco Vasconcelos"). Nome de uma ou duas palavras fica como está.
 */
export function nomeCurtoDaPessoa(nome: string): string {
  const partes = (nome || "").trim().split(/\s+/).filter(Boolean);
  if (partes.length <= 2) return partes.join(" ");
  const ultimo = partes[partes.length - 1];
  const sobrenome = SUFIXOS_DE_NOME.has(chaveDaPessoa(ultimo).replace(/\.$/, "")) ? partes[partes.length - 2] : ultimo;
  return `${partes[0]} ${sobrenome}`;
}

/**
 * Rótulos dos chips, na mesma ordem dos nomes: o nome curto; se duas pessoas gerarem o mesmo nome curto (sem acento nem caixa),
 * as duas usam o nome completo para desempatar.
 */
export function rotulosDeChipsDePessoas(nomes: string[]): string[] {
  const curtos = nomes.map(nomeCurtoDaPessoa);
  const contagem = new Map<string, number>();
  for (const curto of curtos) contagem.set(chaveDaPessoa(curto), (contagem.get(chaveDaPessoa(curto)) || 0) + 1);
  return nomes.map((nome, indice) => ((contagem.get(chaveDaPessoa(curtos[indice])) || 0) > 1 ? nome.trim().replace(/\s+/g, " ") : curtos[indice]));
}
