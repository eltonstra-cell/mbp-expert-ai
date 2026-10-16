// Rótulos do relatório que dependem da situação da visita e do tipo de emissão.

export type TipoDeEmissao = "previa" | "parcial" | "oficial";

/** Rótulo pequeno acima do título do relatório. Visita em andamento nunca é "encerramento". */
export function rotuloDoRelatorio(statusDaVisita: "Em andamento" | "Concluída"): string {
  return statusDaVisita === "Concluída" ? "Encerramento da inspeção" : "Relatório parcial";
}

/** Selo impresso no rodapé de TODAS as páginas do PDF; vazio na versão oficial. */
export function seloDoPdf(tipo: TipoDeEmissao): string {
  if (tipo === "parcial") return "RELATÓRIO PARCIAL";
  if (tipo === "previa") return "PRÉVIA";
  return "";
}
