import { neon } from "@neondatabase/serverless";
import { getNeonAuth } from "@/lib/auth/server";
import { resolveNeonDatabaseUrl } from "@/lib/neonConnection";
import { podeExecutar } from "@/lib/permissions";
import { localizarUsuarioAutenticado } from "@/lib/stateAccess";
import type { AcaoPermissao, AppDB, UsuarioSistema } from "@/types";

const WORKSPACE_ID = process.env.MBP_WORKSPACE_ID || "principal";

export type AcessoServidor =
  | { aplicado: false; autorizado: true; data: null; usuario: null }
  | { aplicado: true; autorizado: false; data: null; usuario: null }
  | { aplicado: true; autorizado: true; data: AppDB; usuario: UsuarioSistema };

export async function obterAcessoServidor(): Promise<AcessoServidor> {
  if (process.env.ACCESS_CONTROL_MODE !== "active") {
    return { aplicado: false, autorizado: true, data: null, usuario: null };
  }

  const auth = getNeonAuth();
  const databaseUrl = resolveNeonDatabaseUrl(process.env);
  if (!auth || !databaseUrl) {
    return { aplicado: true, autorizado: false, data: null, usuario: null };
  }

  const { data: session, error } = await auth.getSession();
  const sessionUser = session?.user as { id?: unknown; email?: unknown } | undefined;
  if (error || !sessionUser) {
    return { aplicado: true, autorizado: false, data: null, usuario: null };
  }

  const authId = typeof sessionUser.id === "string" ? sessionUser.id.trim() : "";
  const email = typeof sessionUser.email === "string" ? sessionUser.email.trim() : "";
  if (!authId || !email) {
    return { aplicado: true, autorizado: false, data: null, usuario: null };
  }

  const sql = neon(databaseUrl);
  const rows = await sql`
    SELECT data
    FROM mbp_cloud_state
    WHERE workspace_id = ${WORKSPACE_ID}
    LIMIT 1
  `;
  const data = (rows[0]?.data || null) as AppDB | null;
  if (!data) {
    return { aplicado: true, autorizado: false, data: null, usuario: null };
  }

  const encontrado = localizarUsuarioAutenticado(data, authId, email);
  if (!encontrado || encontrado.status === "Suspenso") {
    return { aplicado: true, autorizado: false, data: null, usuario: null };
  }

  const usuario =
    encontrado.status === "Convidado"
      ? { ...encontrado, status: "Ativo" as const }
      : encontrado;
  return { aplicado: true, autorizado: true, data, usuario };
}

export function autorizaAcaoServidor(
  acesso: AcessoServidor,
  acao: AcaoPermissao,
  empresaId?: string
): boolean {
  if (!acesso.aplicado) return true;
  return acesso.autorizado && podeExecutar(acesso.usuario, acao, empresaId);
}
