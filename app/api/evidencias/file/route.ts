import { get } from "@vercel/blob";
import { type NextRequest, NextResponse } from "next/server";
import {
  autorizaAcaoServidor,
  obterAcessoServidor,
} from "@/lib/serverAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("pathname");

  if (!pathname || !pathname.startsWith("evidencias/")) {
    return NextResponse.json(
      { error: "Arquivo inválido." },
      { status: 400 }
    );
  }

  try {
    const acesso = await obterAcessoServidor();
    const evidencia = acesso.autorizado && acesso.data
      ? acesso.data.evidencias.find((item) => item.blobPathname === pathname)
      : undefined;
    // O arquivo pode terminar de subir alguns instantes antes de a evidência
    // aparecer no estado sincronizado. Nesse intervalo, valida o acesso pela
    // visita presente no próprio caminho privado do arquivo.
    const visitaId = pathname.split("/")[1] || "";
    const visita = acesso.autorizado && acesso.data
      ? acesso.data.visitas.find((item) => item.id === visitaId)
      : undefined;
    const empresaId = evidencia?.empresaId || visita?.empresaId;
    if (
      acesso.aplicado &&
      (!empresaId ||
        !autorizaAcaoServidor(acesso, "empresas.ver", empresaId))
    ) {
      return NextResponse.json(
        { error: "Você não possui acesso a esta evidência." },
        { status: 403 }
      );
    }

    const result = await get(pathname, {
      access: "private",
      ifNoneMatch:
        request.headers.get("if-none-match") ?? undefined,
    });

    if (!result) {
      return new NextResponse("Arquivo não encontrado.", { status: 404 });
    }

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    if (result.statusCode !== 200 || !result.stream) {
      return new NextResponse("Arquivo não encontrado.", { status: 404 });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type":
          result.blob.contentType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch (error) {
    console.error("Falha ao ler Blob:", error);
    return new NextResponse("Falha ao abrir o arquivo.", {
      status: 500,
    });
  }
}
