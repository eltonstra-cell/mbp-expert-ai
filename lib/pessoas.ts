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

/**
 * Chips de sugestão de responsável: só pessoas cadastradas na empresa e o usuário atual (nome digitado à mão em outra correção
 * nunca vira sugestão). O último responsável do ambiente, quando é uma dessas pessoas, vem primeiro. Máximo de `limite`, sem a pessoa já escolhida.
 */
export function sugestoesDeResponsavel(dados: { cadastradas: string[]; usuarioAtual?: string; ultimoDoAmbiente?: string; escolhido?: string; limite?: number }): string[] {
  const limite = dados.limite ?? 3;
  const pessoas = pessoasUnicas([...dados.cadastradas, ...(dados.usuarioAtual ? [dados.usuarioAtual] : [])]);
  const ultimo = dados.ultimoDoAmbiente ? pessoas.find((nome) => mesmaPessoa(nome, dados.ultimoDoAmbiente as string)) : undefined;
  const ordenadas = ultimo ? [ultimo, ...pessoas.filter((nome) => !mesmaPessoa(nome, ultimo))] : pessoas;
  return ordenadas.filter((nome) => !dados.escolhido || !mesmaPessoa(nome, dados.escolhido)).slice(0, limite);
}
