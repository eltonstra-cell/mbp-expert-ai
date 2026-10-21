// Caminho mostrado no lugar dos grupos e sub-abas quando a ficha de um POP está aberta.
export function caminhoDaFicha(codigoOuTitulo: string): string[] {
  return ["Central", "Documentos", "POPs", codigoOuTitulo.trim() || "POP"];
}

export type NivelDoCaminho = { rotulo: string; /** Sem destino: é o nível onde a pessoa está, ou ele não existe para o perfil. */ ir?: () => void };

/** Os quatro níveis do caminho; só os que têm destino viram link. O último (o POP aberto) nunca é link. */
export function niveisDoCaminho(codigoOuTitulo: string, destinos: { central?: () => void; documentos?: () => void; pops?: () => void }): NivelDoCaminho[] {
  const [central, documentos, pops, pop] = caminhoDaFicha(codigoOuTitulo);
  return [
    { rotulo: central, ir: destinos.central },
    { rotulo: documentos, ir: destinos.documentos },
    { rotulo: pops, ir: destinos.pops },
    { rotulo: pop },
  ];
}
