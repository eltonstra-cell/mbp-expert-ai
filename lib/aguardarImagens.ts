// Antes de imprimir: espera as imagens da capa (ícone, logotipo) e as fontes carregarem e decodificarem, senão o PDF sai com o lugar vazio.

const ESPERA_MAXIMA_MS = 5000;

function depoisDoDesenho(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
}

async function decodificar(imagem: HTMLImageElement): Promise<void> {
  try {
    if (!imagem.complete) {
      await new Promise<void>((resolve) => {
        imagem.addEventListener("load", () => resolve(), { once: true });
        imagem.addEventListener("error", () => resolve(), { once: true });
      });
    }
    await imagem.decode();
  } catch {
    // Imagem quebrada: segue; o PDF sai sem ela, como a tela.
  }
}

/** Carrega uma imagem que só aparece por CSS (máscara do ícone de traço) para ela já estar no cache na hora de imprimir. */
function precarregar(url: string): Promise<void> {
  const imagem = new Image();
  imagem.src = url;
  return decodificar(imagem);
}

/** Espera o React desenhar o que vai no papel e todas as imagens dele ficarem prontas (no máximo 5 s). */
export async function aguardarImagensParaImprimir(raiz: ParentNode, urlsExtras: string[] = []): Promise<void> {
  const pronto = (async () => {
    await depoisDoDesenho();
    const imagens = Array.from(raiz.querySelectorAll<HTMLImageElement>("img"));
    await Promise.all([...imagens.map(decodificar), ...urlsExtras.map(precarregar), document.fonts?.ready ?? Promise.resolve()]);
    await depoisDoDesenho();
  })();
  await Promise.race([pronto, new Promise<void>((resolve) => window.setTimeout(resolve, ESPERA_MAXIMA_MS))]);
}
