// Guarda dos registros de execução de POP (rodada 12e): enquanto o registro estiver no prazo de guarda, ele não pode ser excluído.
// O prazo vem do TEXTO da norma, que o repositório ainda não traz: os PDFs da RDC 216/2004 e da Portaria SES/RS 799/2023 não estavam
// nas pastas do usuário nem no repositório. Por isso os dias abaixo são a decisão pedida pelo dono (RS: 90 dias; demais UF: 30 dias,
// o mais rígido que se aplica) e estão marcados "conferir": confirmar o prazo com o texto da norma antes de tratar como exigência legal.
// Regra de produto: o registro de POP já nunca é editado (a correção vira um registro novo que cita o anterior); aqui só se impede excluir.
export const GUARDA_POR_UF: Record<string, { dias: number; fonte: string }> = {
  RS: { dias: 90, fonte: "Portaria SES/RS 799/2023 (conferir no texto)" },
};
export const GUARDA_PADRAO = { dias: 30, fonte: "RDC 216/2004 (conferir no texto)" };

export function guardaDeRegistrosDaUf(uf: string | undefined): { dias: number; fonte: string } {
  const sigla = (uf || "").trim().toUpperCase();
  return GUARDA_POR_UF[sigla] || GUARDA_PADRAO;
}

const DIA_EM_MS = 24 * 60 * 60 * 1000;

/** O registro (data/hora de criação em ISO) ainda está no prazo de guarda? `agora` em ISO. */
export function registroEmGuarda(criadoEm: string, uf: string | undefined, agora: string): boolean {
  const criado = Date.parse(criadoEm);
  const hoje = Date.parse(agora);
  if (!Number.isFinite(criado) || !Number.isFinite(hoje)) return true;
  return hoje - criado < guardaDeRegistrosDaUf(uf).dias * DIA_EM_MS;
}

export function motivoDaGuarda(uf: string | undefined): string {
  const guarda = guardaDeRegistrosDaUf(uf);
  return `Registro em guarda: não pode ser excluído por ${guarda.dias} dias (${guarda.fonte}).`;
}

/** Quais registros do estado antigo sumiram no novo estado e ainda estavam em guarda (o servidor devolve esses). */
export function registrosExcluidosEmGuarda<T extends { id: string; criadoEm: string }>(antes: T[] | undefined, depois: T[] | undefined, uf: string | undefined, agora: string): T[] {
  const restam = new Set((depois || []).map((registro) => registro.id));
  return (antes || []).filter((registro) => !restam.has(registro.id) && registroEmGuarda(registro.criadoEm, uf, agora));
}

/** Devolve os registros que sumiram e ainda estão em guarda (vale também para o Administrador, que grava o estado inteiro). */
export function restaurarRegistrosEmGuarda<T extends { id: string; empresaId: string; criadoEm: string }>(
  antes: T[] | undefined,
  depois: T[] | undefined,
  ufDaEmpresa: (empresaId: string) => string | undefined,
  agora: string
): T[] {
  const restam = new Set((depois || []).map((registro) => registro.id));
  const faltando = (antes || []).filter((registro) => !restam.has(registro.id) && registroEmGuarda(registro.criadoEm, ufDaEmpresa(registro.empresaId), agora));
  return faltando.length ? [...(depois || []), ...faltando] : depois || [];
}
