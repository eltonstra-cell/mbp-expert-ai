import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { MAX_COMPROVANTE_BYTES, validarArquivoComprovante } from "@/lib/comprovanteUpload";
import { sanitizarVisitaId } from "@/lib/evidenceUpload";
import { podeAcessarEmpresa } from "@/lib/permissions";
import { podeGerenciarComprovantes } from "@/lib/registrosEmpresa";
import { corpoExcedeLimite } from "@/lib/requestLimits";
import { obterAcessoServidor } from "@/lib/serverAccess";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MENSAGENS = {
  VAZIO: "Arquivo vazio.",
  GRANDE: "Arquivo excede o limite de 8 MB.",
  ASSINATURA: "Tipo de arquivo não permitido. Envie um PDF ou uma foto JPEG.",
  MIME: "O tipo informado não corresponde ao conteúdo do arquivo.",
} as const;

// Comprovante de terceiros: só Administrador, RT, Gestor e Gerente da empresa; exige internet (não entra na fila offline).
export async function POST(request: Request) {
  try {
    if (corpoExcedeLimite(request.headers.get("content-length"), MAX_COMPROVANTE_BYTES + 1024 * 1024)) {
      return NextResponse.json({ error: "Arquivo excede o limite de 8 MB." }, { status: 413 });
    }
    const form = await request.formData();
    const file = form.get("file");
    const empresaId = sanitizarVisitaId(form.get("empresaId"));
    const comprovanteId = sanitizarVisitaId(form.get("comprovanteId") || crypto.randomUUID());
    if (!empresaId || !comprovanteId) {
      return NextResponse.json({ error: "Identificação da empresa ou do comprovante inválida." }, { status: 400 });
    }

    const acesso = await obterAcessoServidor();
    if (acesso.aplicado && (!acesso.autorizado || !podeGerenciarComprovantes(acesso.usuario) || !podeAcessarEmpresa(acesso.usuario, empresaId))) {
      return NextResponse.json({ error: "Seu perfil não permite anexar comprovantes nesta empresa." }, { status: 403 });
    }
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo não recebido." }, { status: 400 });

    const inicio = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const validacao = validarArquivoComprovante(file.type, inicio, file.size);
    if (!validacao.ok) {
      return NextResponse.json({ error: MENSAGENS[validacao.motivo] }, { status: validacao.motivo === "GRANDE" ? 413 : 415 });
    }

    const nome = (file.name || "arquivo").normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/-+/g, "-") || "arquivo";
    const blob = await put(`comprovantes/${empresaId}/${comprovanteId}-${nome}`, file, {
      access: "private",
      addRandomSuffix: true,
      contentType: validacao.contentType,
    });
    return NextResponse.json({ pathname: blob.pathname, url: blob.url, contentType: blob.contentType });
  } catch (error) {
    console.error("Falha no upload de comprovante:", error instanceof Error ? error.name : "erro");
    return NextResponse.json({ error: "Não foi possível salvar o comprovante no armazenamento." }, { status: 500 });
  }
}
