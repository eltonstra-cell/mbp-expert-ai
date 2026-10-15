export const MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
export const MAX_VISITA_ID_LENGTH = 64;

const VISITA_ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function sanitizarVisitaId(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const id = valor.trim();
  if (!id || id.length > MAX_VISITA_ID_LENGTH) return null;
  return VISITA_ID_PATTERN.test(id) ? id : null;
}

// Tipo detectado pelos primeiros bytes -> MIMEs declarados aceitos para ele.
// A interface envia fotos sempre como JPEG (canvas) e áudios gravados ou
// escolhidos pelo usuário (mp4/m4a, mp3, webm, ogg, wav, aac).
const MIMES_POR_TIPO = {
  jpeg: ["image/jpeg"],
  mp4: ["audio/mp4", "audio/m4a", "audio/x-m4a", "audio/aac", "video/mp4"],
  mp3: ["audio/mpeg", "audio/mp3", "audio/mpga"],
  aac: ["audio/aac", "audio/aacp"],
  webm: ["audio/webm"],
  ogg: ["audio/ogg"],
  wav: ["audio/wav", "audio/x-wav", "audio/wave"],
} as const;

export type TipoDetectado = keyof typeof MIMES_POR_TIPO;

function ascii(bytes: Uint8Array, inicio: number, texto: string): boolean {
  if (bytes.length < inicio + texto.length) return false;
  for (let i = 0; i < texto.length; i += 1) {
    if (bytes[inicio + i] !== texto.charCodeAt(i)) return false;
  }
  return true;
}

export function detectarTipoPorAssinatura(bytes: Uint8Array): TipoDetectado | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "jpeg";
  }
  if (ascii(bytes, 4, "ftyp")) return "mp4";
  if (ascii(bytes, 0, "OggS")) return "ogg";
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WAVE")) return "wav";
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3
  ) {
    return "webm";
  }
  if (ascii(bytes, 0, "ID3")) return "mp3";
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    if ((bytes[1] & 0xf6) === 0xf0) return "aac";
    if ((bytes[1] & 0x06) !== 0) return "mp3";
  }
  return null;
}

export function normalizarMime(valor: unknown): string {
  return typeof valor === "string"
    ? valor.toLowerCase().split(";")[0].trim()
    : "";
}

export type ValidacaoArquivo =
  | { ok: true; contentType: string }
  | { ok: false; motivo: "VAZIO" | "GRANDE" | "ASSINATURA" | "MIME" };

// Confere tamanho, assinatura dos primeiros bytes e MIME declarado. MIME vazio
// é aceito (alguns aparelhos não informam) e substituído pelo tipo detectado.
export function validarArquivoEvidencia(
  mimeDeclarado: unknown,
  inicio: Uint8Array,
  tamanho: number
): ValidacaoArquivo {
  if (!tamanho) return { ok: false, motivo: "VAZIO" };
  if (tamanho > MAX_EVIDENCE_BYTES) return { ok: false, motivo: "GRANDE" };

  const detectado = detectarTipoPorAssinatura(inicio);
  if (!detectado) return { ok: false, motivo: "ASSINATURA" };

  const aceitos: readonly string[] = MIMES_POR_TIPO[detectado];
  const mime = normalizarMime(mimeDeclarado);
  if (!mime) return { ok: true, contentType: aceitos[0] };
  if (!aceitos.includes(mime)) return { ok: false, motivo: "MIME" };
  return { ok: true, contentType: mime };
}
