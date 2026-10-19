import { nomeSemNumerosNoInicio } from "./navigation.ts";

// Rótulos do relatório que dependem da situação da visita e do tipo de emissão.

export type TipoDeEmissao = "previa" | "parcial" | "oficial";

/**
 * Rótulo pequeno acima do título do relatório. Visita em andamento nunca é "encerramento".
 * Não usa as palavras do selo (Prévia, Parcial, Oficial): o modo da emissão é só o selo; a situação da inspeção é outra etiqueta.
 */
export function rotuloDoRelatorio(statusDaVisita: "Em andamento" | "Concluída"): string {
  return statusDaVisita === "Concluída" ? "Encerramento da inspeção" : "Relatório técnico";
}

/** Selo do modo da emissão: o MESMO texto no cabeçalho e no rodapé de todas as páginas do PDF. */
export function seloDoPdf(tipo: TipoDeEmissao): string {
  if (tipo === "parcial") return "RELATÓRIO PARCIAL";
  if (tipo === "previa") return "PRÉVIA";
  return "VERSÃO OFICIAL";
}

function semAcentos(texto: string): string {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/** Aceita "2026-08-10" ou "10/08/2026" e devolve "2026-08-10"; sem data válida, vazio. */
export function dataParaArquivo(data: string): string {
  const texto = (data || "").trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(texto);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(texto);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return "";
}

/** relatorio-tecnico-{empresa}-{data da visita}-{parcial|previa|oficial}.pdf */
export function nomeDoArquivoPdf(empresa: string, dataDaVisita: string, tipo: TipoDeEmissao): string {
  const nome = semAcentos(nomeSemNumerosNoInicio(empresa || ""))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `relatorio-tecnico-${nome || "empresa"}-${dataParaArquivo(dataDaVisita) || "sem-data"}-${tipo}.pdf`;
}
