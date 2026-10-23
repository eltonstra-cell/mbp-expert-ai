// Regras puras do pacote 3: finalizar visita, emitir relatório, empresa (nome e CNPJ), exclusão de ambiente com equipamentos e questionário em lote.
// A tela mostra o aviso na hora, ao lado do botão ou do campo; o servidor continua sendo quem decide o que é gravado.

export const AVISO_FINALIZAR_SEM_ITEM = "Responda pelo menos 1 item do checklist para finalizar a visita.";
export const AVISO_EMITIR_SEM_VISITA = "Só dá para emitir o relatório de uma visita concluída ou parcial (com pelo menos 1 item respondido).";

/** Item respondido = Conforme, Não conforme ou Não se aplica (qualquer coisa que não seja Pendente). */
export const itensRespondidos = (itens: { status?: string }[]): number => itens.filter((item) => item.status && item.status !== "Pendente").length;

/** Texto vazio quando pode finalizar. */
export function avisoParaFinalizar(respondidos: number): string {
  return respondidos >= 1 ? "" : AVISO_FINALIZAR_SEM_ITEM;
}

/** Concluída: sempre pode. Parcial: visita em andamento com pelo menos 1 item respondido. Texto vazio quando pode emitir. */
export function avisoParaEmitir(status: string | undefined, respondidos: number): string {
  if (status === "Concluída") return "";
  return respondidos >= 1 ? "" : AVISO_EMITIR_SEM_VISITA;
}

export function cnpjValido(valor: string | null | undefined): boolean {
  const digitos = (valor || "").replace(/\D/g, "");
  if (digitos.length !== 14 || /^(\d)\1{13}$/.test(digitos)) return false;
  const digito = (base: string, pesos: number[]) => {
    const soma = base.split("").reduce((total, numero, indice) => total + Number(numero) * pesos[indice], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const primeiro = digito(digitos.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = digito(digitos.slice(0, 12) + primeiro, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digitos.endsWith(`${primeiro}${segundo}`);
}

/** Mensagem do campo CNPJ (vazia = sem erro). Campo ainda vazio não acusa erro; salvar exige o CNPJ. */
export function erroDoCnpj(valor: string | null | undefined): string {
  const digitos = (valor || "").replace(/\D/g, "");
  if (!digitos) return "";
  if (digitos.length < 14) return `Faltam ${14 - digitos.length} dígitos no CNPJ.`;
  if (digitos.length > 14) return "O CNPJ tem 14 dígitos.";
  return cnpjValido(digitos) ? "" : "CNPJ inválido: confira os números.";
}

export function erroDoNomeDaEmpresa(nomeFantasia: string | null | undefined, razaoSocial?: string | null): string {
  return (nomeFantasia || "").trim() || (razaoSocial || "").trim() ? "" : "Informe o nome da empresa.";
}

/** O que impede salvar a empresa (lista vazia = pode salvar). Empresa já cadastrada não é barrada por um CNPJ antigo. */
export function pendenciasParaSalvarEmpresa(form: { nomeFantasia?: string; razaoSocial?: string; cnpj?: string }, jaCadastrada: boolean): string[] {
  const faltas: string[] = [];
  const nome = erroDoNomeDaEmpresa(form.nomeFantasia, form.razaoSocial);
  if (nome) faltas.push(nome);
  if (!jaCadastrada) {
    if (!(form.cnpj || "").replace(/\D/g, "")) faltas.push("Informe o CNPJ.");
    else {
      const cnpj = erroDoCnpj(form.cnpj);
      if (cnpj) faltas.push(cnpj);
    }
  }
  return faltas;
}

export type EquipamentoDoAmbiente = { id: string; nome: string };

/** Excluir ambiente com equipamentos vinculados: bloqueia e lista quais são (o usuário move ou exclui). */
export function bloqueioDeExcluirAmbiente(
  ambiente: string,
  equipamentos: { id: string; nome: string; setor?: string }[]
): { bloqueado: false } | { bloqueado: true; equipamentos: EquipamentoDoAmbiente[]; mensagem: string } {
  const vinculados = equipamentos.filter((item) => (item.setor || "").trim().toLowerCase() === ambiente.trim().toLowerCase()).map((item) => ({ id: item.id, nome: item.nome }));
  if (vinculados.length === 0) return { bloqueado: false };
  const nomes = vinculados.map((item) => item.nome).join(", ");
  const varios = vinculados.length > 1;
  return {
    bloqueado: true,
    equipamentos: vinculados,
    mensagem: `“${ambiente}” tem ${varios ? `${vinculados.length} equipamentos vinculados` : "1 equipamento vinculado"}: ${nomes}. Mova ${varios ? "os equipamentos" : "o equipamento"} para outro ambiente ou exclua-${varios ? "os" : "o"} junto com o ambiente.`,
  };
}

export const MODELO_GENERICO = "Estrutura geral/personalizada";

/** Ambiente com nome próprio, sem setor oficial vinculado e ainda no questionário genérico = "sem questionário" (aviso na hora, no ambiente). */
export function ambientesSemQuestionario(setores: string[], oficiais: readonly string[], modelos: Record<string, string> | undefined, vinculos: Record<string, string> | undefined): string[] {
  return setores.filter((setor) => !oficiais.includes(setor) && !(vinculos || {})[setor] && ((modelos || {})[setor] || MODELO_GENERICO) === MODELO_GENERICO);
}

/** Vincula o mesmo questionário a vários ambientes de uma vez (só mexe nos escolhidos). */
export function vincularQuestionarioEmLote(modelos: Record<string, string> | undefined, ambientes: string[], modelo: string): Record<string, string> {
  return { ...(modelos || {}), ...Object.fromEntries(ambientes.map((ambiente) => [ambiente, modelo])) };
}
