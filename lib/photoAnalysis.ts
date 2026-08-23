import type { AnaliseFotoIA } from "@/types";

export type ResultadoFotoIA = Pick<
  AnaliseFotoIA,
  | "analisavel"
  | "resumo"
  | "classificacao"
  | "achados"
  | "alertasPrivacidade"
  | "observacoesLimitacoes"
>;

export function montarTextoRevisao(resultado: ResultadoFotoIA): string {
  const partes = [
    resultado.resumo.trim(),
    ...resultado.achados.map((achado) =>
      `${achado.titulo.trim()}: ${achado.descricao.trim()}`.trim()
    ),
  ].filter(Boolean);

  return Array.from(new Set(partes)).join("\n");
}

export function registrarSugestaoFotoIA(
  resultado: ResultadoFotoIA,
  modelo: string,
  geradaEm = new Date().toISOString(),
  id = crypto.randomUUID()
): AnaliseFotoIA {
  return {
    id,
    status: "Aguardando revisão",
    modelo,
    geradaEm,
    ...resultado,
    textoRevisado: montarTextoRevisao(resultado),
  };
}

export function confirmarSugestaoFotoIA(
  analise: AnaliseFotoIA,
  textoRevisado: string,
  responsavel: string,
  revisadaEm = new Date().toISOString()
): AnaliseFotoIA {
  const texto = textoRevisado.trim();
  if (!texto) {
    throw new Error("Revise e mantenha ao menos uma descrição antes de confirmar.");
  }

  return {
    ...analise,
    status: "Confirmada",
    textoRevisado: texto,
    revisadaEm,
    revisadaPor: responsavel.trim() || "Profissional responsável",
  };
}

export function descartarSugestaoFotoIA(
  analise: AnaliseFotoIA,
  responsavel: string,
  revisadaEm = new Date().toISOString()
): AnaliseFotoIA {
  return {
    ...analise,
    status: "Descartada",
    revisadaEm,
    revisadaPor: responsavel.trim() || "Profissional responsável",
  };
}

export function ultimaAnaliseConfirmada(
  analises: AnaliseFotoIA[] | undefined
): AnaliseFotoIA | undefined {
  return [...(analises || [])]
    .reverse()
    .find((analise) => analise.status === "Confirmada");
}
