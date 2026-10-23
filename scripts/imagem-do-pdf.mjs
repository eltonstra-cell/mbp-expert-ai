// Imagem de uma página de um PDF, desenhada pelo leitor de PDF do próprio Chrome/Edge (sem ferramentas extras).
// Uso: node scripts/imagem-do-pdf.mjs arquivo.pdf pagina saida.png
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { abrirNavegador } from "./navegador-cdp.mjs";

const [arquivo, pagina = "1", saida = "pagina.png"] = process.argv.slice(2);
const n = await abrirNavegador({ porta: 9555 });
try {
  await n.enviar("Page.navigate", { url: `${pathToFileURL(path.resolve(arquivo)).href}#toolbar=0&navpanes=0&scrollbar=0&view=Fit&page=${pagina}` });
  await n.esperar(5000);
  writeFileSync(saida, await n.imagem());
} finally {
  await n.fechar();
}
