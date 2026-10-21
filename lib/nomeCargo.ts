// Nome e cargo juntos, sem vírgula ou espaço sobrando. Dado guardado nunca é reescrito (versão aprovada é imutável):
// a limpeza é feita na EXIBIÇÃO, e também na gravação de agora em diante.

/** Tira vírgula, ponto e vírgula, dois-pontos, ponto, hífen e espaços do começo e do fim; junta espaços repetidos. */
export function limparTextoDePessoa(texto: string | undefined | null): string {
  return (texto || "")
    .replace(/^[\s,;:.\-–—]+/, "")
    .replace(/[\s,;:\-–—]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** "Elton, Nutricionista RT". Aceita cargo guardado como ", Nutricionista RT" e nome com vírgula no fim. */
export function nomeECargo(nome: string | undefined | null, cargo: string | undefined | null, separador = ", "): string {
  return [limparTextoDePessoa(nome), limparTextoDePessoa(cargo)].filter(Boolean).join(separador);
}

/** Primeira letra de cada nome em maiúscula ("maria da silva" vira "Maria da Silva"); preposições ficam em minúscula. */
export function nomeProprio(texto: string | undefined | null): string {
  const PREPOSICOES = new Set(["da", "de", "do", "das", "dos", "e"]);
  return (texto || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((palavra, indice) => {
      const minuscula = palavra.toLocaleLowerCase("pt-BR");
      if (indice > 0 && PREPOSICOES.has(minuscula)) return minuscula;
      // Só mexe em palavra toda em minúscula ou toda em maiúscula; "McDonald" e "d'Ávila" ficam como a pessoa digitou.
      const mistura = palavra !== minuscula && palavra !== palavra.toLocaleUpperCase("pt-BR");
      if (mistura) return palavra;
      return minuscula.charAt(0).toLocaleUpperCase("pt-BR") + minuscula.slice(1);
    })
    .join(" ");
}
