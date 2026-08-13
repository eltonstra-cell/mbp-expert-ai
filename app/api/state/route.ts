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

async function ensureTable(sql: any) {
  await sql`
    CREATE TABLE IF NOT EXISTS mbp_cloud_state (
      workspace_id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
}

async function currentState(sql: any) {
  const rows = await sql`
    SELECT data, updated_at
    FROM mbp_cloud_state
    WHERE workspace_id = ${WORKSPACE_ID}
    LIMIT 1
  `;

  if (!rows.length) return { data: null, updatedAt: null };

  return {
    data: rows[0].data,
    updatedAt: rows[0].updated_at,
  };
}

export async function GET(request: Request) {
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

    const url = new URL(request.url);
    const somenteMeta = url.searchParams.get("meta") === "1";

    if (somenteMeta) {
      const rows = await sql`
        SELECT updated_at
        FROM mbp_cloud_state
        WHERE workspace_id = ${WORKSPACE_ID}
        LIMIT 1
      `;

      return NextResponse.json({
        configured: true,
        updatedAt: rows.length ? rows[0].updated_at : null,
      });
    }

    const atual = await currentState(sql);

    return NextResponse.json({
      configured: true,
      data: atual.data,
      updatedAt: atual.updatedAt,
    });
  } catch (error) {
    console.error("GET /api/state", error);
    return NextResponse.json(
      {
        configured: true,
        data: null,
        error: "Falha ao carregar dados da nuvem.",
      },
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
    const expectedUpdatedAt =
      typeof body?.expectedUpdatedAt === "string"
        ? body.expectedUpdatedAt
        : null;

    if (!data || typeof data !== "object") {
      return NextResponse.json(
        { error: "Dados inválidos." },
        { status: 400 }
      );
    }

    await ensureTable(sql);
    const payload = JSON.stringify(data);

    // Sem versão esperada, só é permitido criar uma base que ainda não existe.
    if (!expectedUpdatedAt) {
      const inserted = await sql`
        INSERT INTO mbp_cloud_state (workspace_id, data, updated_at)
        VALUES (${WORKSPACE_ID}, ${payload}::jsonb, NOW())
        ON CONFLICT (workspace_id) DO NOTHING
        RETURNING updated_at
      `;

      if (inserted.length) {
        return NextResponse.json({
          ok: true,
          configured: true,
          updatedAt: inserted[0].updated_at,
        });
      }

      const atual = await currentState(sql);
      return NextResponse.json(
        {
          ok: false,
          conflict: true,
          configured: true,
          data: atual.data,
          updatedAt: atual.updatedAt,
        },
        { status: 409 }
      );
    }

    // Só grava se a versão carregada por este aparelho ainda for a atual.
    const updated = await sql`
      UPDATE mbp_cloud_state
      SET data = ${payload}::jsonb,
          updated_at = NOW()
      WHERE workspace_id = ${WORKSPACE_ID}
        AND updated_at = ${expectedUpdatedAt}::timestamptz
      RETURNING updated_at
    `;

    if (updated.length) {
      return NextResponse.json({
        ok: true,
        configured: true,
        updatedAt: updated[0].updated_at,
      });
    }

    const atual = await currentState(sql);
    return NextResponse.json(
      {
        ok: false,
        conflict: true,
        configured: true,
        data: atual.data,
        updatedAt: atual.updatedAt,
      },
      { status: 409 }
    );
  } catch (error) {
    console.error("PUT /api/state", error);
    return NextResponse.json(
      { configured: true, error: "Falha ao salvar dados na nuvem." },
      { status: 500 }
    );
  }
}
