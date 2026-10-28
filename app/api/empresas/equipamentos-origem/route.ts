import { NextResponse, type NextRequest } from "next/server";
import { neon } from "@neondatabase/serverless";
import { resolveNeonDatabaseUrl } from "@/lib/neonConnection";
import { obterAcessoServidor } from "@/lib/serverAccess";
import { corpoExcedeLimite } from "@/lib/requestLimits";
import { MENSAGEM_DA_RECUSA, destinoEditavel, equipamentosDaOrigem, origemElegivel, origensElegiveis } from "@/lib/copiaEquipamentos";
import type { AppDB, UsuarioSistema } from "@/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKSPACE_ID = process.env.MBP_WORKSPACE_ID || "principal";
const TAMANHO_MAXIMO_DO_ID = 200;
const TAMANHO_MAXIMO_DO_CORPO = 1024;
const SEM_CACHE = { "Cache-Control": "no-store" };
// Destino ou origem inexistente, ou sem permissão/acesso: a MESMA resposta (mesmo texto, mesmo status), para a rota não confirmar que uma empresa existe.
const MENSAGEM_UNICA = "Esta empresa não está disponível para cópia.";

const json = (corpo: unknown, status = 200) => NextResponse.json(corpo, { status, headers: SEM_CACHE });

// "Copiar de outra empresa" (Equipamentos). A sessão decide TUDO aqui, no servidor:
// - GET ?destino=ID: devolve só id e nome das empresas que podem ser origem para este destino;
// - POST { destino, origem }: devolve setor, nome e quantidade dos equipamentos da origem, e nada além disso.
// Exige editar a empresa de destino, acesso à origem, origem diferente do destino, as duas no mesmo estado (workspace) e Ambientes e
// Equipamentos da origem revisados e em dia. A regra mora em lib/copiaEquipamentos.ts (testada). Quem grava a cópia é o fluxo normal de salvar.

type Carregado = { erro: NextResponse } | { data: AppDB; usuario: UsuarioSistema | null };

async function carregar(): Promise<Carregado> {
  const acesso = await obterAcessoServidor();
  if (acesso.aplicado) {
    if (!acesso.autorizado) return { erro: json({ error: "Usuário sem acesso liberado ao sistema." }, 403) };
    return { data: acesso.data, usuario: acesso.usuario };
  }
  const url = resolveNeonDatabaseUrl(process.env);
  if (!url) return { erro: json({ error: "Conexão do Neon não configurada." }, 503) };
  const linhas = await neon(url)`SELECT data FROM mbp_cloud_state WHERE workspace_id = ${WORKSPACE_ID} LIMIT 1`;
  const data = (linhas[0]?.data || null) as AppDB | null;
  if (!data) return { erro: json({ error: "Dados não encontrados." }, 404) };
  return { data, usuario: null };
}

const idValido = (valor: unknown): valor is string => typeof valor === "string" && valor.length > 0 && valor.length <= TAMANHO_MAXIMO_DO_ID;

function recusa(motivo: keyof typeof MENSAGEM_DA_RECUSA) {
  // Quem pode (destino editável, origem existente e acessível) é decidido ANTES de qualquer outra coisa e responde sempre igual.
  if (motivo === "destino-inexistente" || motivo === "sem-permissao-no-destino" || motivo === "origem-inexistente" || motivo === "sem-acesso-a-origem") return json({ error: MENSAGEM_UNICA }, 403);
  return json({ error: MENSAGEM_DA_RECUSA[motivo] }, motivo === "mesma-empresa" ? 400 : 403);
}

export async function GET(request: NextRequest) {
  try {
    const destino = request.nextUrl.searchParams.get("destino");
    if (!idValido(destino)) return json({ error: "Informe a empresa de destino." }, 400);
    const carregado = await carregar();
    if ("erro" in carregado) return carregado.erro;
    const empresas = carregado.data.empresas || {};
    // Sem editar o destino, nem a lista de nomes sai.
    const destinoPermitido = destinoEditavel(carregado.usuario, empresas, destino);
    if (!destinoPermitido.ok) return recusa(destinoPermitido.motivo);
    return json({ origens: origensElegiveis(carregado.usuario, empresas, destino) });
  } catch (erro) {
    console.error("GET /api/empresas/equipamentos-origem", erro instanceof Error ? erro.name : "erro");
    return json({ error: "Não foi possível listar as empresas." }, 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return json({ error: "Envie o corpo como application/json." }, 415);
    if (corpoExcedeLimite(request.headers.get("content-length"), TAMANHO_MAXIMO_DO_CORPO)) return json({ error: "Corpo da requisição grande demais." }, 413);
    let corpo: { destino?: unknown; origem?: unknown };
    try {
      const texto = await request.text();
      if (texto.length > TAMANHO_MAXIMO_DO_CORPO) return json({ error: "Corpo da requisição grande demais." }, 413);
      corpo = JSON.parse(texto);
    } catch {
      return json({ error: "Corpo da requisição inválido." }, 400);
    }
    if (!idValido(corpo?.destino) || !idValido(corpo?.origem)) return json({ error: "Informe a origem e o destino." }, 400);
    const carregado = await carregar();
    if ("erro" in carregado) return carregado.erro;
    const empresas = carregado.data.empresas || {};
    const verificacao = origemElegivel(carregado.usuario, empresas, corpo.destino, corpo.origem);
    if (!verificacao.ok) return recusa(verificacao.motivo);
    return json({ equipamentos: equipamentosDaOrigem(empresas[corpo.origem]) });
  } catch (erro) {
    console.error("POST /api/empresas/equipamentos-origem", erro instanceof Error ? erro.name : "erro");
    return json({ error: "Não foi possível ler os equipamentos da origem." }, 500);
  }
}
