// Responsável pela execução do POP: a fonte é Empresa › Dados, lida na hora de exibir e imprimir. Só fica "travado" quando alguém
// digita outro nome à mão no POP (`responsavelManual`). POP antigo (sem a marca) segue com o texto que já tinha; nada é regravado em lote.
import type { ConteudoPop } from "../types/index.ts";
import { limparTextoDePessoa } from "./nomeCargo.ts";
import { mesmoNome } from "./responsavelEstabelecimento.ts";

export type NomeECargo = { nome: string; cargo: string };

const escrito = (texto?: string) => Boolean((texto || "").trim());

/** Nome e cargo que valem para o POP: os de Dados quando o POP acompanha Dados e Dados tem nome; senão o texto do próprio POP. */
export function responsavelDaExecucao(conteudo: Pick<ConteudoPop, "responsavelExecucao" | "responsavelManual"> | undefined, dados: NomeECargo | undefined): NomeECargo {
  const doPop = { nome: limparTextoDePessoa(conteudo?.responsavelExecucao?.nome), cargo: limparTextoDePessoa(conteudo?.responsavelExecucao?.cargo) };
  const deDados = { nome: limparTextoDePessoa(dados?.nome), cargo: limparTextoDePessoa(dados?.cargo) };
  if (conteudo?.responsavelManual === false && deDados.nome) return deDados;
  return doPop;
}

/** O mesmo conteúdo, com o responsável de Dados no lugar quando o POP acompanha Dados (para validar e gravar); senão o próprio objeto. */
export function conteudoComResponsavelEfetivo<T extends Pick<ConteudoPop, "responsavelExecucao" | "responsavelManual">>(conteudo: T, dados: NomeECargo | undefined): T {
  if (conteudo.responsavelManual !== false || !escrito(dados?.nome)) return conteudo;
  return { ...conteudo, responsavelExecucao: responsavelDaExecucao(conteudo, dados) };
}

/** O que o POP digitou à mão difere de Dados? Devolve o texto de Dados ("Maria · Nutricionista" sem o cargo se não houver) ou null. */
export function diferencaComDados(conteudo: Pick<ConteudoPop, "responsavelExecucao" | "responsavelManual"> | undefined, dados: NomeECargo | undefined): string | null {
  if (conteudo?.responsavelManual === false) return null;
  const doPop = limparTextoDePessoa(conteudo?.responsavelExecucao?.nome);
  const deDados = limparTextoDePessoa(dados?.nome);
  if (!doPop || !deDados) return null;
  return mesmoNome(doPop, deDados) ? null : deDados;
}

/**
 * A pessoa digitou nome ou cargo no POP: vira manual se o resultado difere de Dados; se voltar a ser igual a Dados (ou ficar sem
 * nome de Dados para comparar), segue sem trava quando já acompanhava Dados.
 */
export function marcaManualApos(novo: NomeECargo, dados: NomeECargo | undefined, anterior: boolean | undefined): boolean {
  const deDados = limparTextoDePessoa(dados?.nome);
  if (!deDados) return anterior === true || escrito(novo.nome);
  const igual = mesmoNome(novo.nome, deDados) && mesmoNome(novo.cargo || "", limparTextoDePessoa(dados?.cargo));
  return !igual;
}
