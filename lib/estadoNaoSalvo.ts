// "Alterações ainda não salvas" da Central da Empresa: a assinatura do que o formulário edita, comparada com a do último salvo.
// Os POPs ficam FORA da assinatura: eles são gravados na hora (cada ação grava no estado), então nunca ficam "pendentes" no Salvar.
// (Antes, qualquer ação em POPs mudava a lista do formulário sem mudar a linha de base, e a barra dizia "não salvo" em todas as abas.)

export type EdicaoDaEmpresa = {
  form: unknown;
  responsabilidades: unknown;
  setores: unknown;
  equipamentos: unknown;
  fluxos: unknown;
  programas: unknown;
  /** Opcional: ambiente próprio -> setor oficial (só entra na assinatura quando existe). */
  vinculos?: unknown;
  /** Opcional: questionário (modelo) de cada ambiente. */
  modelos?: unknown;
  /** Aceito só para não quebrar quem ainda passa a lista; não entra na assinatura. */
  pops?: unknown;
};

export function assinaturaEdicaoEmpresa(valor: EdicaoDaEmpresa): string {
  const { form, responsabilidades, setores, equipamentos, fluxos, programas, vinculos, modelos } = valor;
  const vazio = !vinculos || Object.keys(vinculos as object).length === 0;
  return JSON.stringify({ form, responsabilidades, setores, equipamentos, fluxos, programas, ...(vazio ? {} : { vinculos }), ...(modelos && Object.keys(modelos as object).length ? { modelos } : {}) });
}

/**
 * Ambientes e Equipamentos gravam na hora (sem o Salvar da barra): a linha de base passa a ter os setores, os equipamentos, os vínculos e os
 * questionários novos, e o resto do formulário (dados, fluxos, programas) continua exatamente como estava. Assinatura ilegível: devolve a mesma.
 */
export function assinaturaComEstrutura(assinaturaSalva: string, estrutura: { setores: unknown; equipamentos: unknown; vinculos?: unknown; modelos?: unknown; adequarFluxos?: (fluxos: unknown) => unknown }): string {
  if (!assinaturaSalva) return assinaturaSalva;
  try {
    const base = JSON.parse(assinaturaSalva) as { form?: unknown; responsabilidades?: unknown; fluxos?: unknown; programas?: unknown };
    return assinaturaEdicaoEmpresa({
      form: base.form,
      responsabilidades: base.responsabilidades,
      setores: estrutura.setores,
      equipamentos: estrutura.equipamentos,
      fluxos: estrutura.adequarFluxos ? estrutura.adequarFluxos(base.fluxos) : base.fluxos,
      programas: base.programas,
      vinculos: estrutura.vinculos,
      modelos: estrutura.modelos,
    });
  } catch {
    return assinaturaSalva;
  }
}

/** Só é "não salvo" quando há uma linha de base e o conteúdo atual realmente difere dela. */
export function temAlteracoesNaoSalvas(emEdicao: boolean, assinaturaSalva: string, assinaturaAtual: string): boolean {
  return emEdicao && Boolean(assinaturaSalva) && assinaturaAtual !== assinaturaSalva;
}
