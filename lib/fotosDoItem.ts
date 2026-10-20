// Fotos por item do checklist (até 5), carimbo gravado pelo app e par antes/depois da correção.
// Nada de GPS: o "local" da foto é o ambiente da visita (localização de quem trabalha é dado pessoal).
import type { Evidencia, NaoConformidade, UsuarioSistema } from "../types/index.ts";

export const MAX_FOTOS_POR_ITEM = 5;

type FotoDoItem = Pick<Evidencia, "tipo" | "visitaId" | "checklistItemId" | "papel">;

/** Fotos que contam no limite do item: as "depois" das correções têm lugar próprio. */
export function fotosDoItem<T extends FotoDoItem>(evidencias: T[], visitaId: string, checklistItemId: string): T[] {
  return evidencias.filter((ev) => ev.tipo === "Foto" && ev.visitaId === visitaId && ev.checklistItemId === checklistItemId && ev.papel !== "depois");
}

export function podeAdicionarFotoNoItem(evidencias: FotoDoItem[], visitaId: string, checklistItemId: string): boolean {
  return fotosDoItem(evidencias, visitaId, checklistItemId).length < MAX_FOTOS_POR_ITEM;
}

export const MENSAGEM_LIMITE_DE_FOTOS = `Este item já tem ${MAX_FOTOS_POR_ITEM} fotos. Remova uma para registrar outra.`;

export type CarimboDaEvidencia = { criadoEm: string; ambiente: string; registradoPorId?: string; registradoPorNome?: string };

/**
 * No servidor: o carimbo (data e hora da captura, ambiente e quem registrou) é gravado uma vez e não muda.
 * Evidência que já existia volta ao carimbo gravado; evidência nova leva quem está logado.
 */
export function protegerCarimboDasEvidencias(atuais: Evidencia[], recebidas: Evidencia[], usuario: Pick<UsuarioSistema, "id" | "nome">, empresaIds: Set<string>): Evidencia[] {
  const gravadas = new Map(atuais.map((ev) => [ev.id, ev]));
  const contagem = new Map<string, number>();
  const resultado: Evidencia[] = [];
  for (const ev of recebidas) {
    if (!empresaIds.has(ev.empresaId)) {
      resultado.push(ev);
      continue;
    }
    const antiga = gravadas.get(ev.id);
    if (antiga) {
      resultado.push({ ...ev, criadoEm: antiga.criadoEm, ambiente: antiga.ambiente, registradoPorId: antiga.registradoPorId, registradoPorNome: antiga.registradoPorNome });
      continue;
    }
    // Evidência nova: no máximo 5 fotos por item (as "depois" não contam) e o registrador é quem está logado.
    if (ev.tipo === "Foto" && ev.checklistItemId && ev.papel !== "depois") {
      const chave = `${ev.visitaId}|${ev.checklistItemId}`;
      const jaNoItem = fotosDoItem(atuais, ev.visitaId, ev.checklistItemId).length + (contagem.get(chave) || 0);
      if (jaNoItem >= MAX_FOTOS_POR_ITEM) continue;
      contagem.set(chave, (contagem.get(chave) || 0) + 1);
    }
    resultado.push({ ...ev, registradoPorId: usuario.id, registradoPorNome: usuario.nome });
  }
  return resultado;
}

export type ComprovacaoDaCorrecao = {
  antes: Evidencia[];
  depois: Evidencia[];
  /** Resolvida sem nenhuma foto do depois: o relatório mostra "sem comprovação". */
  semComprovacao: boolean;
};

/** Par antes/depois: o antes é a evidência da não conformidade; o depois é o que foi anexado ao resolver. */
export function comprovacaoDaCorrecao(nc: Pick<NaoConformidade, "id" | "status" | "checklistItemId" | "visitaId">, evidencias: Evidencia[]): ComprovacaoDaCorrecao {
  const doNc = evidencias.filter((ev) => ev.tipo === "Foto" && (ev.ncId === nc.id || (ev.visitaId === nc.visitaId && !!nc.checklistItemId && ev.checklistItemId === nc.checklistItemId)));
  const depois = doNc.filter((ev) => ev.papel === "depois");
  const antes = doNc.filter((ev) => ev.papel !== "depois");
  return { antes, depois, semComprovacao: nc.status === "Resolvida" && depois.length === 0 };
}
