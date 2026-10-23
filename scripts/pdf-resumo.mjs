// Resumo de um PDF (páginas, tamanho do texto, imagens e início do texto de cada página). Uso: node scripts/pdf-resumo.mjs arquivo.pdf
import { readFileSync } from "node:fs";
import { paginasDoPdf } from "./pdf-texto.mjs";

for (const arquivo of process.argv.slice(2)) {
  const paginas = paginasDoPdf(readFileSync(arquivo));
  console.log(`${arquivo}: ${paginas.length} páginas`);
  paginas.forEach((p, i) => console.log(`  pág ${i + 1}: ${p.texto.length} caracteres, ${p.imagens} imagem(ns) | ${p.texto.replace(/\s+/g, " ").slice(0, 110)}`));
}
