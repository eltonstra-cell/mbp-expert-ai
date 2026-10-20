import { MAX_EVIDENCE_BYTES, detectarTipoPorAssinatura, normalizarMime } from "./evidenceUpload.ts";

// Comprovante de terceiros: PDF ou foto (JPEG), até 8 MB, conferido pelos primeiros bytes. O envio exige internet.
export const MAX_COMPROVANTE_BYTES = MAX_EVIDENCE_BYTES;

const CAMINHO_DE_COMPROVANTE = /^comprovantes\/([A-Za-z0-9_-]+)\/[^\/\\]+$/;

export function empresaDoCaminhoDeComprovante(pathname: unknown): string | null {
  if (typeof pathname !== "string" || pathname.length > 512) return null;
  return CAMINHO_DE_COMPROVANTE.exec(pathname)?.[1] || null;
}

export type ValidacaoComprovante = { ok: true; contentType: string } | { ok: false; motivo: "VAZIO" | "GRANDE" | "ASSINATURA" | "MIME" };

export function validarArquivoComprovante(mimeDeclarado: unknown, inicio: Uint8Array, tamanho: number): ValidacaoComprovante {
  if (!tamanho) return { ok: false, motivo: "VAZIO" };
  if (tamanho > MAX_COMPROVANTE_BYTES) return { ok: false, motivo: "GRANDE" };
  const mime = normalizarMime(mimeDeclarado);
  const ehPdf = inicio.length >= 5 && String.fromCharCode(...inicio.slice(0, 5)) === "%PDF-";
  if (ehPdf) return !mime || mime === "application/pdf" ? { ok: true, contentType: "application/pdf" } : { ok: false, motivo: "MIME" };
  if (detectarTipoPorAssinatura(inicio) === "jpeg") return !mime || mime === "image/jpeg" ? { ok: true, contentType: "image/jpeg" } : { ok: false, motivo: "MIME" };
  return { ok: false, motivo: "ASSINATURA" };
}
