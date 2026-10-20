import { del, get } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import { empresaDoCaminhoDeComprovante } from "@/lib/comprovanteUpload";
import { podeAcessarEmpresa } from "@/lib/permissions";
import { podeGerenciarComprovantes, podeVerComprovantes } from "@/lib/registrosEmpresa";
import { obterAcessoServidor } from "@/lib/serverAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Abrir comprovante: Administrador, RT, Gestor, Gerente e Fiscal da empresa. O Executor de campo nunca.
export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("pathname");
  const empresaId = empresaDoCaminhoDeComprovante(pathname);
  if (!pathname || !empresaId) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  try {
    const acesso = await obterAcessoServidor();
    if (acesso.aplicado && (!acesso.autorizado || !podeVerComprovantes(acesso.usuario) || !podeAcessarEmpresa(acesso.usuario, empresaId))) {
      return NextResponse.json({ error: "Você não possui acesso a este comprovante." }, { status: 403 });
    }
    const result = await get(pathname, { access: "private", ifNoneMatch: request.headers.get("if-none-match") ?? undefined });
    if (!result) return new NextResponse("Arquivo não encontrado.", { status: 404 });
    if (result.statusCode === 304) {
      return new NextResponse(null, { status: 304, headers: { ETag: result.blob.etag, "Cache-Control": "private, no-cache" } });
    }
    if (result.statusCode !== 200 || !result.stream) return new NextResponse("Arquivo não encontrado.", { status: 404 });
    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("Falha ao ler comprovante:", error instanceof Error ? error.name : "erro");
    return new NextResponse("Falha ao abrir o arquivo.", { status: 500 });
  }
}

// Apaga o arquivo de UM comprovante (caminho exato), quando ele é removido.
export async function DELETE(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("pathname");
  const empresaId = empresaDoCaminhoDeComprovante(pathname);
  if (!pathname || !empresaId) return NextResponse.json({ error: "Arquivo inválido." }, { status: 400 });
  const acesso = await obterAcessoServidor();
  if (acesso.aplicado && (!acesso.autorizado || !podeGerenciarComprovantes(acesso.usuario) || !podeAcessarEmpresa(acesso.usuario, empresaId))) {
    return NextResponse.json({ error: "Seu perfil não permite remover comprovantes." }, { status: 403 });
  }
  try {
    await del(pathname);
    return NextResponse.json({ apagado: true });
  } catch {
    return NextResponse.json({ apagado: false }, { status: 502 });
  }
}
