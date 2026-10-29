// A auditoria só cresce (rodada 12e): nenhum registro some nem muda, nem quando o Administrador grava o estado inteiro.
// O que o servidor já tinha vale; do que chegou entram só os registros de id novo.
import type { RegistroAuditoria } from "../types/index.ts";

export function unirAuditoriaSemApagar(noServidor: RegistroAuditoria[] | undefined, recebida: RegistroAuditoria[] | undefined): RegistroAuditoria[] {
  const base = noServidor || [];
  const conhecidos = new Set(base.map((registro) => registro.id));
  const novos = (recebida || []).filter((registro) => registro && typeof registro.id === "string" && !conhecidos.has(registro.id));
  return novos.length === 0 && base.length === (recebida || []).length ? base : [...base, ...novos];
}
