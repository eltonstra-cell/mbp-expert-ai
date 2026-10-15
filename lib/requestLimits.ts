// Verificação barata pelo cabeçalho Content-Length, antes de ler o corpo.
// Sem cabeçalho (transferência em partes) não há como saber; as rotas ainda
// limitam o tamanho depois de ler o conteúdo.
export function corpoExcedeLimite(
  contentLength: string | null | undefined,
  maxBytes: number
): boolean {
  if (!contentLength) return false;
  const tamanho = Number(contentLength);
  return Number.isFinite(tamanho) && tamanho > maxBytes;
}
