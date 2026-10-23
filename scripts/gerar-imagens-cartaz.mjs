// Prepara as 14 ilustrações do cartaz "Como lavar as mãos": confere a pasta de origem, recorta a 09 (margens brancas),
// quadra todas com fundo branco PURO (pixels quase brancos, com o menor canal >= 238, viram 255: sem quadrados acinzentados atrás do desenho),
// reduz a 420 px de lado e grava em public/cartaz-lavagem/ (JPEG de alta qualidade: PDF leve) e, em public/cartaz-lavagem/transparente/, uma versão PNG com o
// fundo branco transparente (usada no estilo Pastel colorido: o desenho se funde ao cartão colorido sem mix-blend-mode, que faria o Chrome transformar a página do PDF em imagem).
// Uso: node scripts/gerar-imagens-cartaz.mjs [pasta-de-origem]   (padrão: ilustracoes-lavagem/ na raiz; depois pode apagar a pasta)
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origem = path.resolve(process.argv[2] || path.join(raiz, "ilustracoes-lavagem"));
const destino = path.join(raiz, "public", "cartaz-lavagem");
const LADO = 420;
export const LIMIAR_DO_BRANCO = 238;
const sharp = createRequire(import.meta.url)(path.join(raiz, "node_modules", "sharp"));

const esperados = Array.from({ length: 14 }, (_, i) => `${String(i + 1).padStart(2, "0")}.png`);
const encontrados = existsSync(origem) ? readdirSync(origem) : null;
if (!encontrados) {
  console.error(`Pasta de ilustrações não encontrada: ${origem}. Coloque 01.png a 14.png nela e rode de novo.`);
  process.exit(1);
}
const faltam = esperados.filter((nome) => !encontrados.includes(nome));
if (faltam.length > 0) {
  console.error(`Ilustrações incompletas em ${origem}: faltam ${faltam.join(", ")} (são necessárias 14, de 01.png a 14.png).`);
  process.exit(1);
}
const destinoTransparente = path.join(destino, "transparente");
mkdirSync(destinoTransparente, { recursive: true });
const PISO_DA_TRANSPARENCIA = 200;

/** Caixa do desenho: pixels mais escuros que o limiar (o fundo branco e as molduras claras ficam de fora), com 2% de folga. */
async function caixaDoDesenho(arquivo, limiar = 200) {
  const { data, info } = await sharp(arquivo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 3;
      if (Math.min(data[i], data[i + 1], data[i + 2]) < limiar) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  const folga = Math.round(Math.max(x1 - x0, y1 - y0) * 0.02);
  const esq = Math.max(0, x0 - folga);
  const topo = Math.max(0, y0 - folga);
  return { left: esq, top: topo, width: Math.min(info.width, x1 + folga + 1) - esq, height: Math.min(info.height, y1 + folga + 1) - topo };
}

for (const nome of esperados) {
  const arquivo = path.join(origem, nome);
  let imagem = sharp(arquivo).flatten({ background: "#ffffff" });
  if (nome === "09.png") {
    const caixa = await caixaDoDesenho(arquivo);
    imagem = imagem.extract(caixa);
    console.log(`09.png: recortada para ${caixa.width}x${caixa.height} (origem ${caixa.left},${caixa.top})`);
  }
  const saida = path.join(destino, nome.replace(".png", ".jpg"));
  const { data, info } = await imagem.resize(LADO, LADO, { fit: "contain", background: "#ffffff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 3) {
    if (Math.min(data[i], data[i + 1], data[i + 2]) >= LIMIAR_DO_BRANCO) data[i] = data[i + 1] = data[i + 2] = 255;
  }
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
    .jpeg({ quality: 92, chromaSubsampling: "4:4:4", mozjpeg: true })
    .toFile(saida);
  // Branco vira transparente; entre o piso e o branco puro a transparência é gradual e a cor é recuperada (sem halo branco nas bordas).
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, j = 0; i < data.length; i += 3, j += 4) {
    const menor = Math.min(data[i], data[i + 1], data[i + 2]);
    const alfa = menor >= 255 ? 0 : menor <= PISO_DA_TRANSPARENCIA ? 1 : (255 - menor) / (255 - PISO_DA_TRANSPARENCIA);
    for (let c = 0; c < 3; c++) rgba[j + c] = alfa === 0 ? 255 : Math.max(0, Math.min(255, Math.round((data[i + c] - 255 * (1 - alfa)) / alfa)));
    rgba[j + 3] = Math.round(alfa * 255);
  }
  await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png({ palette: true, quality: 90, colours: 160, compressionLevel: 9, effort: 10 })
    .toFile(path.join(destinoTransparente, nome.replace(".png", "") + ".png"));
}
console.log(`14 imagens de ${LADO} px gravadas em ${destino}`);
