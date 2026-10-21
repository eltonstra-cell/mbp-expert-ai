// "Colocar a empresa em dia": 5 passos de implantação, só para empresa nova. Cada passo é DERIVADO dos dados (nada de checkbox manual).
// Empresa cadastrada antes desta versão não tem `implantacao` e é tratada como concluída: não recebe o cartão e nada é gravado em massa.
import type { Colaborador, Empresa, LeituraPop, RegistroPop } from "../types/index.ts";
import { conjuntoDaEmpresa, popDoConjunto, popVigente, situacaoDoPop } from "./popsNorma.ts";
import { leituraDaVersao } from "./registrosEmpresa.ts";
import { responsavelEfetivo } from "./responsavelEstabelecimento.ts";
import { quantidade } from "./plural.ts";

export type EstadoDoPasso = "feito" | "atual" | "pendente";
export type DestinoDoPasso = "dados" | "norma" | "pops";

export type PassoDeImplantacao = {
  numero: 1 | 2 | 3 | 4 | 5;
  titulo: string;
  detalhe: string;
  estado: EstadoDoPasso;
  destino: DestinoDoPasso;
};

export type DadosDaImplantacao = {
  colaboradores?: Colaborador[];
  leiturasPop?: LeituraPop[];
  registrosPop?: RegistroPop[];
};

/** Registro novo de empresa criada depois desta versão. Empresas antigas ficam sem o campo. */
export function implantacaoDeEmpresaNova(agora: string): NonNullable<Empresa["implantacao"]> {
  return { ativa: true, criadaEm: agora };
}

export function passosDeImplantacao(empresa: Empresa, dados: DadosDaImplantacao = {}, hoje?: string): PassoDeImplantacao[] {
  const responsavel = responsavelEfetivo(empresa);
  const conjunto = conjuntoDaEmpresa(empresa);
  const pops = empresa.pops || [];
  const colaboradores = (dados.colaboradores || []).filter((pessoa) => pessoa.empresaId === empresa.id && pessoa.ativo);
  const doConjunto = conjunto.map((definicao) => ({ definicao, pop: popDoConjunto(pops, definicao) }));

  const passo1 = Boolean(responsavel.nome && responsavel.vinculado);
  const passo2 = (empresa.normasAplicadas || []).length > 0 && Boolean(empresa.normasConfirmadasPeloRt);
  const criados = doConjunto.filter((linha) => linha.pop).length;
  const passo3 = conjunto.length > 0 && criados === conjunto.length;
  const todosAprovados = passo3 && doConjunto.every((linha) => situacaoDoPop(linha.pop, hoje) === "Aprovado");
  const todosLeram =
    todosAprovados &&
    colaboradores.length > 0 &&
    doConjunto.every((linha) => {
      const vigente = popVigente(linha.pop);
      if (!vigente) return false;
      const leitura = leituraDaVersao(linha.pop!.id, vigente.versao, colaboradores, dados.leiturasPop || []);
      return leitura.total > 0 && leitura.lidos === leitura.total;
    });
  const passo4 = todosLeram;
  const comRegistro = doConjunto.filter((linha) => linha.pop && (dados.registrosPop || []).some((registro) => registro.popId === linha.pop!.id)).length;
  const passo5 = passo3 && comRegistro === conjunto.length;

  const feitos = [passo1, passo2, passo3, passo4, passo5];
  const primeiroPendente = feitos.findIndex((feito) => !feito);
  const estado = (indice: number): EstadoDoPasso => (feitos[indice] ? "feito" : indice === primeiroPendente ? "atual" : "pendente");

  const detalhe1 = passo1 ? `${responsavel.nome} · vinculado ao acesso` : responsavel.nome ? `${responsavel.nome} · falta vincular ao acesso em Dados` : "Informe o responsável em Dados";
  const detalhe2 = passo2 ? "Normas definidas e confirmadas pelo RT" : (empresa.normasAplicadas || []).length ? "Falta o RT confirmar as normas" : "Nenhuma norma definida";
  const detalhe3 = conjunto.length === 0 ? "Defina a norma para ver o conjunto" : `${quantidade(criados, "criado", "criados")}, ${conjunto.length - criados} ${conjunto.length - criados === 1 ? "falta" : "faltam"}`;
  const detalhe4 = !passo3 ? "depois do passo 3" : colaboradores.length === 0 ? "Cadastre a equipe em Pessoas" : todosAprovados ? "Falta colher a leitura da equipe" : "Falta aprovar os POPs";
  const detalhe5 = !passo4 ? "depois do passo 4" : `${comRegistro} de ${conjunto.length} POPs com registro`;

  return [
    { numero: 1, titulo: "Definir o responsável do estabelecimento", detalhe: detalhe1, estado: estado(0), destino: "dados" },
    { numero: 2, titulo: "Confirmar a norma aplicável", detalhe: detalhe2, estado: estado(1), destino: "norma" },
    { numero: 3, titulo: `Criar os ${conjunto.length || 4} POPs do modelo`, detalhe: detalhe3, estado: estado(2), destino: "pops" },
    { numero: 4, titulo: "Aprovar e colher leitura da equipe", detalhe: detalhe4, estado: estado(3), destino: "pops" },
    { numero: 5, titulo: "Fazer o primeiro registro de cada POP", detalhe: detalhe5, estado: estado(4), destino: "pops" },
  ];
}

export function implantacaoConcluida(passos: PassoDeImplantacao[]): boolean {
  return passos.every((passo) => passo.estado === "feito");
}

/** Só empresa criada depois desta versão (campo presente e ativo) tem o cartão. Sem o campo = concluída. */
export function empresaTemImplantacao(empresa: Pick<Empresa, "implantacao"> | undefined): boolean {
  return empresa?.implantacao?.ativa === true;
}

export function resumoDaImplantacao(passos: PassoDeImplantacao[]): { feitos: number; total: number; percentual: number } {
  const feitos = passos.filter((passo) => passo.estado === "feito").length;
  return { feitos, total: passos.length, percentual: Math.round((feitos / passos.length) * 100) };
}
