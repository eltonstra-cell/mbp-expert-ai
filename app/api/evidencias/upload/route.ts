import { head, put } from "@vercel/blob";
import { NextResponse } from "next/server";
import {
  autorizaAcaoServidor,
  obterAcessoServidor,
} from "@/lib/serverAccess";
import {
  MAX_EVIDENCE_BYTES,
  sanitizarVisitaId,
  validarArquivoEvidencia,
} from "@/lib/evidenceUpload";
import { corpoExcedeLimite } from "@/lib/requestLimits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MENSAGENS_ARQUIVO = {
  VAZIO: "Arquivo vazio.",
  GRANDE: "Arquivo excede o limite de 8 MB.",
  ASSINATURA: "Tipo de arquivo não permitido. Envie uma foto JPEG ou um áudio.",
  MIME: "O tipo informado não corresponde ao conteúdo do arquivo.",
} as const;

export async function POST(request: Request) {
  try {
    // Margem de 1 MB para os demais campos do formulário.
    if (corpoExcedeLimite(request.headers.get("content-length"), MAX_EVIDENCE_BYTES + 1024 * 1024)) {
      return NextResponse.json(
        { error: "Arquivo excede o limite de 8 MB." },
        { status: 413 }
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    const visitaId = sanitizarVisitaId(form.get("visitaId") || "sem-visita");
    const evidenciaId = sanitizarVisitaId(
      form.get("evidenciaId") || crypto.randomUUID()
    );

    if (!visitaId || !evidenciaId) {
      return NextResponse.json(
        { error: "Identificação da visita ou da evidência inválida." },
        { status: 400 }
      );
    }

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

    const inicio = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    const validacao = validarArquivoEvidencia(file.type, inicio, file.size);
    if (!validacao.ok) {
      return NextResponse.json(
        { error: MENSAGENS_ARQUIVO[validacao.motivo] },
        { status: validacao.motivo === "GRANDE" ? 413 : 415 }
      );
    }

    const nome =
      (file.name || "arquivo")
        .normalize("NFKD")
        .replace(/[^\w.-]+/g, "-")
        .replace(/-+/g, "-") || "arquivo";

    const pathname = `evidencias/${visitaId}/${evidenciaId}-${nome}`;

    // Com chave de envio (fila offline) o caminho é fixo: repetir o envio devolve o arquivo que já existe, sem duplicar.
    const comChave = form.get("chaveEnvio") === evidenciaId;
    if (comChave) {
      const existente = await head(pathname).catch(() => null);
      if (existente) {
        return NextResponse.json({ pathname: existente.pathname, url: existente.url, contentType: existente.contentType, repetido: true });
      }
    }

    let blob;
    try {
      blob = await put(pathname, file, {
        access: "private",
        addRandomSuffix: !comChave,
        contentType: validacao.contentType,
      });
    } catch (erroDoPut) {
      // Duas tentativas ao mesmo tempo: a segunda encontra o arquivo da primeira.
      const existente = comChave ? await head(pathname).catch(() => null) : null;
      if (!existente) throw erroDoPut;
      return NextResponse.json({ pathname: existente.pathname, url: existente.url, contentType: existente.contentType, repetido: true });
    }

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
