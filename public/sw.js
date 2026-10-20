const CACHE_NAME = "mbp-app-shell-v24";
const APP_SHELL = "/";
const STATIC_ASSETS = ["/kitchen-line.svg", "/images/cozinha-inspecao.webp", "/images/mapa-inspecao.webp", "/manifest.webmanifest"];

function podeGuardar(url) {
  return url.origin === self.location.origin &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/auth/");
}

async function guardarResposta(cache, request, response) {
  if (response && response.ok) await cache.put(request, response.clone());
  return response;
}

async function guardarEstrutura() {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(APP_SHELL, { credentials: "include", cache: "no-store" });
  if (!response.ok) return;
  const html = await response.clone().text();
  await cache.put(APP_SHELL, response);
  await Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)));
  const recursos = new Set();
  for (const match of html.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
    const url = new URL(match[1], self.location.origin);
    if (podeGuardar(url)) recursos.add(url.href);
  }
  await Promise.allSettled([...recursos].map(async (url) => {
    const recurso = await fetch(url, { credentials: "include" });
    if (recurso.ok) await cache.put(url, recurso);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(guardarEstrutura().catch(() => undefined));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((nomes) =>
      Promise.all(nomes.filter((nome) => nome !== CACHE_NAME).map((nome) => caches.delete(nome)))
    ),
  ]));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }
  if (event.data?.type === "CACHE_APP_SHELL") {
    event.waitUntil(guardarEstrutura().catch(() => undefined));
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!podeGuardar(url)) return;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(async (response) => {
          const cache = await caches.open(CACHE_NAME);
          await guardarResposta(cache, APP_SHELL, response);
          return response;
        })
        .catch(async () => (await caches.match(request)) || (await caches.match(APP_SHELL)))
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(caches.match(request).then(async (armazenado) => {
      if (armazenado) return armazenado;
      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      return guardarResposta(cache, request, response);
    }));
  }
});

// ===== Fila de envio de evidências (Background Sync) =====
// Onde o navegador oferece Background Sync (Chrome/Android), o evento "sync" acorda o app para enviar o que ficou na fila.
// Com o app aberto, quem envia é a própria tela. Sem o app aberto, o envio abaixo só vale para o MESMO usuário que gravou o item
// (conferido na sessão atual) e o servidor reconfere a permissão. No Safari/iPhone não há Background Sync: o envio acontece com o app aberto.
const BANCO_DA_FILA = "mbp-fila-evidencias";
const LOJA_DA_FILA = "itens";

function abrirBancoDaFila() {
  return new Promise((resolve, reject) => {
    const pedido = indexedDB.open(BANCO_DA_FILA, 1);
    pedido.onupgradeneeded = () => {
      if (!pedido.result.objectStoreNames.contains(LOJA_DA_FILA)) pedido.result.createObjectStore(LOJA_DA_FILA, { keyPath: "id" });
    };
    pedido.onsuccess = () => resolve(pedido.result);
    pedido.onerror = () => reject(pedido.error);
  });
}

function pedidoNaLoja(banco, modo, operacao) {
  return new Promise((resolve, reject) => {
    const tx = banco.transaction(LOJA_DA_FILA, modo);
    const pedido = operacao(tx.objectStore(LOJA_DA_FILA));
    tx.oncomplete = () => resolve(pedido.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function enviarFilaSemTela() {
  const banco = await abrirBancoDaFila();
  try {
    const itens = (await pedidoNaLoja(banco, "readonly", (loja) => loja.getAll())).filter((item) => item.estado === "aguardando" && item.arquivo);
    if (!itens.length) return;
    const resposta = await fetch("/api/access/session", { credentials: "include", cache: "no-store" });
    const sessao = resposta.ok ? await resposta.json().catch(() => null) : null;
    const usuario = sessao && sessao.authenticated && sessao.user && typeof sessao.user.email === "string" ? sessao.user.email.trim().toLowerCase() : "";
    if (!usuario) return;
    for (const item of itens) {
      if (item.usuarioId !== usuario) continue;
      const form = new FormData();
      form.append("file", item.arquivo, item.nomeArquivo);
      form.append("visitaId", item.visitaId);
      form.append("evidenciaId", item.id);
      form.append("chaveEnvio", item.id);
      const envio = await fetch("/api/evidencias/upload", { method: "POST", body: form, credentials: "include" });
      const tipo = envio.headers.get("content-type") || "";
      if (!envio.ok || !tipo.includes("application/json")) {
        if (envio.status === 401 || envio.status >= 500) throw new Error("tentar-depois");
        continue;
      }
      const corpo = await envio.json().catch(() => null);
      if (!corpo || typeof corpo.pathname !== "string") continue;
      // O arquivo sai do aparelho; a tela atualiza a evidência quando o app abrir.
      const concluido = Object.assign({}, item, { estado: "enviado", progresso: 100, arquivo: undefined, resultado: { pathname: corpo.pathname, url: String(corpo.url || "") }, enviadoEm: new Date().toISOString() });
      delete concluido.arquivo;
      await pedidoNaLoja(banco, "readwrite", (loja) => loja.put(concluido));
    }
  } finally {
    banco.close();
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag !== "mbp-fila-evidencias") return;
  event.waitUntil((async () => {
    const janelas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    if (janelas.length) {
      janelas.forEach((janela) => janela.postMessage({ type: "FILA_EVIDENCIAS" }));
      return;
    }
    await enviarFilaSemTela();
  })());
});
