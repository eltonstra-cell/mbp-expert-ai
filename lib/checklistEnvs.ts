// Faixa de ambientes do checklist: ordem fixa (a da visita) e situação só por cálculo.

export type SituacaoAmbiente = "nc" | "avaliacao" | "pendente" | "concluido";

export type ItemParaResumo = {
  ambiente: string;
  status: "Pendente" | "Conforme" | "Não Conforme" | "Não se aplica";
};

export type InfoAmbiente = {
  nome: string;
  rotulo: string;
  total: number;
  respondidos: number;
  naoConformes: number;
  situacao: SituacaoAmbiente;
  /** Verificação geral (ex.: Programas de Controle): não é um ambiente físico e não entra na contagem. */
  geral: boolean;
};

export type AmbienteGeral = { nome: string; rotulo: string };

function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

export function situacaoDoAmbiente(
  total: number,
  respondidos: number,
  naoConformes: number
): SituacaoAmbiente {
  if (naoConformes > 0) return "nc";
  if (total > 0 && respondidos === total) return "concluido";
  if (respondidos > 0) return "avaliacao";
  return "pendente";
}

/**
 * UMA fonte para o menu e para a lista: os ambientes reais vêm de `ordem` (a ordem da visita,
 * nunca reordenada) e as verificações gerais entram depois, marcadas como `geral`.
 */
export function resumoAmbientes(
  ordem: string[],
  itens: ItemParaResumo[],
  gerais: AmbienteGeral[] = []
): InfoAmbiente[] {
  const unicos = ordem.filter((nome, indice) => ordem.indexOf(nome) === indice);
  const montar = (nome: string, rotulo: string, geral: boolean): InfoAmbiente => {
    const doAmbiente = itens.filter((item) => item.ambiente === nome);
    const respondidos = doAmbiente.filter((item) => item.status !== "Pendente").length;
    const naoConformes = doAmbiente.filter((item) => item.status === "Não Conforme").length;
    return {
      nome,
      rotulo,
      total: doAmbiente.length,
      respondidos,
      naoConformes,
      situacao: situacaoDoAmbiente(doAmbiente.length, respondidos, naoConformes),
      geral,
    };
  };
  return [
    ...unicos.map((nome) => montar(nome, nome, false)),
    ...gerais.filter((g) => !unicos.includes(g.nome)).map((g) => montar(g.nome, g.rotulo, true)),
  ];
}

export function quantidadeDeAmbientes(infos: InfoAmbiente[]): number {
  return infos.filter((info) => !info.geral).length;
}

export type GrupoSituacao = { situacao: SituacaoAmbiente; rotulo: string; itens: InfoAmbiente[] };

const ORDEM_GRUPOS: { situacao: SituacaoAmbiente; rotulo: string }[] = [
  { situacao: "nc", rotulo: "Não conformes" },
  { situacao: "avaliacao", rotulo: "Em avaliação" },
  { situacao: "pendente", rotulo: "Pendentes" },
  { situacao: "concluido", rotulo: "Concluídos" },
];

/** Agrupa por situação mantendo, dentro de cada grupo, a ordem da visita. */
export function agruparPorSituacao(infos: InfoAmbiente[]): GrupoSituacao[] {
  return ORDEM_GRUPOS.map(({ situacao, rotulo }) => ({
    situacao,
    rotulo,
    itens: infos.filter((info) => info.situacao === situacao),
  }));
}

export function filtrarAmbientes(infos: InfoAmbiente[], busca: string): InfoAmbiente[] {
  const termo = normalizar(busca);
  if (!termo) return infos;
  return infos.filter((info) => normalizar(info.rotulo).includes(termo));
}

/** Próximo/anterior pela ordem da visita; null nas pontas. */
export function vizinhoDoAmbiente(infos: InfoAmbiente[], atual: string | null, passo: 1 | -1): string | null {
  const indice = infos.findIndex((info) => info.nome === atual);
  if (indice < 0) return null;
  return infos[indice + passo]?.nome ?? null;
}
