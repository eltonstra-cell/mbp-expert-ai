// Ações dos menus "⋯" das telas do PC: quais aparecem para cada perfil/situação.
// Nenhuma delas apaga dado: "arquivar" só marca um campo opcional dentro do próprio JSON.

export type AcaoEmpresa = "editar" | "historico" | "acessos" | "arquivar" | "desarquivar";

export function acoesDaEmpresa(f: { podeEditar: boolean; podeGerenciarAcessos: boolean; arquivada: boolean }): AcaoEmpresa[] {
  const acoes: AcaoEmpresa[] = [];
  if (f.podeEditar) acoes.push("editar");
  acoes.push("historico");
  if (f.podeGerenciarAcessos) acoes.push("acessos");
  if (f.podeEditar) acoes.push(f.arquivada ? "desarquivar" : "arquivar");
  return acoes;
}

export type AcaoVisita = "abrir" | "relatorio" | "encerrar" | "excluir";

export function acoesDaVisita(f: {
  status: "Em andamento" | "Concluída";
  podeContinuar: boolean;
  podeRelatorio: boolean;
  podeConcluir: boolean;
  podeExcluir: boolean;
}): AcaoVisita[] {
  const acoes: AcaoVisita[] = [];
  if (f.podeContinuar || f.status === "Concluída") acoes.push("abrir");
  if (f.podeRelatorio) acoes.push("relatorio");
  if (f.status === "Em andamento" && f.podeConcluir) acoes.push("encerrar");
  if (f.podeExcluir) acoes.push("excluir");
  return acoes;
}

export type AcaoPop = "abrir" | "duplicar" | "arquivar" | "desarquivar" | "excluir";

export function acoesDoPop(f: { arquivado: boolean; podeEditar: boolean }): AcaoPop[] {
  if (!f.podeEditar) return ["abrir"];
  return ["abrir", "duplicar", f.arquivado ? "desarquivar" : "arquivar", "excluir"];
}

export type AcaoAcesso = "editar" | "desativar" | "reativar" | "excluir";

export function acoesDoAcesso(f: { status: "Convidado" | "Ativo" | "Suspenso"; podeGerenciar: boolean; podeExcluir?: boolean }): AcaoAcesso[] {
  if (!f.podeGerenciar) return [];
  const acoes: AcaoAcesso[] = ["editar", f.status === "Suspenso" ? "reativar" : "desativar"];
  if (f.podeExcluir) acoes.push("excluir");
  return acoes;
}

/** Arquivar/desarquivar sem apagar nada: só liga/desliga o campo opcional. */
export function marcarArquivada<T extends { arquivada?: boolean; arquivadaEm?: string }>(item: T, arquivar: boolean, agora: string): T {
  if (arquivar) return { ...item, arquivada: true, arquivadaEm: agora };
  const { arquivadaEm: _removido, ...resto } = item;
  return { ...resto, arquivada: false } as T;
}

export function listaSemArquivadas<T extends { arquivada?: boolean }>(itens: T[], mostrarArquivadas: boolean): T[] {
  return mostrarArquivadas ? itens : itens.filter((item) => !item.arquivada);
}
