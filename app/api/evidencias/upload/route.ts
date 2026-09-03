import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  autorizaAcaoServidor,
  obterAcessoServidor,
} from "@/lib/serverAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    const visitaId = String(form.get("visitaId") || "sem-visita");
    const evidenciaId = String(
      form.get("evidenciaId") || crypto.randomUUID()
    );

    const acesso = await obterAcessoServidor();
    const visita = acesso.autorizado && acesso.data
      ? acesso.data.visitas.find((item) => item.id === visitaId)
      : undefined;
    if (
      acesso.aplicado &&
      (!visita ||
        !autorizaAcaoServidor(acesso, "evidencias.adicionar", visita.empresaId))
    ) {
      return NextResponse.json(
        { error: "Seu perfil não permite adicionar evidências nesta visita." },
        { status: 403 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Arquivo não recebido." },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Arquivo excede o limite de 8 MB." },
        { status: 413 }
      );
    }

    const nome =
      (file.name || "arquivo")
        .normalize("NFKD")
        .replace(/[^\w.-]+/g, "-")
        .replace(/-+/g, "-") || "arquivo";

    const pathname = `evidencias/${visitaId}/${evidenciaId}-${nome}`;

    const blob = await put(pathname, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: file.type || "application/octet-stream",
    });

    return NextResponse.json({
      pathname: blob.pathname,
      url: blob.url,
      contentType: blob.contentType,
    });
  } catch (error) {
    console.error("Falha no upload Blob:", error);
    return NextResponse.json(
      { error: "Não foi possível salvar a evidência no armazenamento." },
      { status: 500 }
    );
  }
}
