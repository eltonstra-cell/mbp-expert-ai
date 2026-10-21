// Quanto do checklist foi respondido e o que o percentual de conformidade quer dizer.
// Percentual conforme é só entre os itens avaliados (Conforme ÷ Conforme + Não conforme); sempre mostrado com o denominador.
import { quantidade } from "./plural.ts";

type ItemComStatus = { status: string };

export type Cobertura = {
  /** Todos os itens da visita. */
  total: number;
  /** Itens com qualquer resposta (inclui "Não se aplica"). */
  respondidos: number;
  conformes: number;
  naoConformes: number;
  naoSeAplica: number;
  pendentes: number;
  /** Itens avaliados para conformidade (conformes + não conformes). */
  avaliados: number;
  /** Conforme ÷ avaliados; null quando nada foi avaliado. */
  percentualConforme: number | null;
  /** A visita não cobriu todos os itens. */
  parcial: boolean;
};

export function coberturaDoChecklist(itens: ItemComStatus[] | undefined): Cobertura {
  const lista = itens || [];
  const conformes = lista.filter((item) => item.status === "Conforme").length;
  const naoConformes = lista.filter((item) => item.status === "Não Conforme").length;
  const naoSeAplica = lista.filter((item) => item.status === "Não se aplica").length;
  const pendentes = lista.filter((item) => item.status === "Pendente").length;
  const respondidos = lista.length - pendentes;
  const avaliados = conformes + naoConformes;
  return {
    total: lista.length,
    respondidos,
    conformes,
    naoConformes,
    naoSeAplica,
    pendentes,
    avaliados,
    percentualConforme: avaliados ? Math.round((conformes / avaliados) * 100) : null,
    parcial: lista.length > 0 && respondidos < lista.length,
  };
}

/** "Relatório parcial: 3 de 34 itens respondidos"; vazio quando a visita cobriu tudo. */
export function avisoDeRelatorioParcial(cobertura: Cobertura): string {
  if (!cobertura.parcial) return "";
  return `Relatório parcial: ${cobertura.respondidos} de ${cobertura.total} ${cobertura.total === 1 ? "item respondido" : "itens respondidos"}`;
}

/** "3 de 34 respondidos". */
export function textoRespondidos(cobertura: Pick<Cobertura, "respondidos" | "total">): string {
  return `${cobertura.respondidos} de ${cobertura.total} ${cobertura.total === 1 ? "respondido" : "respondidos"}`;
}

/** "33% conforme entre os itens avaliados (1 de 3)"; sem avaliados: "sem itens avaliados". */
export function textoDoPercentualConforme(cobertura: Cobertura): string {
  if (cobertura.percentualConforme === null) return "sem itens avaliados";
  return `${cobertura.percentualConforme}% conforme entre os itens avaliados (${cobertura.conformes} de ${cobertura.avaliados})`;
}

/** "2 não conformes, 1 não se aplica": o que a visita registrou além dos conformes. */
export function textoDasRespostas(cobertura: Cobertura): string {
  const partes = [quantidade(cobertura.conformes, "conforme", "conformes"), quantidade(cobertura.naoConformes, "não conforme", "não conformes")];
  if (cobertura.naoSeAplica > 0) partes.push(`${cobertura.naoSeAplica} não se aplica`);
  return partes.join(", ");
}
