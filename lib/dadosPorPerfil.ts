// O que cada perfil recebe do servidor (rodada 4, D1 e D3): nome de quem aprovou, arquivou ou inativou só para gestão e Fiscal;
// CPF/CNPJ, endereço e telefone do consultor nunca vão ao Executor de campo nem ao Fiscal.
import type { AprovacaoPop, Empresa, ProcedimentoOperacionalPadronizado, RegistroPop } from "../types/index.ts";

export const ROTULO_SEM_NOME = "Responsável";

const aprovacaoAnonima = (aprovacao: AprovacaoPop | undefined): AprovacaoPop | undefined =>
  aprovacao ? { ...aprovacao, nome: ROTULO_SEM_NOME, cargo: "", usuarioId: "" } : undefined;

/** Troca os nomes de aprovação, conferência, arquivamento e inativação por "Responsável"; datas e hash continuam. */
export function semNomesDeAprovacao(pop: ProcedimentoOperacionalPadronizado): ProcedimentoOperacionalPadronizado {
  const copia: ProcedimentoOperacionalPadronizado = { ...pop };
  if (pop.aprovacao) copia.aprovacao = aprovacaoAnonima(pop.aprovacao);
  if (pop.versoes) copia.versoes = pop.versoes.map((versao) => (versao.aprovacao ? { ...versao, aprovacao: aprovacaoAnonima(versao.aprovacao) } : versao));
  if (pop.conferencia?.por) copia.conferencia = { ...pop.conferencia, por: { nome: ROTULO_SEM_NOME, cargo: "" } };
  if (pop.arquivamento) copia.arquivamento = { ...pop.arquivamento, porNome: ROTULO_SEM_NOME, porId: undefined };
  if (pop.inativacao) copia.inativacao = { ...pop.inativacao, porNome: ROTULO_SEM_NOME, porId: undefined };
  return copia;
}

export function semDadosDoConsultor(empresa: Empresa): Empresa {
  const { consultorCpfCnpj: _cpf, consultorEndereco: _endereco, consultorTelefone: _telefone, ...resto } = empresa;
  return resto as Empresa;
}

/** Campos da empresa que o servidor guarda e que Executor de campo e Fiscal não recebem (a visão filtrada nunca volta ao banco). */
export const CAMPOS_DA_EMPRESA_SO_DA_GESTAO = ["consultorCpfCnpj", "consultorEndereco", "consultorTelefone", "consultorNome", "elaboradoPor", "revisadoPor", "aprovadoPor", "cadastrosRevisados", "responsavelEstabelecimento"] as const;

/** Rodada 5, G1: além dos dados do consultor, sai todo nome de pessoa que o Executor e o Fiscal não precisam ver. */
export function semNomesNaEmpresa(empresa: Empresa): Empresa {
  const { cadastrosRevisados: _revisados, ...resto } = semDadosDoConsultor(empresa);
  const copia: Empresa = { ...resto };
  if (copia.consultorNome) copia.consultorNome = "";
  if (copia.elaboradoPor) copia.elaboradoPor = "";
  if (copia.revisadoPor) copia.revisadoPor = "";
  if (copia.aprovadoPor) copia.aprovadoPor = "";
  if (copia.responsavelEstabelecimento) copia.responsavelEstabelecimento = { nome: ROTULO_SEM_NOME, cargo: "" };
  return copia;
}

/** Nome do responsável do POP (e de quem executa) trocado por "Responsável"; o cargo e o resto ficam. */
export function semNomesNoPop(pop: ProcedimentoOperacionalPadronizado): ProcedimentoOperacionalPadronizado {
  const copia = semNomesDeAprovacao(pop);
  if (copia.responsavel) copia.responsavel = ROTULO_SEM_NOME;
  if (copia.conteudo?.responsavelExecucao) copia.conteudo = { ...copia.conteudo, responsavelExecucao: { ...copia.conteudo.responsavelExecucao, nome: ROTULO_SEM_NOME } };
  if (copia.versoes) copia.versoes = copia.versoes.map((versao) => (versao.conteudo?.responsavelExecucao ? { ...versao, conteudo: { ...versao.conteudo, responsavelExecucao: { ...versao.conteudo.responsavelExecucao, nome: ROTULO_SEM_NOME } } } : versao));
  return copia;
}

/** Registro feito por outra pessoa não mostra o nome; o do próprio usuário continua. */
export function registrosSemNomesDosOutros(registros: RegistroPop[], usuarioId: string): RegistroPop[] {
  return registros.map((registro) => (registro.responsavelId === usuarioId ? registro : { ...registro, responsavel: ROTULO_SEM_NOME }));
}
