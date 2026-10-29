import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { NextResponse } from "next/server";
import { resolveNeonDatabaseUrl } from "@/lib/neonConnection";
import { novaCiencia } from "@/lib/cienciaPop";
import { MAX_TENTATIVAS_DE_PIN, estadoAposTentativa, gerarSal, hashDoPin, pinBloqueado, pinConfere, pinValido } from "@/lib/pinCiencia";
import { podeAcessarEmpresa } from "@/lib/permissions";
import { podeGerenciarPessoas } from "@/lib/registrosEmpresa";
import { obterAcessoServidor } from "@/lib/serverAccess";
import type { AppDB } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKSPACE_ID = process.env.MBP_WORKSPACE_ID || "principal";

// Ciência do POP por PIN (ver lib/pinCiencia.ts: finalidade, base legal e o que NÃO é exigência da norma).
// O PIN fica numa tabela só do servidor (nunca no JSON do estado, que vai ao navegador), só como hash scrypt + sal, com limite de tentativas.
// A tabela é criada por CREATE TABLE IF NOT EXISTS na primeira vez que esta rota é usada, como a `mbp_cloud_state` (o projeto não tem migrations).
async function garantirTabela(sql: NeonQueryFunction<false, false>) {
  await sql`
    CREATE TABLE IF NOT EXISTS mbp_pop_pin (
      workspace_id text NOT NULL,
      colaborador_id text NOT NULL,
      empresa_id text NOT NULL,
      sal text NOT NULL,
      hash text NOT NULL,
      tentativas integer NOT NULL DEFAULT 0,
      bloqueado_ate timestamptz,
      atualizado_em timestamptz NOT NULL DEFAULT now(),
      PRIMARY KEY (workspace_id, colaborador_id)
    )
  `;
}

const texto = (valor: unknown) => (typeof valor === "string" ? valor.trim().slice(0, 120) : "");

