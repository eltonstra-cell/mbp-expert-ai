import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { obterAcessoServidor } from "@/lib/serverAccess";
import { podeVerTela, type TelaKey } from "@/lib/screenAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Guias em PDF servidos só a quem tem a tela liberada (o manual completo não é mais um arquivo público).
const GUIAS: Record<string, { arquivo: string; tela: TelaKey }> = {
  "guia-rapido": { arquivo: "guia-rapido-mbp-expert-ai.pdf", tela: "guiaRapido" },
  "manual-completo": { arquivo: "manual-completo-mbp-expert-ai.pdf", tela: "manualCompleto" },
};

export async function GET(_request: Request, contexto: { params: Promise<{ nome: string }> }) {
  const { nome } = await contexto.params;
  const guia = GUIAS[nome];
  if (!guia) return NextResponse.json({ error: "Guia não encontrado." }, { status: 404 });

  const acesso = await obterAcessoServidor();
  if (acesso.aplicado && (!acesso.autorizado || !podeVerTela(acesso.usuario, guia.tela))) {
    return NextResponse.json({ error: "Você não tem acesso a este guia." }, { status: 403 });
  }

  try {
    const pasta = guia.tela === "manualCompleto" ? "conteudo-privado/guias" : "public/guias";
    const bytes = await readFile(path.join(process.cwd(), pasta, guia.arquivo));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `inline; filename="${guia.arquivo}"`,
        "cache-control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Arquivo indisponível." }, { status: 404 });
  }
}
