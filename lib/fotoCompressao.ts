// Compressão de foto antes do envio: lado maior até 1600 px e JPEG com qualidade 0,8.
// A decodificação e a codificação entram por parâmetro para a regra ser testável fora do navegador.

export const LADO_MAXIMO_FOTO = 1600;
export const QUALIDADE_JPEG_FOTO = 0.8;

export type DependenciasDeFoto = {
  /** Lê as dimensões reais da foto. */
  decodificar: (arquivo: Blob) => Promise<{ largura: number; altura: number }>;
  /** Desenha a foto no tamanho pedido e devolve um JPEG. */
  codificar: (arquivo: Blob, largura: number, altura: number, qualidade: number) => Promise<Blob>;
};

export type ResultadoDaFoto = {
  arquivo: Blob;
  comprimida: boolean;
  /** Por que o original foi mantido, quando foi. */
  motivo?: "falhou" | "nao-diminuiu";
  largura?: number;
  altura?: number;
};

/** Reduz só se passar do limite; nunca amplia e mantém a proporção. */
export function dimensoesDaFoto(largura: number, altura: number, maximo = LADO_MAXIMO_FOTO) {
  if (!(largura > 0) || !(altura > 0)) return null;
  if (largura <= maximo && altura <= maximo) return { largura: Math.round(largura), altura: Math.round(altura), reduziu: false };
  const escala = Math.min(maximo / largura, maximo / altura);
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
    reduziu: true,
  };
}

function ehJpeg(arquivo: Blob & { name?: string }) {
  if (arquivo.type) return arquivo.type.toLowerCase() === "image/jpeg";
  return /\.jpe?g$/i.test(arquivo.name || "");
}

/**
 * Comprime a foto. Se qualquer passo falhar, devolve o original (o envio segue).
 * Se o JPEG recomprimido não ficar menor que o original JPEG, mantém o original.
 */
export async function comprimirFoto(arquivo: Blob, deps: DependenciasDeFoto): Promise<ResultadoDaFoto> {
  try {
    const lido = await deps.decodificar(arquivo);
    const alvo = dimensoesDaFoto(lido.largura, lido.altura);
    if (!alvo) throw new Error("dimensões inválidas");
    const comprimido = await deps.codificar(arquivo, alvo.largura, alvo.altura, QUALIDADE_JPEG_FOTO);
    if (!comprimido || comprimido.size === 0) throw new Error("conversão vazia");
    if (ehJpeg(arquivo) && !alvo.reduziu && comprimido.size >= arquivo.size) {
      return { arquivo, comprimida: false, motivo: "nao-diminuiu" };
    }
    return { arquivo: comprimido, comprimida: true, largura: alvo.largura, altura: alvo.altura };
  } catch {
    return { arquivo, comprimida: false, motivo: "falhou" };
  }
}

function carregarImagem(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("O navegador não conseguiu abrir a foto."));
    el.src = url;
  });
}

/** Implementação do navegador (canvas). Só roda no cliente. */
export const dependenciasDoNavegador: DependenciasDeFoto = {
  async decodificar(arquivo) {
    const url = URL.createObjectURL(arquivo);
    try {
      const img = await carregarImagem(url);
      return { largura: img.naturalWidth || img.width, altura: img.naturalHeight || img.height };
    } finally {
      URL.revokeObjectURL(url);
    }
  },
  async codificar(arquivo, largura, altura, qualidade) {
    // Object URL é mais confiável no Safari/iPhone com fotos recém-capturadas.
    const url = URL.createObjectURL(arquivo);
    try {
      const img = await carregarImagem(url);
      const canvas = document.createElement("canvas");
      canvas.width = largura;
      canvas.height = altura;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("canvas indisponível");
      ctx.drawImage(img, 0, 0, largura, altura);
      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob vazio"))), "image/jpeg", qualidade);
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  },
};

export type PreparoDaFoto =
  | { ok: true; arquivo: Blob; nome: string; comprimida: boolean }
  | { ok: false; motivo: string };

function ehHeic(arquivo: Blob & { name?: string }) {
  return /image\/hei[cf]/i.test(arquivo.type) || /\.hei[cf]$/i.test(arquivo.name || "");
}

/** Troca a extensão por .jpg (a foto convertida sai sempre em JPEG). */
export function nomeComoJpeg(nome?: string) {
  const base = (nome || "").trim().replace(/\.[A-Za-z0-9]+$/, "");
  return `${base || "foto"}.jpg`;
}

/**
 * Prepara a foto para o envio: comprime ou converte para JPEG (PNG, WebP e, quando o navegador abre, HEIC).
 * JPEG que não pôde ser recomprimido segue como está. Se não for JPEG e a conversão falhar,
 * devolve o motivo em texto claro para o app mostrar; nunca falha em silêncio.
 */
export async function prepararFotoParaEnvio(arquivo: Blob & { name?: string }, deps: DependenciasDeFoto): Promise<PreparoDaFoto> {
  const r = await comprimirFoto(arquivo, deps);
  if (r.comprimida) {
    return { ok: true, arquivo: r.arquivo, nome: nomeComoJpeg(arquivo.name), comprimida: true };
  }
  if (ehJpeg(arquivo)) {
    return { ok: true, arquivo, nome: arquivo.name || "foto.jpg", comprimida: false };
  }
  if (ehHeic(arquivo)) {
    return {
      ok: false,
      motivo: "Este navegador não consegue abrir fotos no formato HEIC/HEIF. Tire a foto de novo pela câmera do app ou converta para JPEG e envie outra vez.",
    };
  }
  if (arquivo.type.startsWith("image/") || /\.(png|webp|gif|bmp)$/i.test(arquivo.name || "")) {
    return { ok: false, motivo: "Não foi possível converter a imagem para JPEG. Tente outra foto ou salve a imagem como JPEG." };
  }
  return { ok: false, motivo: "O arquivo escolhido não é uma foto. Escolha uma imagem JPEG, PNG ou WebP." };
}
