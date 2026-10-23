// Navegador de verdade (Chrome ou Edge, sem janela) comandado pelo protocolo DevTools: serve para gerar o PDF do app e conferir a impressão.
// Sem dependências novas: usa o WebSocket e o fetch que já vêm no Node.
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const CAMINHOS = [
  process.env.NAVEGADOR_PDF || "",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
];

export function acharNavegador() {
  return CAMINHOS.find((caminho) => caminho && existsSync(caminho)) || null;
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function abrirNavegador({ porta = 9333 } = {}) {
  const executavel = acharNavegador();
  if (!executavel) throw new Error("Nenhum Chrome ou Edge encontrado (defina NAVEGADOR_PDF).");
  const perfil = mkdtempSync(path.join(tmpdir(), "pc-navegador-"));
  const processo = spawn(executavel, ["--headless=new", `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`, "--no-first-run", "--no-default-browser-check", "--disable-gpu", "--hide-scrollbars", "--window-size=1366,900", "about:blank"], { stdio: "ignore" });
  let alvo = null;
  for (let i = 0; i < 60 && !alvo; i++) {
    try {
      const lista = await (await fetch(`http://127.0.0.1:${porta}/json`)).json();
      alvo = lista.find((item) => item.type === "page");
    } catch {
      /* ainda subindo */
    }
    if (!alvo) await esperar(250);
  }
  if (!alvo) {
    processo.kill();
    throw new Error("O navegador não abriu a porta de comando.");
  }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error("Falha ao conectar no navegador."));
  });
  let seq = 0;
  const pendentes = new Map();
  ws.onmessage = (evento) => {
    const msg = JSON.parse(evento.data);
    if (msg.id && pendentes.has(msg.id)) {
      const { resolve, reject } = pendentes.get(msg.id);
      pendentes.delete(msg.id);
      if (msg.error) reject(new Error(`${msg.error.message}`));
      else resolve(msg.result);
    }
  };
  const enviar = (metodo, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pendentes.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method: metodo, params }));
    });
  await enviar("Page.enable");
  await enviar("Runtime.enable");

  const avaliar = async (expressao) => {
    const r = await enviar("Runtime.evaluate", { expression: expressao, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const esperarCondicao = async (expressao, { tempo = 20000, intervalo = 200, descricao = expressao } = {}) => {
    const limite = Date.now() + tempo;
    while (Date.now() < limite) {
      if (await avaliar(`Boolean(${expressao})`)) return true;
      await esperar(intervalo);
    }
    throw new Error(`Tempo esgotado esperando: ${descricao}`);
  };
  return {
    enviar,
    avaliar,
    esperarCondicao,
    esperar,
    async ir(url) {
      await enviar("Page.navigate", { url });
      await esperar(600);
      await esperarCondicao("document.readyState === 'complete'", { descricao: "página carregada" });
    },
    async imagem() {
      const r = await enviar("Page.captureScreenshot", { format: "png" });
      return Buffer.from(r.data, "base64");
    },
    /** PDF como o navegador faz ao imprimir (mídia print, tamanho e margens da folha de estilos do app). */
    async pdf() {
      const r = await enviar("Page.printToPDF", { preferCSSPageSize: true, printBackground: true, transferMode: "ReturnAsBase64" });
      return Buffer.from(r.data, "base64");
    },
    async fechar() {
      try {
        ws.close();
      } catch {
        /* já fechado */
      }
      processo.kill();
      await esperar(300);
      try {
        rmSync(perfil, { recursive: true, force: true });
      } catch {
        /* o Windows pode segurar o perfil por um instante */
      }
    },
  };
}
