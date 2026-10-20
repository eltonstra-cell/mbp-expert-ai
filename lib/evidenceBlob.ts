// Exclusão do arquivo de mídia de UMA evidência no armazenamento (Vercel Blob).
// Só aceita o caminho exato de um arquivo de evidência; nunca prefixo nem lote.

const CAMINHO_DE_EVIDENCIA = /^evidencias\/[A-Za-z0-9_-]+\/[^\/\\]+$/;

export function caminhoDeEvidenciaValido(pathname: unknown): pathname is string {
  return typeof pathname === "string" && pathname.length <= 512 && CAMINHO_DE_EVIDENCIA.test(pathname);
}

/**
 * Apaga o arquivo da evidência. Nunca lança: se falhar, registra só o motivo (sem caminho nem URL)
 * e devolve false, para não bloquear a ação do usuário.
 */
export async function apagarArquivoDaEvidencia(
  pathname: unknown,
  apagar: (caminho: string) => Promise<unknown>,
  registrar: (mensagem: string) => void = console.error
): Promise<boolean> {
  if (!caminhoDeEvidenciaValido(pathname)) return false;
  try {
    await apagar(pathname);
    return true;
  } catch (erro) {
    registrar(`Falha ao apagar o arquivo de uma evidência: ${erro instanceof Error ? erro.name : "erro desconhecido"}`);
    return false;
  }
}
