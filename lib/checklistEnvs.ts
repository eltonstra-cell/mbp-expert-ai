// Faixa de ambientes do checklist: ordem fixa (a da visita) e situação só por cálculo.
import { SETORES_OFICIAIS_MANUAL } from "./manualBase.ts";
import { nomeExibidoDoSetor } from "./nomesDeSetor.ts";

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
/** Nome do ambiente como a empresa cadastrou, igual em todas as telas e documentos (não há mais nome "padronizado" que troque "Câmara fria" por outro). */
export function nomeDeExibicaoDoAmbiente(nome: string): string {
  return nome;
}

/** Nome curto para títulos apertados ("Recebimento de matérias-primas, ingredientes e embalagens" -> "Recebimento"); o nome completo vai no title. */
export function nomeCurtoDoAmbiente(nome: string): string {
  const curto = nome.split(/\s*[,(/]\s*|\s+de\s+|\s+e\s+/)[0].trim();
  return curto && curto.length >= 3 ? curto : nome;
}

/**
 * Nome para a lista do seletor de ambientes: setor oficial pelo nome exibido curto ("Recebimento", "Cozinha", "Banheiro feminino · clientes"), os demais pelo
 * nome curto do ambiente. Só apresentação (os valores gravados não mudam). Se dois nomes curtos ficarem iguais, esses usam o nome completo para não confundir.
 */
export function rotulosCurtosDosAmbientes(rotulos: string[]): string[] {
  const curtos = rotulos.map((rotulo) => ((SETORES_OFICIAIS_MANUAL as readonly string[]).includes(rotulo) ? nomeExibidoDoSetor(rotulo) : nomeCurtoDoAmbiente(rotulo)));
  return curtos.map((curto, indice) => (curtos.filter((outro) => outro === curto).length > 1 ? rotulos[indice] : curto));
}

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
      rotulo: nomeDeExibicaoDoAmbiente(rotulo),
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

/** Quantos ambientes (não gerais) estão completos: o "N concluído(s)" do cabeçalho da janela de ambientes. */
export function quantidadeConcluida(infos: InfoAmbiente[]): number {
  return infos.filter((info) => !info.geral && info.total > 0 && info.respondidos >= info.total).length;
}

/** "14 ambientes · 1 concluído" (singular e plural certos). */
export function resumoDaJanelaDeAmbientes(infos: InfoAmbiente[]): string {
  const total = quantidadeDeAmbientes(infos);
  const feitos = quantidadeConcluida(infos);
  return `${total} ${total === 1 ? "ambiente" : "ambientes"} · ${feitos} ${feitos === 1 ? "concluído" : "concluídos"}`;
}

/** "Ambiente 3 de 14 · 3 de 13 respondidas · 23%". Verificação geral (Programas de Controle) não tem posição: começa em "Verificação geral". */
export function linhaDeProgressoDoAmbiente(infos: InfoAmbiente[], atual: string | null): string {
  const info = infos.find((candidato) => candidato.nome === atual);
  if (!info) return "";
  const percentual = info.total > 0 ? Math.round((info.respondidos / info.total) * 100) : 0;
  const contas = `${info.respondidos} de ${info.total} respondidas · ${percentual}%`;
  if (info.geral) return `Verificação geral · ${contas}`;
  const fisicos = infos.filter((candidato) => !candidato.geral);
  const posicao = fisicos.findIndex((candidato) => candidato.nome === info.nome) + 1;
  return `Ambiente ${posicao} de ${fisicos.length} · ${contas}`;
}
