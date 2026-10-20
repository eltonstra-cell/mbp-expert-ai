// Privacidade e guarda por empresa: campos opcionais dentro do próprio cadastro (JSON do estado), sem tabela nova.
import type { PrivacidadeEmpresa } from "../types/index.ts";

export const MENSAGEM_IA_DESLIGADA = "IA desligada nesta empresa. Peça ao Consultor/RT para liberar em Empresas › Privacidade.";

export const GUARDA_PADRAO_DIAS = 180;
export const GUARDA_OPCOES = [90, 180] as const;
export const GUARDA_MINIMA_DIAS = 30;
export const GUARDA_MAXIMA_DIAS = 730;
export const JANELA_DE_AVISO_DIAS = 30;

const DIA_MS = 24 * 60 * 60 * 1000;

type EmpresaComPrivacidade = { privacidade?: PrivacidadeEmpresa } | null | undefined;

/** IA nas fotos: padrão DESLIGADA. Só vale `liberada === true`. */
export function iaLiberada(empresa: EmpresaComPrivacidade): boolean {
  return empresa?.privacidade?.iaFotos?.liberada === true;
}

/** Já foi liberada alguma vez (a janela de aceite aparece só na primeira). */
export function iaJaFoiLiberada(empresa: EmpresaComPrivacidade): boolean {
  return !!empresa?.privacidade?.iaFotos?.liberadaEm;
}

export function liberarIa(
  privacidade: PrivacidadeEmpresa | undefined,
  quem: { id: string; nome: string },
  aceite: boolean,
  agora: string
): PrivacidadeEmpresa {
  const primeira = !privacidade?.iaFotos?.liberadaEm;
  if (primeira && !aceite) throw new Error("Marque o aceite, em nome da empresa, para liberar a IA.");
  return {
    ...privacidade,
    iaFotos: {
      ...privacidade?.iaFotos,
      liberada: true,
      liberadaPorId: quem.id,
      liberadaPorNome: quem.nome,
      liberadaEm: agora,
      aceite: primeira ? true : privacidade?.iaFotos?.aceite,
    },
  };
}

export function desligarIa(privacidade: PrivacidadeEmpresa | undefined): PrivacidadeEmpresa {
  return { ...privacidade, iaFotos: { ...privacidade?.iaFotos, liberada: false } };
}

/** "Liberado por Ana em 20/10/2026" ou vazio. */
export function textoDeLiberacao(empresa: EmpresaComPrivacidade): string {
  const ia = empresa?.privacidade?.iaFotos;
  if (!ia?.liberada || !ia.liberadaEm) return "";
  const data = new Date(ia.liberadaEm).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
  return `Liberado por ${ia.liberadaPorNome || "pessoa não identificada"} em ${data}`;
}

export function guardaDaEmpresa(empresa: EmpresaComPrivacidade): number {
  const dias = empresa?.privacidade?.guardaDias;
  return typeof dias === "number" && Number.isInteger(dias) && dias >= GUARDA_MINIMA_DIAS && dias <= GUARDA_MAXIMA_DIAS ? dias : GUARDA_PADRAO_DIAS;
}

/** Valida o prazo digitado em "Outro"; devolve a mensagem de erro ou vazio. */
export function erroDaGuarda(dias: number | null | undefined): string {
  if (dias === null || dias === undefined || !Number.isInteger(dias)) return "Informe o número de dias.";
  if (dias < GUARDA_MINIMA_DIAS || dias > GUARDA_MAXIMA_DIAS) return `Informe de ${GUARDA_MINIMA_DIAS} a ${GUARDA_MAXIMA_DIAS} dias.`;
  return "";
}

type VisitaBase = { id: string; empresaId: string; status: string; data?: string; encerradaEm?: string; historicoStatus?: { para: string; criadoEm: string }[] };
type EvidenciaBase = { visitaId: string; tipo: string };

export type VisitaComGuardaVencendo = {
  visitaId: string;
  concluidaEm: string;
  venceEm: string;
  vencida: boolean;
  fotos: number;
  audios: number;
  /** Fotos citadas em relatório emitido: ficam de fora da revisão e do descarte (e nada é apagado). */
  fotosEmRelatorio?: number;
};

/** Instante em que a visita foi concluída (encerradaEm ou o último "Concluída" do histórico). */
export function conclusaoDaVisita(visita: VisitaBase): string | null {
  if (visita.status !== "Concluída") return null;
  if (visita.encerradaEm) return visita.encerradaEm;
  const concluida = [...(visita.historicoStatus || [])].reverse().find((registro) => registro.para === "Concluída");
  return concluida?.criadoEm || null;
}

/**
 * Visitas concluídas com fotos ou áudios cujo prazo de guarda (contado da conclusão) vence nos próximos
 * `janelaDias` dias ou já passou. SÓ LÊ: nada é apagado nem marcado.
 */
export function visitasComGuardaVencendo(
  visitas: VisitaBase[],
  evidencias: EvidenciaBase[],
  guardaDias: number,
  agora: Date = new Date(),
  janelaDias: number = JANELA_DE_AVISO_DIAS,
  emRelatorioEmitido: Set<string> = new Set()
): VisitaComGuardaVencendo[] {
  const limite = agora.getTime() + janelaDias * DIA_MS;
  const resultado: VisitaComGuardaVencendo[] = [];
  for (const visita of visitas) {
    const conclusao = conclusaoDaVisita(visita);
    if (!conclusao) continue;
    const inicio = new Date(conclusao).getTime();
    if (!Number.isFinite(inicio)) continue;
    const doDia = evidencias.filter((evidencia) => evidencia.visitaId === visita.id);
    const todasAsFotos = doDia.filter((evidencia) => evidencia.tipo === "Foto");
    const fotosEmRelatorio = todasAsFotos.filter((evidencia) => emRelatorioEmitido.has((evidencia as { id?: string }).id || "")).length;
    const fotos = todasAsFotos.length - fotosEmRelatorio;
    const audios = doDia.filter((evidencia) => evidencia.tipo === "Áudio").length;
    if (fotos + audios === 0) continue;
    const vence = inicio + guardaDias * DIA_MS;
    if (vence > limite) continue;
    resultado.push({ visitaId: visita.id, concluidaEm: conclusao, venceEm: new Date(vence).toISOString(), vencida: vence < agora.getTime(), fotos, audios, fotosEmRelatorio });
  }
  return resultado.sort((a, b) => a.venceEm.localeCompare(b.venceEm));
}

export function textoDaFaixaDeGuarda(quantidade: number): string {
  return `${quantidade} ${quantidade === 1 ? "visita com fotos vence" : "visitas com fotos vencem"} nos próximos 30 dias`;
}

/** Decisão do servidor para a IA em foto: a empresa precisa ter liberado. */
export function decidirIaEmFoto(
  data: { empresas?: Record<string, EmpresaComPrivacidade> } | null | undefined,
  empresaId: string | undefined
): { ok: true } | { ok: false; motivo: string } {
  if (!empresaId || !data?.empresas?.[empresaId]) return { ok: false, motivo: "Empresa da foto não encontrada." };
  if (!iaLiberada(data.empresas[empresaId])) {
    return { ok: false, motivo: MENSAGEM_IA_DESLIGADA };
  }
  return { ok: true };
}
