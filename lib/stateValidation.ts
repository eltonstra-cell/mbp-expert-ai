export const DEFAULT_MAX_STATE_BYTES = 4 * 1024 * 1024;

// Limite do estado enviado por quem não é administrador. Configurável pela
// variável MBP_MAX_STATE_BYTES (inteiro positivo, em bytes).
export function resolverLimiteEstado(
  env: Record<string, string | undefined>
): number {
  const bruto = Number(env.MBP_MAX_STATE_BYTES);
  return Number.isInteger(bruto) && bruto > 0 ? bruto : DEFAULT_MAX_STATE_BYTES;
}

export function estadoExcedeLimite(bytes: number, limite: number): boolean {
  return bytes > limite;
}

const CHAVES_CONHECIDAS = new Set([
  "empresas",
  "empresaAtualId",
  "visitas",
  "ncs",
  "evidencias",
  "usuarios",
  "registrosAuditoria",
  "configuracaoAcesso",
  "registrosPop",
  "comprovantes",
  "colaboradores",
  "capacitacoes",
  "leiturasPop",
]);

// Coleções que a mesclagem do servidor percorre: precisam existir como lista
// (ou mapa, no caso de empresas), senão a gravação falharia no meio.
const COLECOES_OBRIGATORIAS = ["visitas", "ncs", "evidencias"] as const;
const COLECOES_OPCIONAIS = ["usuarios", "registrosAuditoria", "registrosPop", "comprovantes", "colaboradores", "capacitacoes", "leiturasPop"] as const;

export type ValidacaoEstado =
  | { ok: true; estado: Record<string, unknown> }
  | { ok: false; motivo: string };

function objetoSimples(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === "object" && valor !== null && !Array.isArray(valor);
}

function listaComId(valor: unknown): boolean {
  return (
    Array.isArray(valor) &&
    valor.every(
      (item) => objetoSimples(item) && typeof item.id === "string" && item.id !== ""
    )
  );
}

// Valida a forma do estado enviado por quem não é administrador. Chaves de topo
// desconhecidas são descartadas (não geram erro); o estado devolvido contém só
// as chaves de AppDB. Rejeita apenas o que é realmente inválido. (O app sempre
// envia as chaves de AppDB.)
export function validarFormaDoEstado(data: unknown): ValidacaoEstado {
  if (!objetoSimples(data)) return { ok: false, motivo: "O estado deve ser um objeto." };

  if (!objetoSimples(data.empresas)) {
    return { ok: false, motivo: "empresas deve ser um objeto." };
  }
  for (const empresa of Object.values(data.empresas)) {
    if (!objetoSimples(empresa)) {
      return { ok: false, motivo: "empresas contém item inválido." };
    }
  }

  for (const chave of COLECOES_OBRIGATORIAS) {
    if (!listaComId(data[chave])) {
      return { ok: false, motivo: `${chave} deve ser uma lista de itens com id.` };
    }
  }
  for (const chave of COLECOES_OPCIONAIS) {
    if (data[chave] !== undefined && !listaComId(data[chave])) {
      return { ok: false, motivo: `${chave} deve ser uma lista de itens com id.` };
    }
  }

  const atual = data.empresaAtualId;
  if (atual !== undefined && atual !== null && typeof atual !== "string") {
    return { ok: false, motivo: "empresaAtualId inválido." };
  }
  if (data.configuracaoAcesso !== undefined && !objetoSimples(data.configuracaoAcesso)) {
    return { ok: false, motivo: "configuracaoAcesso inválido." };
  }

  const estado: Record<string, unknown> = {};
  for (const chave of Object.keys(data)) {
    if (CHAVES_CONHECIDAS.has(chave)) estado[chave] = data[chave];
  }
  return { ok: true, estado };
}
