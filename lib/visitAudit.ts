import type { Visita } from "@/types";

export type OrigemMudancaStatus = "Relatório" | "Lista de visitas";

export function registrarMudancaStatus(
  visita: Visita,
  para: Visita["status"],
  motivo: string,
  origem: OrigemMudancaStatus,
  criadoEm = new Date().toISOString(),
  eventoId = crypto.randomUUID()
): Visita {
  if (visita.status === para) return visita;

  return {
    ...visita,
    status: para,
    encerradaEm: para === "Concluída" ? criadoEm : visita.encerradaEm,
    historicoStatus: [
      ...(visita.historicoStatus || []),
      {
        id: eventoId,
        criadoEm,
        de: visita.status,
        para,
        motivo,
        responsavel: visita.responsavel || "Usuário do sistema",
        origem,
      },
    ],
  };
}
