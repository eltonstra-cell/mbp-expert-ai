import { neon } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { resolveNeonDatabaseUrl } from "@/lib/neonConnection";
import { emitirNoArmazem, type ArmazemDeEmissao } from "@/lib/relatorioEmitido";
import { obterAcessoServidor } from "@/lib/serverAccess";
import type { AppDB } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKSPACE_ID = process.env.MBP_WORKSPACE_ID || "principal";

// Emite o relatório da visita no servidor: atribui o número (PC-AAAA-NNNN), guarda o instantâneo e a assinatura do RT.
// Só RT e Administrador. A gravação compara a versão do estado, então duas emissões ao mesmo tempo nunca repetem o número.
export async function POST(request: Request) {
  try {
    const url = resolveNeonDatabaseUrl(process.env);
    if (!url) return NextResponse.json({ error: "Conexão do Neon não configurada." }, { status: 503 });
    const sql = neon(url);
    const corpo = await request.json().catch(() => null);
    const visitaId = typeof corpo?.visitaId === "string" ? corpo.visitaId.trim() : "";
    if (!visitaId) return NextResponse.json({ error: "Visita não informada." }, { status: 400 });

    const acesso = await obterAcessoServidor();
    if (acesso.aplicado && !acesso.autorizado) {
      return NextResponse.json({ error: "Sessão necessária para emitir o relatório." }, { status: 401 });
    }
    const emissor = acesso.aplicado ? acesso.usuario : null;

    const armazem: ArmazemDeEmissao = {
      ler: async () => {
        const linhas = await sql`
          SELECT data, updated_at FROM mbp_cloud_state WHERE workspace_id = ${WORKSPACE_ID} LIMIT 1
        `;
        if (!linhas.length) throw new Error("estado-ausente");
        return { data: linhas[0].data as AppDB, versao: new Date(linhas[0].updated_at).toISOString() };
      },
      gravar: async (relatorios, versaoEsperada) => {
        const gravadas = await sql`
          UPDATE mbp_cloud_state
          SET data = jsonb_set(data, '{relatoriosEmitidos}', ${JSON.stringify(relatorios)}::jsonb, true),
              updated_at = date_trunc('milliseconds', clock_timestamp())
          WHERE workspace_id = ${WORKSPACE_ID}
            AND date_trunc('milliseconds', updated_at) = ${versaoEsperada}::timestamptz
          RETURNING updated_at
        `;
        return gravadas.length > 0;
      },
    };

    const resultado = await emitirNoArmazem(
      armazem,
      { visitaId, novaVersao: Boolean(corpo?.novaVersao), motivo: typeof corpo?.motivo === "string" ? corpo.motivo : undefined },
      emissor,
      () => new Date(),
      () => crypto.randomUUID(),
      typeof corpo?.nomeLocal === "string" ? corpo.nomeLocal.slice(0, 120) : undefined
    );
    if (!resultado.ok) return NextResponse.json({ error: resultado.erro }, { status: resultado.status });
    return NextResponse.json({ ok: true, relatorio: resultado.relatorio });
  } catch (error) {
    console.error("POST /api/relatorios/emitir", error instanceof Error ? error.name : "erro");
    return NextResponse.json({ error: "Não foi possível emitir o relatório agora." }, { status: 500 });
  }
}
