const CACHE_NAME = "mbp-app-shell-v8";
const APP_SHELL = "/";
const STATIC_ASSETS = ["/kitchen-line.svg", "/images/cozinha-inspecao.webp", "/manifest.webmanifest"];

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
  self.skipWaiting();
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
