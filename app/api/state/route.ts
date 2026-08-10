import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKSPACE_ID = process.env.MBP_WORKSPACE_ID || "principal";

function getSql() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureTable(sql: ReturnType<typeof neon>) {
  await sql`
    CREATE TABLE IF NOT EXISTS mbp_cloud_state (
      workspace_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

export async function GET() {
  const sql = getSql();

  if (!sql) {
    return NextResponse.json({
      configured: false,
      data: null,
      message: "DATABASE_URL não configurada.",
    });
  }

  try {
    await ensureTable(sql);

    const rows = await sql`
      SELECT data, updated_at
      FROM mbp_cloud_state
      WHERE workspace_id = ${WORKSPACE_ID}
      LIMIT 1
    `;

    if (!rows.length) {
      return NextResponse.json({
        configured: true,
        data: null,
        updatedAt: null,
      });
    }

    return NextResponse.json({
      configured: true,
      data: rows[0].data,
      updatedAt: rows[0].updated_at,
    });
  } catch (error) {
    console.error("GET /api/state", error);
    return NextResponse.json(
      { configured: true, data: null, error: "Falha ao carregar dados da nuvem." },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  const sql = getSql();

  if (!sql) {
    return NextResponse.json(
      { configured: false, error: "DATABASE_URL não configurada." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const data = body?.data;

    if (!data || typeof data !== "object") {
      return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
    }

    await ensureTable(sql);

    const payload = JSON.stringify(data);
    const rows = await sql`
      INSERT INTO mbp_cloud_state (workspace_id, data, updated_at)
      VALUES (${WORKSPACE_ID}, ${payload}::jsonb, NOW())
      ON CONFLICT (workspace_id)
      DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
      RETURNING updated_at
    `;

    return NextResponse.json({
      ok: true,
      configured: true,
      updatedAt: rows[0]?.updated_at || null,
    });
  } catch (error) {
    console.error("PUT /api/state", error);
    return NextResponse.json(
      { configured: true, error: "Falha ao salvar dados na nuvem." },
      { status: 500 }
    );
  }
}
