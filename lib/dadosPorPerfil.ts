// O que cada perfil recebe do servidor (rodada 4, D1 e D3): nome de quem aprovou, arquivou ou inativou só para gestão e Fiscal;
// CPF/CNPJ, endereço e telefone do consultor nunca vão ao Executor de campo nem ao Fiscal.
import type { AprovacaoPop, Empresa, ProcedimentoOperacionalPadronizado } from "../types/index.ts";

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
