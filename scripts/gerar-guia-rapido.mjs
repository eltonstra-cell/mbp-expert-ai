// Gera conteudo-privado/guias/guia-rapido-ponto-certo.pdf a partir de conteudo-privado/guias/fonte/guia-rapido.html.
// Usa o Chrome instalado (sem janela). Uso: node scripts/gerar-guia-rapido.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const origem = path.join(raiz, "conteudo-privado/guias/fonte/guia-rapido.html");
const destino = path.join(raiz, "conteudo-privado/guias/guia-rapido-ponto-certo.pdf");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORTA = 9411;

const perfil = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-guia-"));
const chrome = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${PORTA}`, `--user-data-dir=${perfil}`, "--no-first-run", "about:blank"], { stdio: "ignore" });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
try {
  let alvo;
  for (let i = 0; i < 60 && !alvo; i += 1) {
    try { alvo = (await (await fetch(`http://127.0.0.1:${PORTA}/json/list`)).json()).find((x) => x.type === "page"); } catch { /* ainda abrindo */ }
    if (!alvo) await esperar(500);
  }
  if (!alvo) throw new Error("Chrome não abriu");
  ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let seq = 0;
  const pend = new Map();
  ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const enviar = (metodo, params = {}) => new Promise((resolve, reject) => { const id = ++seq; pend.set(id, (m) => (m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result))); ws.send(JSON.stringify({ id, method: metodo, params })); });
  await enviar("Page.enable");
  await enviar("Page.navigate", { url: pathToFileURL(origem).href });
  await esperar(1500);
  await enviar("Runtime.evaluate", { expression: "document.fonts.ready.then(() => true)", awaitPromise: true });
  await esperar(500);
  const { data } = await enviar("Page.printToPDF", { printBackground: true, preferCSSPageSize: true, displayHeaderFooter: false });
  fs.writeFileSync(destino, Buffer.from(data, "base64"));
  console.log("PDF gerado:", path.relative(raiz, destino), fs.statSync(destino).size, "bytes");
} finally {
  ws?.close();
  chrome.kill();
  await esperar(500);
  try { fs.rmSync(perfil, { recursive: true, force: true }); } catch { /* sem problema */ }
}
