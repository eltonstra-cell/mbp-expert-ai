// Caminho mostrado no lugar dos grupos e sub-abas quando a ficha de um POP está aberta.
export function caminhoDaFicha(codigoOuTitulo: string): string[] {
  return ["Central", "Documentos", "POPs", codigoOuTitulo.trim() || "POP"];
}