// Quem já tem PIN (só os ids, nunca hash nem sal): a tela escolhe entre "Definir PIN" e "Confirmar".
export async function GET(request: Request) {
  try {
    const url = resolveNeonDatabaseUrl(process.env);
    if (!url) return NextResponse.json({ error: "Conexão do Neon não configurada." }, { status: 503 });
    const empresaId = texto(new URL(request.url).searchParams.get("empresaId"));
    const acesso = await obterAcessoServidor();
    if (acesso.aplicado && (!acesso.autorizado || !podeGerenciarPessoas(acesso.usuario) || !podeAcessarEmpresa(acesso.usuario, empresaId))) {
      return NextResponse.json({ error: "Seu perfil não permite ver a ciência desta empresa." }, { status: 403 });
    }
    const sql = neon(url);
    await garantirTabela(sql);
    const linhas = await sql`SELECT colaborador_id FROM mbp_pop_pin WHERE workspace_id = ${WORKSPACE_ID} AND empresa_id = ${empresaId}`;
    return NextResponse.json({ comPin: linhas.map((linha) => String(linha.colaborador_id)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GET /api/pops/ciencia", error instanceof Error ? error.name : "erro");
    return NextResponse.json({ error: "Não foi possível consultar a ciência agora." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const url = resolveNeonDatabaseUrl(process.env);
    if (!url) return NextResponse.json({ error: "Conexão do Neon não configurada." }, { status: 503 });
    const corpo = await request.json().catch(() => null);
    const acao = texto(corpo?.acao);
    const empresaId = texto(corpo?.empresaId);
    const colaboradorId = texto(corpo?.colaboradorId);
    const popId = texto(corpo?.popId);
    const pin = corpo?.pin;
    if (!["definir-pin", "redefinir-pin", "confirmar"].includes(acao) || !empresaId || !colaboradorId) {
      return NextResponse.json({ error: "Pedido incompleto." }, { status: 400 });
    }
    const acesso = await obterAcessoServidor();
    if (acesso.aplicado && (!acesso.autorizado || !podeGerenciarPessoas(acesso.usuario) || !podeAcessarEmpresa(acesso.usuario, empresaId))) {
      return NextResponse.json({ error: "Seu perfil não permite colher ciência nesta empresa." }, { status: 403 });
    }
    const sql = neon(url);
    await garantirTabela(sql);

    // A pessoa precisa existir e estar ativa nesta empresa (lido do estado gravado, nunca do que o navegador diz).
    const estado = await sql`SELECT data, updated_at FROM mbp_cloud_state WHERE workspace_id = ${WORKSPACE_ID} LIMIT 1`;
    if (!estado.length) return NextResponse.json({ error: "Estado ausente." }, { status: 409 });
    const dados = estado[0].data as AppDB;
    if (!(dados.colaboradores || []).some((item) => item.id === colaboradorId && item.empresaId === empresaId && item.ativo)) {
      return NextResponse.json({ error: "Pessoa não encontrada na equipe desta empresa." }, { status: 404 });
    }

    if (acao === "redefinir-pin") {
      await sql`DELETE FROM mbp_pop_pin WHERE workspace_id = ${WORKSPACE_ID} AND colaborador_id = ${colaboradorId}`;
      return NextResponse.json({ ok: true });
    }

    if (!pinValido(pin)) return NextResponse.json({ error: "O PIN tem de 4 a 6 números." }, { status: 400 });

    if (acao === "definir-pin") {
      const sal = gerarSal();
      const inseridas = await sql`
        INSERT INTO mbp_pop_pin (workspace_id, colaborador_id, empresa_id, sal, hash)
        VALUES (${WORKSPACE_ID}, ${colaboradorId}, ${empresaId}, ${sal}, ${hashDoPin(pin, sal)})
        ON CONFLICT (workspace_id, colaborador_id) DO NOTHING
        RETURNING colaborador_id`;
      if (!inseridas.length) return NextResponse.json({ error: "Esta pessoa já tem PIN. Peça para redefinir." }, { status: 409 });
      return NextResponse.json({ ok: true });
    }

    // confirmar
    const guardado = await sql`SELECT sal, hash, tentativas, bloqueado_ate FROM mbp_pop_pin WHERE workspace_id = ${WORKSPACE_ID} AND colaborador_id = ${colaboradorId} LIMIT 1`;
    if (!guardado.length) return NextResponse.json({ error: "Esta pessoa ainda não definiu o PIN." }, { status: 409 });
    const agora = new Date();
    const estadoDoPin = { tentativas: Number(guardado[0].tentativas) || 0, bloqueadoAte: guardado[0].bloqueado_ate ? new Date(guardado[0].bloqueado_ate).toISOString() : null };
    if (pinBloqueado(estadoDoPin, agora)) return NextResponse.json({ error: "PIN bloqueado por tentativas erradas. Tente mais tarde." }, { status: 429 });
    const acertou = pinConfere(pin, String(guardado[0].sal), String(guardado[0].hash));
    const proximo = estadoAposTentativa(estadoDoPin, acertou, agora);
    await sql`UPDATE mbp_pop_pin SET tentativas = ${proximo.tentativas}, bloqueado_ate = ${proximo.bloqueadoAte}, atualizado_em = now() WHERE workspace_id = ${WORKSPACE_ID} AND colaborador_id = ${colaboradorId}`;
    if (!acertou) {
      const restam = Math.max(0, MAX_TENTATIVAS_DE_PIN - proximo.tentativas);
      return NextResponse.json({ error: proximo.bloqueadoAte ? "PIN bloqueado por tentativas erradas. Tente mais tarde." : `PIN incorreto. Restam ${restam} tentativas.` }, { status: proximo.bloqueadoAte ? 429 : 401 });
    }

    // Grava a ciência no estado com a versão esperada (duas gravações ao mesmo tempo não se perdem; tenta de novo se o estado mudou).
    for (let tentativa = 0; tentativa < 4; tentativa += 1) {
      const atual = await sql`SELECT data, updated_at FROM mbp_cloud_state WHERE workspace_id = ${WORKSPACE_ID} LIMIT 1`;
      const dadosAtuais = atual[0].data as AppDB;
      const resultado = novaCiencia(dadosAtuais, { empresaId, popId, colaboradorId }, agora, crypto.randomUUID());
      if (!resultado.ok) return NextResponse.json({ error: resultado.erro }, { status: resultado.status });
      const versao = new Date(atual[0].updated_at).toISOString();
      const lista = [...(dadosAtuais.leiturasPop || []), resultado.leitura];
      const gravadas = await sql`
        UPDATE mbp_cloud_state
        SET data = jsonb_set(data, '{leiturasPop}', ${JSON.stringify(lista)}::jsonb, true),
            updated_at = date_trunc('milliseconds', clock_timestamp())
        WHERE workspace_id = ${WORKSPACE_ID}
          AND date_trunc('milliseconds', updated_at) = ${versao}::timestamptz
        RETURNING updated_at`;
      if (gravadas.length) return NextResponse.json({ ok: true, leitura: resultado.leitura });
    }
    return NextResponse.json({ error: "O estado mudou ao mesmo tempo. Tente de novo." }, { status: 409 });
  } catch (error) {
    console.error("POST /api/pops/ciencia", error instanceof Error ? error.name : "erro");
    return NextResponse.json({ error: "Não foi possível registrar a ciência agora." }, { status: 500 });
  }
}
