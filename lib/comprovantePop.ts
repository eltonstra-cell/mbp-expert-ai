// Qual POP combina com cada tipo de comprovante, e o que dizer quando um POP não tem comprovante.
// Só liga o que combina de verdade; contrato do RT e documentos próprios não pertencem a POP nenhum.
import type { ProcedimentoOperacionalPadronizado, TipoComprovante } from "../types/index.ts";
import { CONJUNTO_DA_NORMA, popDoConjunto, type DefinicaoPopDoConjunto } from "./popsNorma.ts";
import { TIPOS_DE_COMPROVANTE } from "./registrosEmpresa.ts";

/** Controle de pragas → POP de vetores e pragas; Limpeza do reservatório → POP do reservatório; os demais, sem POP. */
export const CATALOGO_DO_TIPO: Partial<Record<TipoComprovante, string>> = {
  pragas: "controle-de-pragas",
  reservatorio: "higienizacao-reservatorio",
};

export type SugestaoDePop =
  /** O tipo não pertence a nenhum POP. */
  | { situacao: "sem-pop" }
  /** O POP certo existe: vem preenchido. */
  | { situacao: "existe"; popId: string }
  /** O POP certo ainda não existe: fica vazio, com aviso e atalho para criar. */
  | { situacao: "falta-criar"; definicao: DefinicaoPopDoConjunto };

export function sugestaoDePopParaTipo(tipo: TipoComprovante, pops: ProcedimentoOperacionalPadronizado[] | undefined): SugestaoDePop {
  const catalogoId = CATALOGO_DO_TIPO[tipo];
  if (!catalogoId) return { situacao: "sem-pop" };
  const definicao = CONJUNTO_DA_NORMA.find((item) => item.catalogoId === catalogoId);
  if (!definicao) return { situacao: "sem-pop" };
  const pop = popDoConjunto(pops || [], definicao);
  return pop ? { situacao: "existe", popId: pop.id } : { situacao: "falta-criar", definicao };
}

/** "O POP de Higienização do reservatório ainda não foi criado." */
export function avisoDePopAusente(definicao: Pick<DefinicaoPopDoConjunto, "titulo">): string {
  return `O POP de ${definicao.titulo} ainda não foi criado.`;
}

/** Mensagem de lista vazia dentro da ficha de um POP (o que se aplica àquele POP). */
export function mensagemDeComprovanteVazio(pop: Pick<ProcedimentoOperacionalPadronizado, "catalogoId" | "titulo"> | undefined): string {
  switch (pop?.catalogoId) {
    case "higienizacao-instalacoes":
      return "Este POP normalmente não exige comprovante de terceiros.";
    case "controle-de-pragas":
      return "Anexe aqui o certificado do controle de pragas feito pela empresa especializada.";
    case "higienizacao-reservatorio":
      return "Anexe aqui o certificado da limpeza do reservatório.";
    case "higiene-saude-manipuladores":
      return "Este POP normalmente não exige comprovante de terceiros; a capacitação da equipe fica em Documentos › Pessoas.";
    default:
      return "Nenhum comprovante vinculado a este POP.";
  }
}

export const ROTULO_OUTRO_NO_POP = "Outro documento deste POP";

/** Tipos que a ficha de um POP oferece: só os ligados àquele POP, mais "Outro documento deste POP". */
export function tiposDoPop(catalogoId: string | undefined): { id: TipoComprovante; rotulo: string }[] {
  const ligados = TIPOS_DE_COMPROVANTE.filter((tipo) => Boolean(catalogoId) && CATALOGO_DO_TIPO[tipo.id] === catalogoId);
  return [...ligados, { id: "outro", rotulo: ROTULO_OUTRO_NO_POP }];
}

/**
 * Troca o POP vinculado de um comprovante sem apagar nada: o registro ganha uma linha no histórico (de, para, quem e quando).
 * Sem mudança, ou POP que não existe na empresa, devolve o mesmo comprovante.
 */
export function alterarPopVinculado<T extends { popId?: string; historicoDePop?: { em: string; porId?: string; porNome?: string; de?: string; para?: string }[] }>(
  comprovante: T,
  novoPopId: string | undefined,
  popsDaEmpresa: { id: string }[],
  quem: { id?: string; nome?: string },
  agora: string
): T {
  const destino = novoPopId && popsDaEmpresa.some((pop) => pop.id === novoPopId) ? novoPopId : undefined;
  if (novoPopId && !destino) return comprovante;
  if ((comprovante.popId || undefined) === destino) return comprovante;
  const { popId: _antigo, ...resto } = comprovante;
  return {
    ...resto,
    ...(destino ? { popId: destino } : {}),
    historicoDePop: [...(comprovante.historicoDePop || []), { em: agora, ...(quem.id ? { porId: quem.id } : {}), ...(quem.nome ? { porNome: quem.nome } : {}), ...(comprovante.popId ? { de: comprovante.popId } : {}), ...(destino ? { para: destino } : {}) }],
  } as T;
}

/**
 * O tipo do comprovante costuma pertencer a outro POP? (ex.: "Limpeza do reservatório" preso ao POP-01).
 * Usa só o mapeamento tipo→POP já existente; tipos sem POP próprio (contrato, outros) nunca geram aviso.
 */
export function tipoDeOutroPop(
  tipo: TipoComprovante,
  popAtual: { catalogoId?: string } | undefined
): { catalogoId: string; titulo: string; texto: string } | null {
  const esperado = CATALOGO_DO_TIPO[tipo];
  if (!esperado || !popAtual) return null;
  if (popAtual.catalogoId === esperado) return null;
  const definicao = CONJUNTO_DA_NORMA.find((item) => item.catalogoId === esperado);
  if (!definicao) return null;
  return { catalogoId: esperado, titulo: definicao.titulo, texto: `Este tipo costuma pertencer ao POP de ${definicao.titulo}` };
}

/**
 * Usou "Renovar": o novo comprovante guarda `renovaDe` (id do anterior) e o anterior ganha `substituidoPor` (id do novo), seja qual for o POP
 * vinculado. Anexo criado fora do "Renovar" (sem `renovaDe`) não marca nada, e comprovante antigo sem os campos continua como estava.
 * Nada é apagado. Devolve a mesma lista quando não há o que marcar.
 */
export function marcarSubstituidoNaRenovacao<T extends { id: string; substituidoPor?: string }>(lista: T[], novo: { id: string; renovaDe?: string }): T[] {
  if (!novo.renovaDe) return lista;
  let mudou = false;
  const resultado = lista.map((item) => {
    if (item.id !== novo.renovaDe || item.substituidoPor || item.id === novo.id) return item;
    mudou = true;
    return { ...item, substituidoPor: novo.id };
  });
  return mudou ? resultado : lista;
}
