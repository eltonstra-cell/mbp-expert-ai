// Logotipo da empresa na capa do POP: reduzido no navegador (até 600 px de largura, alvo de 200 KB), sem enviar nada a servidor.
import { LOGOTIPO_ALVO_BYTES, LOGOTIPO_MAX_LARGURA } from "./capaPop.ts";

export const TIPOS_DE_LOGOTIPO = ["image/png", "image/jpeg"] as const;
export const LIMITE_DO_ARQUIVO_ORIGINAL = 8 * 1024 * 1024;

export const MENSAGEM_TIPO_DE_LOGOTIPO = "Envie o logotipo em PNG ou JPG.";
export const MENSAGEM_ARQUIVO_GRANDE = "O arquivo é muito grande (máximo de 8 MB). Reduza a imagem e envie de novo.";
export const MENSAGEM_LOGOTIPO_ILEGIVEL = "Não foi possível ler essa imagem. Tente outro arquivo PNG ou JPG.";
export const MENSAGEM_LOGOTIPO_PESADO = "Mesmo reduzido, o logotipo passou de 200 KB. Use uma imagem mais simples.";

export function tipoDeLogotipoAceito(mime: string | undefined | null): boolean {
  return (TIPOS_DE_LOGOTIPO as readonly string[]).includes((mime || "").toLowerCase());
}

/** Tamanho final: no máximo 600 px de largura, mantendo a proporção; imagem menor não é ampliada. */
export function dimensoesDoLogotipo(largura: number, altura: number, maxLargura = LOGOTIPO_MAX_LARGURA): { largura: number; altura: number } {
  if (!(largura > 0) || !(altura > 0)) return { largura: 0, altura: 0 };
  if (largura <= maxLargura) return { largura: Math.round(largura), altura: Math.round(altura) };
  const razao = maxLargura / largura;
  return { largura: maxLargura, altura: Math.max(1, Math.round(altura * razao)) };
}

/** Bytes do arquivo que o data URL representa (base64 sem o cabeçalho). */
export function bytesDoDataUrl(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const preenchimento = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - preenchimento;
}

export type ResultadoDoLogotipo = { ok: true; dataUrl: string; bytes: number; largura: number; altura: number } | { ok: false; erro: string };

function carregarImagem(arquivo: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo);
    const imagem = new Image();
    imagem.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagem);
    };
    imagem.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagem"));
    };
    imagem.src = url;
  });
}

function temTransparencia(contexto: CanvasRenderingContext2D, largura: number, altura: number): boolean {
  const { data } = contexto.getImageData(0, 0, largura, altura);
  for (let i = 3; i < data.length; i += 4) if (data[i] < 250) return true;
  return false;
}

/**
 * Lê o arquivo, reduz para até 600 px de largura e tenta ficar em até 200 KB. Mantém a transparência (PNG) quando há;
 * sem transparência vira JPEG com qualidade decrescente. Nada sai do aparelho.
 */
export async function prepararLogotipo(arquivo: File): Promise<ResultadoDoLogotipo> {
  if (!tipoDeLogotipoAceito(arquivo.type)) return { ok: false, erro: MENSAGEM_TIPO_DE_LOGOTIPO };
  if (arquivo.size > LIMITE_DO_ARQUIVO_ORIGINAL) return { ok: false, erro: MENSAGEM_ARQUIVO_GRANDE };
  let imagem: HTMLImageElement;
  try {
    imagem = await carregarImagem(arquivo);
  } catch {
    return { ok: false, erro: MENSAGEM_LOGOTIPO_ILEGIVEL };
  }
  let { largura, altura } = dimensoesDoLogotipo(imagem.naturalWidth, imagem.naturalHeight);
  if (!largura || !altura) return { ok: false, erro: MENSAGEM_LOGOTIPO_ILEGIVEL };
  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const tela = document.createElement("canvas");
    tela.width = largura;
    tela.height = altura;
    const contexto = tela.getContext("2d");
    if (!contexto) return { ok: false, erro: MENSAGEM_LOGOTIPO_ILEGIVEL };
    contexto.drawImage(imagem, 0, 0, largura, altura);
    const transparente = arquivo.type === "image/png" && temTransparencia(contexto, largura, altura);
    if (transparente) {
      const png = tela.toDataURL("image/png");
      if (bytesDoDataUrl(png) <= LOGOTIPO_ALVO_BYTES) return { ok: true, dataUrl: png, bytes: bytesDoDataUrl(png), largura, altura };
    } else {
      // Fundo branco sob a imagem e JPEG com qualidade decrescente.
      const comFundo = document.createElement("canvas");
      comFundo.width = largura;
      comFundo.height = altura;
      const c2 = comFundo.getContext("2d");
      if (!c2) return { ok: false, erro: MENSAGEM_LOGOTIPO_ILEGIVEL };
      c2.fillStyle = "#fff";
      c2.fillRect(0, 0, largura, altura);
      c2.drawImage(imagem, 0, 0, largura, altura);
      for (const qualidade of [0.9, 0.8, 0.7, 0.6, 0.5]) {
        const jpeg = comFundo.toDataURL("image/jpeg", qualidade);
        if (bytesDoDataUrl(jpeg) <= LOGOTIPO_ALVO_BYTES) return { ok: true, dataUrl: jpeg, bytes: bytesDoDataUrl(jpeg), largura, altura };
      }
    }
    // Ainda pesado: reduz mais 20% e tenta de novo.
    largura = Math.max(40, Math.round(largura * 0.8));
    altura = Math.max(20, Math.round(altura * 0.8));
  }
  return { ok: false, erro: MENSAGEM_LOGOTIPO_PESADO };
}
