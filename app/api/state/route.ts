import { NextResponse } from "next/server";
import { isAccessControlActive } from "@/lib/accessMode";
import { neon } from "@neondatabase/serverless";
import { resolveNeonDatabaseUrl } from "@/lib/neonConnection";
import { getNeonAuth } from "@/lib/auth/server";
import {
  filtrarEstadoPorUsuario,
  localizarUsuarioAutenticado,
  mesclarEstadoPorUsuario,
} from "@/lib/stateAccess";
import { validarRemocaoDeUsuarios } from "@/lib/userManagement";
import {
  estadoExcedeLimite,
  resolverLimiteEstado,
  validarFormaDoEstado,
} from "@/lib/stateValidation";
import { acessoVigente } from "@/lib/validadeDeAcesso";
import { validarAprovacoesDePop } from "@/lib/popsNorma";
import { preservarEvidenciasEmRelatorio } from "@/lib/relatorioEmitido";
import type { AppDB, UsuarioSistema } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKSPACE_ID = process.env.MBP_WORKSPACE_ID || "principal";

function getSql() {
  // Resolução e falha segura em lib/neonConnection.ts (NOVO_NEON_* antes de DATABASE_URL).
  const url = resolveNeonDatabaseUrl(process.env);
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

async function usuarioDaRequisicao(
  data: AppDB | null
): Promise<{ usuario: UsuarioSistema; authId: string } | null> {
  if (!isAccessControlActive(process.env)) return null;
  const auth = getNeonAuth();
  if (!auth || !data) return null;

  const { data: session, error } = await auth.getSession();
  const user = session?.user as { id?: unknown; email?: unknown } | undefined;
  if (error || !user) return null;

  const authId = typeof user.id === "string" ? user.id.trim() : "";
  const email = typeof user.email === "string" ? user.email.trim() : "";
  if (!authId || !email) return null;

  const usuario = localizarUsuarioAutenticado(data, authId, email);
  if (!usuario || usuario.status === "Suspenso" || !acessoVigente(usuario)) return null;
  return { usuario, authId };
}

async function sessaoValida(): Promise<boolean> {
  const auth = getNeonAuth();
  if (!auth) return false;
  const { data: session, error } = await auth.getSession();
  const user = session?.user as { id?: unknown; email?: unknown } | undefined;
  return !error && typeof user?.id === "string" && !!user.id.trim();
}

export async function GET(request: Request) {
  const sql = getSql();

  if (!sql) {
    return NextResponse.json({
      configured: false,
      data: null,
      message: "Conexão do Neon não configurada.",
    });
  }

  try {
    await ensureTable(sql);

    const url = new URL(request.url);
    const somenteMeta = url.searchParams.get("meta") === "1";

    if (somenteMeta) {
      // Consulta leve: exige apenas sessão válida (sem ler o estado completo).
      if (isAccessControlActive(process.env) && !(await sessaoValida())) {
        return NextResponse.json(
          { error: "Sessão necessária." },
          { status: 401 }
        );
      }

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
    let data = atual.data as AppDB | null;

    if (isAccessControlActive(process.env)) {
      const acesso = await usuarioDaRequisicao(data);
      if (!acesso || !data) {
        return NextResponse.json(
          { error: "Usuário sem acesso liberado ao sistema." },
          { status: 403 }
        );
      }
      data = filtrarEstadoPorUsuario(data, acesso.usuario);
    }

    return NextResponse.json({
      configured: true,
      data,
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
      {
        configured: false,
        error: "Conexão do Neon não configurada.",
      },
      { status: 503 }
    );
  }

  try {
    const corpoBruto = await request.text();
    let body: any;
    try {
      body = JSON.parse(corpoBruto);
    } catch {
      return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
    }
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
    const atualAntesDaGravacao = await currentState(sql);
    let dadosParaGravar = data as AppDB;

    if (isAccessControlActive(process.env)) {
      const estadoAtual = atualAntesDaGravacao.data as AppDB | null;
      const acesso = await usuarioDaRequisicao(estadoAtual);
      if (!acesso || !estadoAtual) {
        return NextResponse.json(
          { error: "Usuário sem permissão para salvar dados." },
          { status: 403 }
        );
      }
      if (acesso.usuario.perfil !== "Administrador") {
        if (
          estadoExcedeLimite(
            Buffer.byteLength(corpoBruto, "utf8"),
            resolverLimiteEstado(process.env)
          )
        ) {
          return NextResponse.json(
            { error: "O estado enviado excede o tamanho permitido." },
            { status: 413 }
          );
        }
        const forma = validarFormaDoEstado(data);
        if (!forma.ok) {
          return NextResponse.json(
            { error: "Estado inválido.", detalhe: forma.motivo },
            { status: 400 }
          );
        }
        // Chaves de topo desconhecidas são descartadas; o restante é gravado.
        dadosParaGravar = forma.estado as unknown as AppDB;
      }
      if (acesso.usuario.perfil === "Administrador") {
        // Excluir usuário só vale para quem nunca entrou nem registrou nada (nunca Administrador nem o próprio).
        const remocao = validarRemocaoDeUsuarios(estadoAtual.usuarios || [], dadosParaGravar.usuarios || [], {
          solicitanteId: acesso.usuario.id,
          solicitanteEmail: acesso.usuario.email,
          registrosAuditoria: estadoAtual.registrosAuditoria || [],
        });
        if (!remocao.ok) {
          return NextResponse.json({ error: "Exclusão de usuário não permitida.", detalhe: remocao.motivo }, { status: 403 });
        }
      }
      dadosParaGravar = mesclarEstadoPorUsuario(
        estadoAtual,
        dadosParaGravar,
        acesso.usuario,
        acesso.authId
      );
      // Aprovação de POP: só vale se vier do responsável do estabelecimento; cada aprovação entra no histórico.
      const aprovacoes = validarAprovacoesDePop(estadoAtual.empresas || {}, dadosParaGravar.empresas || {}, acesso.usuario, new Date().toISOString());
      dadosParaGravar = {
        ...dadosParaGravar,
        empresas: aprovacoes.empresas,
        registrosAuditoria: [
          ...(dadosParaGravar.registrosAuditoria || []),
          ...aprovacoes.registros.map((registro) => ({ ...registro, id: crypto.randomUUID() })),
        ],
      };
    }

    // Relatórios emitidos só mudam pela rota de emissão: o estado enviado pelo navegador nunca substitui esta lista.
    const emitidosNoServidor = (atualAntesDaGravacao.data as AppDB | null)?.relatoriosEmitidos;
    if (emitidosNoServidor) {
      // E as fotos citadas num relatório emitido não somem, nem por quem grava o estado inteiro.
      const evidenciasAtuais = (atualAntesDaGravacao.data as AppDB).evidencias || [];
      dadosParaGravar = {
        ...dadosParaGravar,
        relatoriosEmitidos: emitidosNoServidor,
        evidencias: preservarEvidenciasEmRelatorio(evidenciasAtuais, dadosParaGravar.evidencias || [], emitidosNoServidor),
      };
    }
    else if (dadosParaGravar.relatoriosEmitidos) {
      const { relatoriosEmitidos: _descartado, ...resto } = dadosParaGravar;
      dadosParaGravar = resto as AppDB;
    }

    const payload = JSON.stringify(dadosParaGravar);

    // Sem versão esperada, só é permitido criar uma base que ainda não existe.
    if (!expectedUpdatedAt) {
      const inserted = await sql`
        INSERT INTO mbp_cloud_state (workspace_id, data, updated_at)
        VALUES (${WORKSPACE_ID}, ${payload}::jsonb, date_trunc('milliseconds', clock_timestamp()))
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
          updated_at = date_trunc('milliseconds', clock_timestamp())
      WHERE workspace_id = ${WORKSPACE_ID}
        -- O timestamp chega ao navegador via JSON com precisão de milissegundos.
        -- PostgreSQL/Neon pode armazenar microssegundos; comparar o valor bruto
        -- fazia uma versão válida parecer conflito e impedia PUTs subsequentes.
        AND date_trunc('milliseconds', updated_at) = ${expectedUpdatedAt}::timestamptz
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
