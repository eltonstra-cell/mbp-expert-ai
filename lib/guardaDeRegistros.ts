// Guarda dos registros de execução de POP (rodada 12e): enquanto o registro estiver no prazo de guarda, ele não pode ser excluído.
// O prazo NÃO é escrito aqui: vem das normas aplicadas à empresa (lib/normas: RDC 216/2004 item 4.11.3 = 30 dias; Portaria SES/RS
// 799/2023 Anexo I, 13.2 = 90 dias) pela função que já existia, `guardaDosRegistros`. Vale o prazo MAIS RÍGIDO (o maior) entre o da
// norma estadual aplicada, o definido pelo RT e o da norma federal. Esses dois itens do catálogo estão marcados "conferir": os PDFs da
// RDC 216 e da Portaria 799 não estavam nas pastas do usuário nem no repositório, então o texto oficial ainda não foi confrontado.
// Regra de produto: o registro de POP já nunca é editado (a correção vira um registro novo que cita o anterior); aqui só se impede excluir.
import type { Empresa } from "../types/index.ts";
import { guardaDosRegistros } from "./registrosEmpresa.ts";

type EmpresaDaGuarda = Pick<Empresa, "normasAplicadas" | "guardaRegistrosDias">;

const DIA_EM_MS = 24 * 60 * 60 * 1000;
/** Sem nenhuma norma com prazo e sem prazo do RT: vale o menor prazo conhecido (RDC 216), nunca zero. */
const GUARDA_MINIMA_DIAS = 30;

export function diasDeGuardaParaExclusao(empresa: EmpresaDaGuarda | undefined): number {
  if (!empresa) return GUARDA_MINIMA_DIAS;
  const guarda = guardaDosRegistros(empresa);
  return Math.max(guarda.dias ?? 0, guarda.sugestaoDias ?? 0, GUARDA_MINIMA_DIAS);
}

/** O registro (data/hora de criação em ISO) ainda está no prazo de guarda? `agora` em ISO. */
export function registroEmGuarda(criadoEm: string, empresa: EmpresaDaGuarda | undefined, agora: string): boolean {
  const criado = Date.parse(criadoEm);
  const hoje = Date.parse(agora);
  if (!Number.isFinite(criado) || !Number.isFinite(hoje)) return true;
  return hoje - criado < diasDeGuardaParaExclusao(empresa) * DIA_EM_MS;
}

export function motivoDaGuarda(empresa: EmpresaDaGuarda | undefined): string {
  return `Registro em guarda: não pode ser excluído por ${diasDeGuardaParaExclusao(empresa)} dias.`;
}

/** Devolve os registros que sumiram e ainda estão em guarda (vale também para o Administrador, que grava o estado inteiro). */
export function restaurarRegistrosEmGuarda<T extends { id: string; empresaId: string; criadoEm: string }>(
  antes: T[] | undefined,
  depois: T[] | undefined,
  empresaDe: (empresaId: string) => EmpresaDaGuarda | undefined,
  agora: string
): T[] {
  const restam = new Set((depois || []).map((registro) => registro.id));
  const faltando = (antes || []).filter((registro) => !restam.has(registro.id) && registroEmGuarda(registro.criadoEm, empresaDe(registro.empresaId), agora));
  return faltando.length ? [...(depois || []), ...faltando] : depois || [];
}
