import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { obterAcessoServidor } from "@/lib/serverAccess";
import { autorizarGuia } from "@/lib/guias";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Os dois guias ficam fora de public: só esta rota os serve, e só a quem tem a tela liberada.
export async function GET(_request: Request, contexto: { params: Promise<{ nome: string }> }) {
  const { nome } = await contexto.params;
  const acesso = await obterAcessoServidor();
  const decisao = autorizarGuia(nome, !acesso.aplicado ? "nao-aplicado" : acesso.autorizado ? acesso.usuario : null);
  if (decisao.status === "nao-encontrado") return NextResponse.json({ error: "Guia não encontrado." }, { status: 404 });
  if (decisao.status === "negado") return NextResponse.json({ error: "Você não tem acesso a este guia." }, { status: 403 });

  try {
    const bytes = await readFile(path.join(process.cwd(), "conteudo-privado/guias", decisao.arquivo));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${decisao.nomeDeDownload}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }
}
