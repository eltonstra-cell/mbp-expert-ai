// Um só lugar para singular/plural dos textos do app ("1 não conforme", "2 não conformes", "1 vence", "3 vencem").

/** "1 correção", "2 correções". */
export function quantidade(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/** Só a palavra certa para o número: palavra(1, "vence", "vencem") → "vence". */
export function palavra(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural;
}

/** Plural regular em português para as palavras do app (correção→correções, setor→setores, item→itens, conforme→conformes). */
export function pluralDe(singular: string): string {
  const texto = singular.trim();
  if (/ão$/.test(texto)) return texto.replace(/ão$/, "ões");
  if (/[aeiou]m$/.test(texto)) return texto.replace(/m$/, "ns");
  if (/[rz]$/.test(texto)) return `${texto}es`;
  if (/al$/.test(texto)) return texto.replace(/al$/, "ais");
  if (/s$/.test(texto)) return texto;
  return `${texto}s`;
}

/** Quantidade com o plural regular: contar(2, "correção") → "2 correções". */
export function contar(n: number, singular: string, plural?: string): string {
  return quantidade(n, singular, plural || pluralDe(singular));
}

/** "1 não conforme", "2 não conformes". */
export function naoConformes(n: number): string {
  return quantidade(n, "não conforme", "não conformes");
}

/** "1 vence", "2 vencem". */
export function vencem(n: number): string {
  return `${n} ${palavra(n, "vence", "vencem")}`;
}
