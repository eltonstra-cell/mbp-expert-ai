// Rascunho do plano de uma correção: o que o RT digitou e ainda não salvou. Fica SÓ na memória da tela (nunca gravado no aparelho nem no servidor)
// e é descartado ao salvar o plano, ao resolver/marcar como feita/desfazer, ao aplicar em lote e ao sair da tela (a tela é remontada
// por empresa e usuário). Só guarda os campos que a pessoa EDITOU (diferentes da base); os demais seguem a correção atual.

export type PlanoEmEdicao = { acao: string; responsavel: string; prazo: string; causa: string };

export type RascunhosDeCorrecao = {
  obter: (id: string) => Partial<PlanoEmEdicao> | undefined;
  /** Guarda só os campos que diferem da base; nenhum diferente = sem rascunho. */
  guardar: (id: string, atual: PlanoEmEdicao, base: PlanoEmEdicao) => void;
  limpar: (id: string) => void;
  tamanho: () => number;
};

const CAMPOS: (keyof PlanoEmEdicao)[] = ["acao", "responsavel", "prazo", "causa"];

const igual = (a: PlanoEmEdicao, b: PlanoEmEdicao) => a.acao === b.acao && a.responsavel === b.responsavel && a.prazo === b.prazo && a.causa === b.causa;

export function criarRascunhosDeCorrecao(): RascunhosDeCorrecao {
  const guardados = new Map<string, Partial<PlanoEmEdicao>>();
  return {
    obter: (id) => guardados.get(id),
    guardar: (id, atual, base) => {
      if (igual(atual, base)) {
        guardados.delete(id);
        return;
      }
      const parcial: Partial<PlanoEmEdicao> = {};
      for (const campo of CAMPOS) if (atual[campo] !== base[campo]) parcial[campo] = atual[campo];
      guardados.set(id, parcial);
    },
    limpar: (id) => {
      guardados.delete(id);
    },
    tamanho: () => guardados.size,
  };
}

/** Valores que a tela mostra ao abrir uma correção: a base ATUAL da correção com os campos editados por cima. */
export function planoAoAbrir(base: PlanoEmEdicao, rascunho: Partial<PlanoEmEdicao> | undefined): PlanoEmEdicao {
  return { ...base, ...(rascunho || {}) };
}

/** "Falta: a ação e o responsável" (vazio quando nada falta). */
export function textoDoQueFalta(faltas: string[]): string {
  if (faltas.length === 0) return "";
  const lista = faltas.length === 1 ? faltas[0] : `${faltas.slice(0, -1).join(", ")} e ${faltas[faltas.length - 1]}`;
  return `Falta: ${lista}`;
}
